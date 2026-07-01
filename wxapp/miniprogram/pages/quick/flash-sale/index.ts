import { iconPaths } from '../../../config/icons';
import {
  fetchCartItemCount,
  fetchChatSupportTarget,
  openChatConversation,
} from '../../../services/app';
import {
  claimFlashSale,
  fetchFlashSaleWindows,
  fetchFlashSaleItems,
  type FlashSaleItem,
  type FlashSaleWindow,
} from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type FlashSaleProductView = {
  id: string;
  itemId?: number;
  productId: number;
  skuId?: number;
  title: string;
  subtitle: string;
  price: string;
  originPrice: string;
  discount: string;
  sold: number;
  coverUrl: string;
  stockLeft: number;
  totalStock: number;
  isFallback?: boolean;
};

type FlashSaleWindowView = {
  id: number;
  label: string;
  rangeText: string;
  startTime: string;
  status: 'ONGOING' | 'UPCOMING' | 'ENDED';
  statusLabel: string;
  countdownParts: { hh: string; mm: string; ss: string };
  startAt: string;
  endAt: string;
  total: number;
};

let _countdownTimer: number | null = null;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function splitCountdown(value: string): { hh: string; mm: string; ss: string } {
  if (value === '已结束') {
    return { hh: '00', mm: '00', ss: '00' };
  }
  const [hh = '00', mm = '00', ss = '00'] = value.split(':');
  return { hh, mm, ss };
}

function formatCountdown(target: string, now: number): string {
  const diff = new Date(target).getTime() - now;
  if (Number.isNaN(diff) || diff <= 0) {
    return '已结束';
  }
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startAt} - ${endAt}`;
  }
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function formatStartTime(startAt: string): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    return startAt;
  }
  return `${pad(start.getHours())}:${pad(start.getMinutes())}`;
}

function computeWindowStatus(startAt: string, endAt: string, now: number): 'ONGOING' | 'UPCOMING' | 'ENDED' {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (now < start) return 'UPCOMING';
  if (now < end) return 'ONGOING';
  return 'ENDED';
}

function mapStatusLabel(status: 'ONGOING' | 'UPCOMING' | 'ENDED'): string {
  if (status === 'ONGOING') return '本场剩余时间';
  if (status === 'UPCOMING') return '即将开始';
  return '已结束';
}

function calcDiscount(originPrice: string, flashPrice: string): string {
  const origin = Number(originPrice);
  const flash = Number(flashPrice);
  if (!origin || origin <= 0 || !flash || flash <= 0) {
    return '限时';
  }
  const rate = (flash / origin) * 10;
  const fixed = rate.toFixed(1);
  return `${fixed}折`;
}

function mapItem(item: FlashSaleItem): FlashSaleProductView {
  const sold = Math.max(0, item.totalStock - item.stockLeft);
  return {
    id: String(item.productId),
    itemId: item.itemId,
    productId: item.productId,
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle,
    price: item.flashPrice,
    originPrice: item.originPrice,
    discount: calcDiscount(item.originPrice, item.flashPrice),
    sold,
    coverUrl: item.coverUrl,
    stockLeft: item.stockLeft,
    totalStock: item.totalStock,
  };
}

function mapWindow(window: FlashSaleWindow, total: number, now: number): FlashSaleWindowView {
  const target = window.status === 'UPCOMING' ? window.startAt : window.endAt;
  return {
    id: window.id,
    label: window.label,
    rangeText: formatTimeRange(window.startAt, window.endAt),
    startTime: formatStartTime(window.startAt),
    status: window.status,
    statusLabel: mapStatusLabel(window.status),
    countdownParts: splitCountdown(formatCountdown(target, now)),
    startAt: window.startAt,
    endAt: window.endAt,
    total,
  };
}

Component({
  data: {
    pageTitle: '秒杀专区',
    products: [] as FlashSaleProductView[],
    windows: [] as FlashSaleWindowView[],
    activeWindowIndex: 0,
    activeWindow: null as FlashSaleWindowView | null,
    activeWindowId: '',
    loading: false,
    loadingMore: false,
    noMore: false,
    cartBadge: '',
    icons: iconPaths,
    pageStyle: '',
  },
  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/flash-sale/index')) {
        return;
      }

      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};

      this.setData({
        pageTitle: options.title ? decodeURIComponent(options.title) : '限时秒杀',
        pageStyle: buildPageTopStyle(0),
      });

      void this.loadWindows();
      void this.syncCartBadge();
    },
    detached() {
      this._clearCountdowns();
    },
  },
  pageLifetimes: {
    show() {
      void this.syncCartBadge();
      this._startCountdowns();
    },
    hide() {
      this._clearCountdowns();
    },
  },
  methods: {
    _clearCountdowns() {
      if (_countdownTimer != null) {
        clearInterval(_countdownTimer);
        _countdownTimer = null;
      }
    },
    _startCountdowns() {
      this._clearCountdowns();
      const windows = this.data.windows;
      if (!windows.length) {
        return;
      }
      const tick = () => {
        const now = Date.now();
        const current = this.data.windows;
        if (!current.length) {
          this._clearCountdowns();
          return;
        }
        const next = current.map((w) => {
          const status = computeWindowStatus(w.startAt, w.endAt, now);
          const target = status === 'UPCOMING' ? w.startAt : w.endAt;
          return {
            ...w,
            status,
            statusLabel: mapStatusLabel(status),
            countdownParts: splitCountdown(formatCountdown(target, now)),
          };
        });

        let activeWindowIndex = this.data.activeWindowIndex;
        if (activeWindowIndex < next.length) {
          const cur = next[activeWindowIndex];
          if (cur.status === 'ENDED') {
            const ongoing = next.findIndex((w) => w.status === 'ONGOING');
            if (ongoing >= 0) {
              activeWindowIndex = ongoing;
            }
          }
        }

        this.setData({ windows: next, activeWindowIndex, activeWindow: next[activeWindowIndex] ?? null });
      };
      tick();
      _countdownTimer = setInterval(tick, 1000) as unknown as number;
    },
    async syncCartBadge() {
      try {
        const count = await fetchCartItemCount();
        this.setData({ cartBadge: count > 0 ? String(count) : '' });
      } catch {
        this.setData({ cartBadge: '' });
      }
    },
    async loadWindows() {
      this.setData({ loading: true });
      try {
        const result = await fetchFlashSaleWindows();
        const now = Date.now();
        const windowsRaw = result.windows || [];
        const windows = windowsRaw.map((w) => mapWindow(w, 0, now));
        const ongoingIndex = windows.findIndex((w) => w.status === 'ONGOING');
        const activeWindowIndex = ongoingIndex >= 0 ? ongoingIndex : 0;

        this.setData({
          windows,
          activeWindowIndex,
          activeWindow: windows[activeWindowIndex] ?? null,
          activeWindowId: windows[activeWindowIndex] ? `flash-window-${windows[activeWindowIndex].id}` : '',
          products: [],
          noMore: windows.length === 0,
        });
        this._startCountdowns();

        if (windows[activeWindowIndex]) {
          await this.loadItems(true);
        }
      } catch {
        this.setData({ windows: [], products: [], activeWindow: null, noMore: true });
        this._clearCountdowns();
      } finally {
        this.setData({ loading: false });
      }
    },
    async loadItems(reset: boolean) {
      const { windows, activeWindowIndex, loadingMore, products } = this.data;
      const window = windows[activeWindowIndex];
      if (!window || loadingMore) {
        return;
      }

      const pageSize = 12;
      const nextPage = reset ? 1 : Math.floor(products.length / pageSize) + 1;

      this.setData({ loadingMore: true });
      try {
        const result = await fetchFlashSaleItems({ windowId: window.id, page: nextPage, pageSize });
        const items = (result.items || []).map((item) => mapItem(item));
        const currentItems = items;
        const merged = reset ? currentItems : [...products, ...currentItems];
        const noMore = merged.length >= result.total || currentItems.length < pageSize;

        const windowsWithTotal = this.data.windows.map((w) =>
          w.id === window.id ? { ...w, total: result.total } : w,
        );

        this.setData({
          products: merged,
          noMore,
          windows: windowsWithTotal,
          activeWindow: windowsWithTotal[activeWindowIndex] ?? null,
          activeWindowId: windowsWithTotal[activeWindowIndex] ? `flash-window-${windowsWithTotal[activeWindowIndex].id}` : '',
        });
      } catch {
        if (reset) {
          this.setData({ products: [], noMore: true });
        }
      } finally {
        this.setData({ loadingMore: false });
      }
    },
    async selectWindow(e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number }) || {};
      if (typeof index !== 'number' || index === this.data.activeWindowIndex) {
        return;
      }
      this.setData({
        activeWindowIndex: index,
        activeWindow: this.data.windows[index] ?? null,
        activeWindowId: this.data.windows[index] ? `flash-window-${this.data.windows[index].id}` : '',
        products: [],
        noMore: false,
      });
      await this.loadItems(true);
    },
    async loadMore() {
      if (this.data.noMore || this.data.loadingMore || this.data.products.length === 0) {
        return;
      }
      await this.loadItems(false);
    },
    async claimFlashSaleAndGoCheckout(params: {
      itemId: number;
      title?: string;
      subtitle?: string;
      coverUrl?: string;
      originPrice?: string;
    }) {
      if (!ensureCustomerAccess('/pages/quick/flash-sale/index')) {
        return;
      }
      const { itemId, title, subtitle, coverUrl, originPrice } = params;
      try {
        const claim = await claimFlashSale({ itemId, quantity: 1 });
        wx.navigateTo({
          url:
            `/pages/checkout/checkout?mode=flashSale&flashSaleItemId=${claim.itemId}` +
            `&skuId=${claim.skuId}` +
            `&quantity=1` +
            `&flashPrice=${claim.flashPrice}` +
            `${title ? `&title=${encodeURIComponent(title)}` : ''}` +
            `${subtitle ? `&subtitle=${encodeURIComponent(subtitle)}` : ''}` +
            `${coverUrl ? `&coverUrl=${encodeURIComponent(coverUrl)}` : ''}` +
            `${originPrice ? `&originPrice=${encodeURIComponent(originPrice)}` : ''}`,
        });
      } catch (e: any) {
        wx.showToast({ title: e.message || '秒杀失败', icon: 'none' });
      }
    },
    async buyFlashSale(e: WechatMiniprogram.BaseEvent) {
      const { itemId, title, subtitle, coverUrl, originPrice } = (e.currentTarget.dataset as {
        itemId?: number;
        title?: string;
        subtitle?: string;
        coverUrl?: string;
        originPrice?: string;
      }) || {};
      if (!itemId) {
        return;
      }

      await this.claimFlashSaleAndGoCheckout({
        itemId,
        title,
        subtitle,
        coverUrl,
        originPrice,
      });
    },
    goBack() {
      navigateBackOrHome();
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { itemId, title, subtitle, coverUrl, originPrice } = (e.currentTarget.dataset as {
        itemId?: number;
        title?: string;
        subtitle?: string;
        coverUrl?: string;
        originPrice?: string;
      }) || {};
      if (!itemId) {
        return;
      }
      void this.claimFlashSaleAndGoCheckout({ itemId, title, subtitle, coverUrl, originPrice });
    },
    async contactSupport() {
      try {
        const target = await fetchChatSupportTarget();
        const opened = await openChatConversation({
          merchantId: target.merchantId,
          sceneType: 'OFFICIAL',
          sceneLabel: target.sceneLabel || '秒杀专区咨询',
          sceneSource: '秒杀专区',
        });
        if (opened && (opened as any).conversationId) {
          wx.navigateTo({
            url: `/pages/chat/chat?conversationId=${(opened as any).conversationId}`,
          });
        }
      } catch {
        wx.showToast({ title: '客服暂不可用，请稍后再试', icon: 'none' });
      }
    },
  },
});
