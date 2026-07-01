import { iconPaths } from '../../config/icons';
import { buildPageTopStyle } from '../../utils/page-layout';
import { navigateBackOrHome } from '../../utils/auth-route';

type BrowseHistoryRecord = {
  productId: number;
  title: string;
  subtitle: string;
  price: string;
  coverUrl: string;
  visitedAt: number;
};

type BrowseHistoryView = BrowseHistoryRecord & {
  visitedAtText: string;
  coverStyle: string;
  priceLabel: string;
};

const BROWSE_HISTORY_KEY = 'farm.browse.history.v1';

function formatDateTime(value?: number) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function normalizeHistoryItems(raw: unknown): BrowseHistoryView[] {
  const records = Array.isArray(raw) ? (raw as BrowseHistoryRecord[]) : [];

  return records
    .filter((item) => item && Number.isFinite(Number(item.productId)))
    .map((item) => ({
      ...item,
      visitedAtText: formatDateTime(item.visitedAt),
      coverStyle: item.coverUrl
        ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
        : '',
      priceLabel: item.price ? `¥${item.price}` : '¥0.00',
    }));
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    showClearSheet: false,
    history: {
      items: [] as BrowseHistoryView[],
    },
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
      });
    },
  },
  pageLifetimes: {
    show() {
      void this.loadHistory();
    },
  },
  methods: {
    async loadHistory() {
      const raw = wx.getStorageSync(BROWSE_HISTORY_KEY);
      this.setData({
        history: {
          items: normalizeHistoryItems(raw),
        },
      });
    },
    goBack() {
      navigateBackOrHome();
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: number | string }) || {};
      if (!productId) {
        return;
      }

      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${Number(productId)}`,
      });
    },
    openClearSheet() {
      this.setData({
        showClearSheet: true,
      });
    },
    closeClearSheet() {
      this.setData({
        showClearSheet: false,
      });
    },
    stopBubble() {
      // swallow overlay taps
    },
    clearHistory() {
      wx.removeStorageSync(BROWSE_HISTORY_KEY);
      this.setData({
        showClearSheet: false,
        history: {
          items: [],
        },
      });
      wx.showToast({ title: '已清空', icon: 'success' });
    },
  },
});
