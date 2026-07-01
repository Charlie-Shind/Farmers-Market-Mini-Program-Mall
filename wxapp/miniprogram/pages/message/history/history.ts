import { iconPaths } from '../../../config/icons';
import {
  fetchMessageList,
  type AppMessageListItem,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../../utils/auth-route';

type NoticeCard = {
  receiptId: number;
  title: string;
  summary: string;
  showSummary: boolean;
  content: string;
  showContent: boolean;
  imageUrl: string;
  showImage: boolean;
  timeText: string;
  timestamp: number;
  isRead: boolean;
  publisherAvatar: string;
  showPublisherAvatar: boolean;
  fallbackIconName: string;
};

function decodeParam(value?: string): string {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch { return value; }
}

function getTimestamp(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatCenterTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (isToday) return `${hours}:${minutes}`;
  if (isYesterday) return `昨天 ${hours}:${minutes}`;
  return `${month}-${day} ${hours}:${minutes}`;
}

function readContentJson(item: any): any | null {
  const json = item?.contentJson;
  if (!json) return null;
  if (typeof json === 'string') {
    try { return JSON.parse(json); } catch { return null; }
  }
  return json;
}

function readImageUrl(item: any): string {
  const contentJson = readContentJson(item);
  const blocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const imageBlock = blocks.find((block: any) => block?.type === 'image' && (block?.url || block?.value));
  return (
    item?.coverImageUrl ||
    item?.imageUrl ||
    item?.image ||
    item?.picUrl ||
    contentJson?.imageUrl ||
    contentJson?.image ||
    imageBlock?.url ||
    imageBlock?.value ||
    ''
  ).toString().trim();
}

function readSummary(item: any): string {
  const contentJson = readContentJson(item);
  const blocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const textBlock = blocks.find((block: any) => block?.type === 'text' && (block?.value || block?.text || block?.content));
  const text =
    item?.summary ||
    contentJson?.summary ||
    textBlock?.value ||
    textBlock?.text ||
    textBlock?.content ||
    item?.content ||
    item?.contentText ||
    item?.title ||
    '';
  return String(text || '').trim();
}

function readContent(item: any): string {
  const contentJson = readContentJson(item);
  const blocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const textBlock = blocks.find((block: any) => block?.type === 'text' && (block?.value || block?.text || block?.content));
  return String(
    item?.content ||
    item?.contentText ||
    contentJson?.content ||
    textBlock?.value ||
    textBlock?.text ||
    textBlock?.content ||
    ''
  ).trim();
}

function readPublisherAvatar(item: any): string {
  return String(
    item?.senderAvatar ||
    item?.coverImageUrl ||
    item?.imageUrl ||
    ''
  ).trim();
}

function readPublishAt(item: any): string {
  return String(item?.publishAt || item?.createdAt || item?.updatedAt || '');
}

function mapNotice(item: AppMessageListItem): NoticeCard {
  const anyItem = item as any;
  const imageUrl = readImageUrl(anyItem);
  const summary = readSummary(anyItem);
  const content = readContent(anyItem);
  const publishAt = readPublishAt(anyItem);
  const publisherAvatar = readPublisherAvatar(anyItem);
  const title = String(anyItem.title || '').trim() || summary;

  return {
    receiptId: Number(anyItem.receiptId || anyItem.id || 0),
    title,
    summary,
    showSummary: Boolean(summary) && summary !== title,
    content,
    showContent: Boolean(content) && content !== summary,
    imageUrl,
    showImage: Boolean(imageUrl),
    timeText: formatCenterTime(publishAt),
    timestamp: getTimestamp(publishAt),
    isRead: !!anyItem.isRead,
    publisherAvatar,
    showPublisherAvatar: Boolean(publisherAvatar),
    fallbackIconName: 'bell',
  };
}

Component({
  data: {
    pageStyle: '',
    icons: iconPaths,
    type: '',
    typeLabel: '公告',
    publisherName: '湾源农仓公告',
    footerName: '湾源农仓',
    footerType: '小程序',
    loading: false,
    loadingMore: false,
    messages: [] as NoticeCard[],
    emptyText: '暂无公告',
    page: 1,
    pageSize: 20,
    total: 0,
    noMore: false,
  },
  lifetimes: {
    attached() {
      this.setData({ pageStyle: buildPageTopStyle(0) });
    },
  },
  methods: {
    onLoad(this: any, options: { type?: string; typeLabel?: string }) {
      const type = decodeParam(options?.type);
      const typeLabel = decodeParam(options?.typeLabel);

      if (!ensureCustomerAccess(
        `/pages/message/history/history?type=${encodeURIComponent(type)}&typeLabel=${encodeURIComponent(typeLabel)}`,
      )) {
        return;
      }

      this.setData({
        type,
        typeLabel: typeLabel || '公告',
        page: 1,
        noMore: false,
        messages: [],
      });
      void this.loadMessages(true);
    },
    async loadMessages(this: any, reset = true) {
      if (this.data.loading || this.data.loadingMore) {
        return;
      }

      const page = reset ? 1 : this.data.page;
      this.setData({ [reset ? 'loading' : 'loadingMore']: true } as any);

      try {
        const response = await fetchMessageList({
          page,
          pageSize: this.data.pageSize,
          type: this.data.type,
        });

        const messages = (response.items ?? [])
          .map(mapNotice)
          .filter((item) => item.receiptId)
          .sort((a, b) => b.timestamp - a.timestamp);

        const mergedMessages = reset
          ? messages
          : [...this.data.messages, ...messages].sort((a, b) => b.timestamp - a.timestamp);

        this.setData({
          messages: mergedMessages,
          total: response.total ?? mergedMessages.length,
          page: page + 1,
          noMore:
            mergedMessages.length >= (response.total ?? mergedMessages.length) ||
            messages.length < this.data.pageSize,
          loading: false,
          loadingMore: false,
        });
      } catch {
        this.setData({
          messages: [],
          noMore: true,
          loading: false,
          loadingMore: false,
        });
      }
    },
    loadMore(this: any) {
      if (this.data.noMore || this.data.loading || this.data.loadingMore) {
        return;
      }
      void this.loadMessages(false);
    },
    openMessage(e: WechatMiniprogram.BaseEvent) {
      const { receiptId } = (e.currentTarget.dataset as { receiptId?: number }) || {};
      if (!receiptId) return;
      wx.navigateTo({
        url: '/pages/message/view/view?receiptId=' + receiptId,
      });
    },
    previewImage(e: WechatMiniprogram.BaseEvent) {
      const { url } = (e.currentTarget.dataset as { url?: string }) || {};
      if (!url) return;
      wx.previewImage({ urls: [url], current: url });
    },
    goBack() {
      navigateBackOrHome();
    },
    handleAvatarError(this: any, e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number | string }) || {};
      const cardIndex = Number(index);
      if (Number.isNaN(cardIndex)) return;
      this.setData({
        [`messages[${cardIndex}].publisherAvatar`]: '',
        [`messages[${cardIndex}].showPublisherAvatar`]: false,
      });
    },
    handleImageError(this: any, e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number | string }) || {};
      const cardIndex = Number(index);
      if (Number.isNaN(cardIndex)) return;
      this.setData({
        [`messages[${cardIndex}].imageUrl`]: '',
        [`messages[${cardIndex}].showImage`]: false,
      });
    },
  },
});
