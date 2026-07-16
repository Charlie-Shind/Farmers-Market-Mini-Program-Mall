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
  visitedTimeText: string;
  coverStyle: string;
  priceLabel: string;
};

type BrowseHistoryGroup = {
  label: string;
  items: BrowseHistoryView[];
};

const BROWSE_HISTORY_KEY = 'farm.browse.history.v1';

function formatTime(value?: number) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function getDateGroupLabel(value?: number) {
  if (!value) {
    return '更早';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '更早';
  }

  const startOfDay = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);

  if (diffDays <= 0) {
    return '今天';
  }
  if (diffDays === 1) {
    return '昨天';
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} 天前`;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function normalizeHistoryItems(raw: unknown): BrowseHistoryView[] {
  const records = Array.isArray(raw) ? (raw as BrowseHistoryRecord[]) : [];

  return records
    .filter((item) => item && Number.isFinite(Number(item.productId)))
    .map((item) => ({
      ...item,
      visitedTimeText: formatTime(item.visitedAt),
      coverStyle: item.coverUrl
        ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
        : '',
      priceLabel: item.price ? `¥${item.price}` : '¥0.00',
    }));
}

function groupHistoryItems(items: BrowseHistoryView[]): BrowseHistoryGroup[] {
  const groups: BrowseHistoryGroup[] = [];

  items.forEach((item) => {
    const label = getDateGroupLabel(item.visitedAt);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  });

  return groups;
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    showClearSheet: false,
    history: {
      items: [] as BrowseHistoryView[],
    },
    historyGroups: [] as BrowseHistoryGroup[],
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
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
      const items = normalizeHistoryItems(raw);
      this.setData({
        history: { items },
        historyGroups: groupHistoryItems(items),
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
      if (!this.data.history.items.length) {
        return;
      }

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
        historyGroups: [],
      });
      wx.showToast({ title: '已清空', icon: 'success' });
    },
  },
});
