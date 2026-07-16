import { iconPaths } from '../../config/icons';
import {
  fetchMessageList,
  markAllMessagesRead,
  type AppMessageListItem,
} from '../../services/app';
import { buildPageTopStyle } from '../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../utils/auth-route';

type MessageTone = 'green' | 'orange' | 'gold';

type TypeMeta = {
  tone: MessageTone;
  icon: string;
  iconColor: string;
  label: string;
};

type MessageRow = {
  receiptId: number;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  showSummary: boolean;
  imageUrl: string;
  showImage: boolean;
  timeText: string;
  timestamp: number;
  isRead: boolean;
  avatarSrc: string;
  showAvatarImage: boolean;
  fallbackIconName: string;
  tone: MessageTone;
  iconColor: string;
  channelKey: string;
};

type ChannelRow = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  tone: MessageTone;
  unread: number;
};

const TYPE_META: Record<string, TypeMeta> = {
  NOTICE: { tone: 'green', icon: 'bell', iconColor: '#2c4a39', label: '公告' },
  SYSTEM: { tone: 'green', icon: 'shield', iconColor: '#3f6f44', label: '系统' },
  ACTIVITY: { tone: 'orange', icon: 'gift', iconColor: '#c65f2d', label: '活动' },
  ORDER: { tone: 'orange', icon: 'truck', iconColor: '#c65f2d', label: '订单' },
  DEFAULT: { tone: 'gold', icon: 'message', iconColor: '#8a6a3d', label: '消息' },
};

function resolveTypeMeta(type: string, typeLabel: string): TypeMeta {
  const key = String(type || '').toUpperCase();
  if (TYPE_META[key]) return TYPE_META[key];
  const label = typeLabel || '消息';
  if (/订单|物流|售后/.test(label)) return { ...TYPE_META.ORDER, label };
  if (/活动|营销|优惠/.test(label)) return { ...TYPE_META.ACTIVITY, label };
  if (/系统|安全/.test(label)) return { ...TYPE_META.SYSTEM, label };
  if (/公告|通知/.test(label)) return { ...TYPE_META.NOTICE, label };
  return { ...TYPE_META.DEFAULT, label };
}

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
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
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
  )
    .toString()
    .trim();
}

function readSummary(item: any): string {
  const contentJson = readContentJson(item);
  const blocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const textBlock = blocks.find(
    (block: any) => block?.type === 'text' && (block?.value || block?.text || block?.content),
  );
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
  const meta = resolveTypeMeta(type, typeLabel);
  const imageUrl = readImageUrl(anyItem);
  const summary = readSummary(anyItem);
  const publishAt = readPublishAt(anyItem);
  const title = String(anyItem.title || '').trim() || summary;
  const channelKey = type || typeLabel || 'DEFAULT';

  return {
    receiptId: Number(anyItem.receiptId || anyItem.id || 0),
    type,
    typeLabel: typeLabel || meta.label,
    title,
    summary,
    showSummary: Boolean(summary) && summary !== title,
    imageUrl,
    showImage: Boolean(imageUrl),
    timeText: formatRowTime(publishAt),
    timestamp: getTimestamp(publishAt),
    isRead: !!anyItem.isRead,
    avatarSrc: imageUrl,
    showAvatarImage: Boolean(imageUrl),
    fallbackIconName: meta.icon,
    tone: meta.tone,
    iconColor: meta.iconColor,
    channelKey,
  };
}

function buildChannels(messages: MessageRow[]): ChannelRow[] {
  const allUnread = messages.reduce((sum, m) => sum + (m.isRead ? 0 : 1), 0);
  const channels: ChannelRow[] = [
    {
      key: 'all',
      label: '全部',
      icon: 'message',
      iconColor: '#2c4a39',
      tone: 'green',
      unread: allUnread,
    },
  ];

  const seen = new Map<string, ChannelRow>();
  messages.forEach((message) => {
    const existing = seen.get(message.channelKey);
    if (existing) {
      existing.unread += message.isRead ? 0 : 1;
      return;
    }
    seen.set(message.channelKey, {
      key: message.channelKey,
      label: message.typeLabel,
      icon: message.fallbackIconName,
      iconColor: message.iconColor,
      tone: message.tone,
      unread: message.isRead ? 0 : 1,
    });
  });

  return channels.concat(Array.from(seen.values()));
}

function filterMessages(messages: MessageRow[], channel: string): MessageRow[] {
  if (!channel || channel === 'all') return messages;
  return messages.filter((m) => m.channelKey === channel);
}

Component({
  data: {
    pageStyle: '',
    icons: iconPaths,
    loading: false,
    loadingMore: false,
    loadingAction: false,
    messages: [] as MessageRow[],
    displayMessages: [] as MessageRow[],
    channels: [] as ChannelRow[],
    activeChannel: 'all',
    totalUnread: 0,
    footerName: '湾源农仓',
    emptyText: '暂无消息',
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
  pageLifetimes: {
    show() {
      void this.loadMessages(true);
    },
  },
  methods: {
    onLoad(this: any, options?: { type?: string }) {
      if (!ensureCustomerAccess('/pages/message/message')) {
        return;
      }
      const type = String(options?.type || '').trim();
      if (type) {
        this.setData({ activeChannel: type });
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
          .filter((item) => item.receiptId)
          .sort((a, b) => b.timestamp - a.timestamp);

        const mergedMessages = reset
          ? messages
          : [...this.data.messages, ...messages].sort((a, b) => b.timestamp - a.timestamp);

        const channels = buildChannels(mergedMessages);
        const activeChannel = this.data.activeChannel;
        const computedUnread = mergedMessages.reduce((sum, item) => sum + (item.isRead ? 0 : 1), 0);

        this.setData({
          messages: mergedMessages,
          channels,
          displayMessages: filterMessages(mergedMessages, activeChannel),
          totalUnread: response.unreadCount ?? computedUnread,
          total: response.total ?? mergedMessages.length,
          page: page + 1,
          noMore:
            messages.length === 0 ||
            messages.length < (Number((response as any).pageSize) || this.data.pageSize) ||
            (Number.isFinite(Number(response.total)) &&
              Number(response.total) >= 0 &&
              mergedMessages.length >= Number(response.total)),
          loading: false,
          loadingMore: false,
        });
      } catch {
        this.setData({
          messages: [],
          displayMessages: [],
          channels: buildChannels([]),
          totalUnread: 0,
          noMore: true,
          loading: false,
          loadingMore: false,
        });
      }
    },
    selectChannel(e: WechatMiniprogram.BaseEvent) {
      const key = String((e.currentTarget.dataset as { key?: string }).key || 'all');
      this.setData({
        activeChannel: key,
        displayMessages: filterMessages(this.data.messages, key),
      });
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
    openMessage(e: WechatMiniprogram.BaseEvent) {
      const { receiptId } = (e.currentTarget.dataset as { receiptId?: number | string }) || {};
      const id = Number(receiptId || 0);
      if (!id) return;
      wx.navigateTo({
        url: `/pages/message/view/view?receiptId=${id}`,
      });
    },
    goBack() {
      navigateBackOrHome();
    },
    handleAvatarError(this: any, e: WechatMiniprogram.BaseEvent) {
      const { receiptId } = (e.currentTarget.dataset as { receiptId?: number | string }) || {};
      const id = Number(receiptId || 0);
      if (!id) return;

      const patch = (list: MessageRow[], field: string) => {
        const index = list.findIndex((item) => item.receiptId === id);
        if (index < 0) return;
        this.setData({
          [`${field}[${index}].avatarSrc`]: '',
          [`${field}[${index}].showAvatarImage`]: false,
        });
      };

      patch(this.data.messages, 'messages');
      patch(this.data.displayMessages, 'displayMessages');
    },
  },
});
