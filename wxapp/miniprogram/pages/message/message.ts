import { iconPaths } from '../../config/icons';
import {
  fetchMessageList,
  markAllMessagesRead,
  type AppMessageListItem,
} from '../../services/app';
import { buildPageTopStyle } from '../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../utils/auth-route';

type MessageRow = {
  receiptId: number;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  imageUrl: string;
  showImage: boolean;
  timeText: string;
  timestamp: number;
  isRead: boolean;
  avatarSrc: string;
  showAvatarImage: boolean;
  fallbackIconName: string;
};

type ConversationRow = {
  key: string;
  type: string;
  typeLabel: string;
  latestTitle: string;
  latestSummary: string;
  showSummary: boolean;
  latestTimeText: string;
  latestTimestamp: number;
  unreadCount: number;
  totalCount: number;
  avatarSrc: string;
  showAvatarImage: boolean;
  fallbackIconName: string;
};

function getTimestamp(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatRowTime(value?: string | null): string {
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
  return `${month}-${day}`;
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

function readPublishAt(item: any): string {
  return String(item?.publishAt || item?.createdAt || item?.updatedAt || '');
}

function mapMessage(item: AppMessageListItem): MessageRow {
  const anyItem = item as any;
  const type = String(anyItem.type || 'DEFAULT');
  const typeLabel = String(anyItem.typeLabel || anyItem.categoryName || '');
  const imageUrl = readImageUrl(anyItem);
  const summary = readSummary(anyItem);
  const publishAt = readPublishAt(anyItem);

  return {
    receiptId: Number(anyItem.receiptId || anyItem.id || 0),
    type,
    typeLabel,
    title: String(anyItem.title || '').trim(),
    summary,
    imageUrl,
    showImage: Boolean(imageUrl),
    timeText: formatRowTime(publishAt),
    timestamp: getTimestamp(publishAt),
    isRead: !!anyItem.isRead,
    avatarSrc: imageUrl,
    showAvatarImage: Boolean(imageUrl),
    fallbackIconName: 'bell',
  };
}

function buildConversations(messages: MessageRow[]): ConversationRow[] {
  const groupMap = new Map<string, ConversationRow>();
  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((message) => {
    const key = message.type || message.typeLabel || 'DEFAULT';
    const existing = groupMap.get(key);
    if (existing) {
      existing.unreadCount += message.isRead ? 0 : 1;
      existing.totalCount += 1;
      if (!existing.showAvatarImage && message.showImage) {
        existing.avatarSrc = message.avatarSrc;
        existing.showAvatarImage = true;
      }
      return;
    }
    groupMap.set(key, {
      key,
      type: message.type,
      typeLabel: message.typeLabel || message.type || '公告',
      latestTitle: message.title || message.summary || '',
      latestSummary: message.summary || message.title || '',
      showSummary: Boolean(message.summary) && message.summary !== message.title,
      latestTimeText: message.timeText,
      latestTimestamp: message.timestamp,
      unreadCount: message.isRead ? 0 : 1,
      totalCount: 1,
      avatarSrc: message.avatarSrc,
      showAvatarImage: message.showImage,
      fallbackIconName: 'bell',
    });
  });

  return Array.from(groupMap.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}

Component({
  data: {
    pageStyle: '',
    icons: iconPaths,
    loading: false,
    loadingMore: false,
    loadingAction: false,
    groups: [] as ConversationRow[],
    totalUnread: 0,
    footerName: '湾源农仓',
    footerType: '小程序',
    emptyText: '暂无公告',
    page: 1,
    pageSize: 80,
    total: 0,
    noMore: false,
  },
  lifetimes: {
    attached() {
      this.setData({ pageStyle: buildPageTopStyle(0) });
    },
  },
  pageLifetimes: {
    show() {
      void this.loadMessages(true);
    },
  },
  methods: {
    onLoad() {
      if (!ensureCustomerAccess('/pages/message/message')) {
        return;
      }
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
          type: '',
        });

        const messages = (response.items ?? [])
          .map(mapMessage)
          .filter((item) => item.receiptId);

        const mergedMessages = reset ? messages : [...this.data.messages, ...messages];
        const groups = buildConversations(mergedMessages);
        const computedUnread = mergedMessages.reduce((sum, item) => sum + (item.isRead ? 0 : 1), 0);

        this.setData({
          groups,
          totalUnread: response.unreadCount ?? computedUnread,
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
          groups: [],
          totalUnread: 0,
          noMore: true,
          loading: false,
          loadingMore: false,
        });
      }
    },
    async clearUnread(this: any) {
      if (this.data.loadingAction || this.data.totalUnread <= 0) {
        return;
      }
      this.setData({ loadingAction: true });
      try {
        await markAllMessagesRead();
        await this.loadMessages(true);
      } finally {
        this.setData({ loadingAction: false });
      }
    },
    loadMore(this: any) {
      if (this.data.noMore || this.data.loading || this.data.loadingMore) {
        return;
      }
      void this.loadMessages(false);
    },
    openConversation(e: WechatMiniprogram.BaseEvent) {
      const { type, typeLabel } = (e.currentTarget.dataset as { type?: string; typeLabel?: string }) || {};
      if (!type && !typeLabel) {
        return;
      }
      wx.navigateTo({
        url: `/pages/message/history/history?type=${encodeURIComponent(type || '')}&typeLabel=${encodeURIComponent(typeLabel || '')}`,
      });
    },
    goBack() {
      navigateBackOrHome();
    },
    handleAvatarError(this: any, e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: string }) || {};
      if (!key) return;
      const index = this.data.groups.findIndex((group: ConversationRow) => group.key === key);
      if (index < 0) return;
      this.setData({
        [`groups[${index}].avatarSrc`]: '',
        [`groups[${index}].showAvatarImage`]: false,
      });
    },
  },
});
