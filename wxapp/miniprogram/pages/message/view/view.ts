import { iconPaths } from '../../../config/icons';
import {
  fetchMessageDetail,
  markMessageRead,
  type AppMessageContentBlock,
  type AppMessageDetail,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../../utils/auth-route';

type MessageTone = 'green' | 'orange' | 'gold';

type DetailBlock = AppMessageContentBlock & {
  type: string;
  value?: string;
  text?: string;
  content?: string;
  url?: string;
  alt?: string;
};

const TYPE_META: Record<string, { tone: MessageTone; icon: string; iconColor: string; label: string }> = {
  NOTICE: { tone: 'green', icon: 'bell', iconColor: '#2c4a39', label: '公告' },
  SYSTEM: { tone: 'green', icon: 'shield', iconColor: '#3f6f44', label: '系统' },
  ACTIVITY: { tone: 'orange', icon: 'gift', iconColor: '#c65f2d', label: '活动' },
  ORDER: { tone: 'orange', icon: 'truck', iconColor: '#c65f2d', label: '订单' },
  DEFAULT: { tone: 'gold', icon: 'message', iconColor: '#8a6a3d', label: '消息' },
};

function resolveTypeMeta(type: string, typeLabel: string) {
  const key = String(type || '').toUpperCase();
  if (TYPE_META[key]) return TYPE_META[key];
  const label = typeLabel || '消息';
  if (/订单|物流|售后/.test(label)) return { ...TYPE_META.ORDER, label };
  if (/活动|营销|优惠/.test(label)) return { ...TYPE_META.ACTIVITY, label };
  if (/系统|安全/.test(label)) return { ...TYPE_META.SYSTEM, label };
  if (/公告|通知/.test(label)) return { ...TYPE_META.NOTICE, label };
  return { ...TYPE_META.DEFAULT, label };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function readContentJson(detail: any): any | null {
  const json = detail?.contentJson;
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

function readImageUrl(detail: any): string {
  const contentJson = readContentJson(detail);
  const blocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const imageBlock = blocks.find((block: any) => block?.type === 'image' && (block?.url || block?.value));
  return (
    detail?.coverImageUrl ||
    detail?.imageUrl ||
    detail?.image ||
    detail?.picUrl ||
    contentJson?.imageUrl ||
    contentJson?.image ||
    imageBlock?.url ||
    imageBlock?.value ||
    ''
  )
    .toString()
    .trim();
}

function readContentText(detail: any): string {
  const contentJson = readContentJson(detail);
  const blocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const textBlock = blocks.find(
    (block: any) => block?.type === 'text' && (block?.value || block?.text || block?.content),
  );
  return String(
    detail?.content ||
      detail?.contentText ||
      contentJson?.content ||
      textBlock?.value ||
      textBlock?.text ||
      textBlock?.content ||
      '',
  ).trim();
}

function buildBlocks(detail: any): DetailBlock[] {
  const contentJson = readContentJson(detail);
  const sourceBlocks = Array.isArray(contentJson?.blocks) ? contentJson.blocks : [];
  const blocks: DetailBlock[] = [];

  sourceBlocks.forEach((block: any) => {
    if (block?.type === 'text') {
      const value = block.value || block.text || block.content || '';
      if (value) {
        blocks.push({ type: 'text', value } as DetailBlock);
      }
    }
    if (block?.type === 'image') {
      const url = block.url || block.value || '';
      if (url) {
        blocks.push({ type: 'image', url, alt: block.alt || '' } as DetailBlock);
      }
    }
  });

  if (!blocks.some((block) => block.type === 'text')) {
    const content = readContentText(detail);
    if (content) {
      blocks.unshift({ type: 'text', value: content } as DetailBlock);
    }
  }

  const imageUrl = readImageUrl(detail);
  if (imageUrl && !blocks.some((block) => block.type === 'image' && block.url === imageUrl)) {
    blocks.push({ type: 'image', url: imageUrl } as DetailBlock);
  }

  if (!blocks.length) {
    const fallback = detail?.summary || detail?.title || '';
    if (fallback) {
      blocks.push({ type: 'text', value: fallback } as DetailBlock);
    }
  }

  return blocks;
}

function resolvePublisherName(detail: any): string {
  return String(detail?.senderNickname || '湾源农仓公告');
}

function resolveAvatar(detail: any): string {
  return String(detail?.senderAvatar || detail?.coverImageUrl || detail?.imageUrl || '').trim();
}

function resolveLink(detail: any): { label: string; url: string } {
  const contentJson = readContentJson(detail);
  const link = contentJson?.link;
  const url = String(link?.url || '').trim();
  if (!url) return { label: '', url: '' };
  return {
    label: String(link?.label || '查看详情').trim() || '查看详情',
    url,
  };
}

Component({
  data: {
    pageStyle: '',
    icons: iconPaths,
    loading: true,
    message: null as AppMessageDetail | null,
    publisherName: '湾源农仓公告',
    displayTitle: '',
    summaryText: '',
    typeLabel: '公告',
    tone: 'green' as MessageTone,
    iconColor: '#2c4a39',
    senderAvatarSrc: '',
    showSenderAvatarImage: false,
    senderFallbackIconName: 'bell',
    blocks: [] as DetailBlock[],
    publishTimeText: '',
    linkLabel: '',
    linkUrl: '',
  },
  lifetimes: {
    attached() {
      this.setData({ pageStyle: buildPageTopStyle(0) });
    },
  },
  methods: {
    onLoad(options: { receiptId?: string }) {
      const receiptId = Number(options?.receiptId ?? 0);
      if (!ensureCustomerAccess(`/pages/message/view/view?receiptId=${receiptId}`)) {
        return;
      }
      void this.loadDetail(receiptId);
    },
    async loadDetail(receiptId: number) {
      if (!receiptId) {
        this.setData({ loading: false });
        return;
      }

      this.setData({ loading: true });

      try {
        const detail = await fetchMessageDetail(receiptId);
        const avatar = resolveAvatar(detail);
        const meta = resolveTypeMeta(String(detail.type || ''), String(detail.typeLabel || ''));
        const link = resolveLink(detail);

        this.setData({
          message: { ...detail, isRead: true },
          publisherName: resolvePublisherName(detail),
          displayTitle: String(detail.title || detail.summary || '').trim(),
          summaryText: String(detail.summary || '').trim(),
          typeLabel: String(detail.typeLabel || meta.label),
          tone: meta.tone,
          iconColor: meta.iconColor,
          senderAvatarSrc: avatar,
          showSenderAvatarImage: Boolean(avatar),
          senderFallbackIconName: meta.icon,
          blocks: buildBlocks(detail),
          publishTimeText: formatDateTime(detail.publishAt),
          linkLabel: link.label,
          linkUrl: link.url,
          loading: false,
        });

        if (!detail.isRead) {
          void markMessageRead(receiptId).catch(() => {});
        }
      } catch {
        this.setData({
          loading: false,
          message: null,
        });
      }
    },
    previewImage(e: WechatMiniprogram.BaseEvent) {
      const { url } = (e.currentTarget.dataset as { url?: string }) || {};
      if (!url) return;
      wx.previewImage({ urls: [url], current: url });
    },
    openLink() {
      const url = this.data.linkUrl;
      if (!url) return;
      if (url.startsWith('/pages/')) {
        wx.navigateTo({
          url,
          fail: () => {
            wx.switchTab({
              url,
              fail: () => wx.showToast({ title: '无法打开链接', icon: 'none' }),
            });
          },
        });
        return;
      }
      wx.setClipboardData({
        data: url,
        success: () => wx.showToast({ title: '链接已复制', icon: 'none' }),
      });
    },
    goBack() {
      navigateBackOrHome();
    },
    handleAvatarError() {
      this.setData({
        senderAvatarSrc: '',
        showSenderAvatarImage: false,
      });
    },
  },
});
