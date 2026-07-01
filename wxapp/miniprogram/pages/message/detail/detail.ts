import { iconPaths } from '../../../config/icons';
import {
  fetchMessageDetail,
  markMessageRead,
  type AppMessageContentBlock,
  type AppMessageDetail,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../../utils/auth-route';

type MessageBlockView = AppMessageContentBlock;


function formatDateTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getToneClass(type: string) {
  if (type === 'ORDER') {
    return 'order';
  }

  if (type === 'ACTIVITY') {
    return 'activity';
  }

  if (type === 'NOTICE') {
    return 'notice';
  }

  return 'system';
}

Component({
  data: {
    loading: true,
    message: null as AppMessageDetail | null,
    blocks: [] as MessageBlockView[],
    linkUrl: '',
    linkLabel: '',
    toneClass: 'system',
    publishTimeText: '',
    pageStyle: '',
    icons: iconPaths,
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  methods: {
    onLoad(options: { receiptId?: string }) {
      const receiptId = Number(options?.receiptId ?? 0);
      if (!ensureCustomerAccess(`/pages/message/detail/detail?receiptId=${receiptId}`)) {
        return;
      }

      void this.loadDetail(receiptId);
    },
    async loadDetail(receiptId: number) {
      if (!receiptId) {
        wx.showToast({
          title: '公告不存在',
          icon: 'none',
        });
        setTimeout(() => {
          navigateBackOrHome();
        }, 1500);
        return;
      }

      this.setData({
        loading: true,
      });

      try {
        const detail = await fetchMessageDetail(receiptId);
        const contentJson = detail.contentJson || null;
        const blocks = contentJson?.blocks?.length
          ? contentJson.blocks
          : [
              {
                type: 'text',
                value: detail.summary || detail.title,
              } as MessageBlockView,
            ];
        const link = contentJson?.link;

        this.setData({
          message: {
            ...detail,
            isRead: true,
          },
          blocks,
          linkUrl: link?.url || '',
          linkLabel: link?.label || '查看关联内容',
          toneClass: getToneClass(detail.type),
          publishTimeText: formatDateTime(detail.publishAt),
          loading: false,
        });

        if (!detail.isRead) {
          void markMessageRead(receiptId).catch((err) => {
            console.error('Failed to mark message as read:', err);
          });
        }
      } catch {
        this.setData({
          loading: false,
        });
        wx.showToast({
          title: '公告加载失败',
          icon: 'none',
        });
        setTimeout(() => {
          navigateBackOrHome();
        }, 1500);
      }
    },
    previewImage(e: WechatMiniprogram.BaseEvent) {
      const { url } = (e.currentTarget.dataset as { url?: string }) || {};
      if (!url) {
        return;
      }

      wx.previewImage({
        urls: [url],
        current: url,
      });
    },
    openLink() {
      const url = this.data.linkUrl;
      if (!url) {
        return;
      }

      if (url.startsWith('/pages/')) {
        wx.navigateTo({
          url,
        });
        return;
      }

      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({ title: '链接已复制到剪贴板', icon: 'success' });
        },
      });
    },
    goBack() {
      navigateBackOrHome();
    },
    getToneClass,
    formatDateTime,
  },
});
