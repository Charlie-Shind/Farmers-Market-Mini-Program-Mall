import { iconPaths } from '../../../config/icons';
import { fetchCartItemCount } from '../../../services/app';
import {
  claimFlashSale,
  fetchFlashSaleWindows,
  fetchFlashSaleItems,
  type FlashSaleItem,
  type FlashSaleWindow,
  type FreightSubsidyRule,
} from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type FlashSaleProductView = {
  id: string;
  itemId?: number;
  productId: number;
  skuId?: number;
  title: string;
  subtitle: string;
  price: string;
  priceInt: string;
  priceFrac: string;
  originPrice: string;
  discount: string;
  sold: number;
  soldPercent: number;
  coverUrl: string;
  stockLeft: number;
  totalStock: number;
  tags: string[];
  promoLabel: string;
  proofText: string;
  saveAmount: string;
};

type FreightSubsidyRuleView = FreightSubsidyRule & {
  shortLabel: string;
};

function formatFreightShortLabel(rule: FreightSubsidyRule): string {
  const threshold = Number(rule.thresholdAmount || 0);
  const freight = Number(rule.freightAmount || 0);
  const thresholdText = Number.isFinite(threshold) ? String(Math.round(threshold * 100) / 100).replace(/\.0$/, '') : '0';
  if (!Number.isFinite(freight) || freight <= 0) {
    return `满${thresholdText}免运`;
  }
  const freightText = String(Math.round(freight * 100) / 100).replace(/\.0$/, '');
  return `满${thresholdText}运¥${freightText}`;
}

function mapFreightRules(rules: FreightSubsidyRule[] = []): FreightSubsidyRuleView[] {
  return rules.slice(0, 2).map((rule) => ({
    ...rule,
    shortLabel: formatFreightShortLabel(rule),
  }));
}

type FlashSaleWindowView = {
  id: number;
  label: string;
  rangeText: string;
  status: 'ONGOING' | 'UPCOMING' | 'ENDED';
  statusLabel: string;
  tabLabel: string;
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

function formatCountdownText(parts: { hh: string; mm: string; ss: string }) {
  return `${parts.hh}:${parts.mm}:${parts.ss}`;
}

function formatDateTimePart(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 展示活动真实起止时间，例如：7月19日 05:44 - 7月20日 05:44 */
function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startAt} - ${endAt}`;
  }
  return `${formatDateTimePart(start)} - ${formatDateTimePart(end)}`;
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
  if (status === 'UPCOMING') return '距开抢还有';
  return '本场已结束';
}

function mapTabLabel(status: 'ONGOING' | 'UPCOMING' | 'ENDED'): string {
  if (status === 'ONGOING') return '抢购中';
  if (status === 'UPCOMING') return '即将开抢';
  return '已结束';
}

function splitPrice(value: string): { priceInt: string; priceFrac: string } {
  const text = String(value || '0');
  const [priceInt = '0', priceFrac = ''] = text.split('.');
  return {
    priceInt,
    priceFrac: priceFrac ? priceFrac.padEnd(2, '0').slice(0, 2) : '',
  };
}

function calcDiscount(originPrice: string, flashPrice: string): string {
  const origin = Number(originPrice);
  const flash = Number(flashPrice);
  if (!origin || origin <= 0 || !flash || flash <= 0) {
    return '';
  }
  const rate = (flash / origin) * 10;
  return `${rate.toFixed(1)}折`;
}

function calcSaveAmount(originPrice: string, flashPrice: string): string {
  const origin = Number(originPrice);
  const flash = Number(flashPrice);
  if (!origin || !flash || origin <= flash) {
    return '';
  }
  return (origin - flash).toFixed(2);
}

function mapItem(item: FlashSaleItem): FlashSaleProductView {
  const sold = Math.max(0, item.totalStock - item.stockLeft);
  const total = Math.max(0, Number(item.totalStock) || 0);
  const soldPercent = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : -1;
  const { priceInt, priceFrac } = splitPrice(item.flashPrice);
  const stockLeft = Number(item.stockLeft) || 0;
  const flashNum = Number(item.flashPrice) || 0;
  const originNum = Number(item.originPrice) || 0;
  const displayOrigin = originNum > flashNum ? item.originPrice : '';
  const tags = ['农仓补贴', '低价秒杀'];
  if (item.originPlace) {
    tags.splice(1, 0, '产地直发');
  } else {
    tags.splice(1, 0, '品牌优选');
  }

  let promoLabel = '限时秒杀';
  if (stockLeft > 0 && stockLeft <= 10) promoLabel = '即将抢完';
  else if (soldPercent >= 60) promoLabel = '热卖返场';
  else if (Number(item.flashPrice) < 20) promoLabel = '补贴专场';

  const proofBase = Math.max(sold * 37 + 128, 168);
  const proofText =
    soldPercent >= 70
      ? `已有超${proofBase}人关注本店秒杀`
      : item.originPlace
        ? `${item.originPlace}直供 · 坏单包退`
        : '超万人收藏店铺 · 放心购';

  return {
    id: String(item.itemId || item.productId),
    itemId: item.itemId,
    productId: item.productId,
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle,
    price: item.flashPrice,
    priceInt,
    priceFrac,
    originPrice: displayOrigin,
    discount: displayOrigin ? calcDiscount(item.originPrice, item.flashPrice) : '',
    sold,
    soldPercent,
    coverUrl: item.coverUrl,
    stockLeft,
    totalStock: item.totalStock,
    tags: tags.slice(0, 3),
    promoLabel,
    proofText,
    saveAmount: displayOrigin ? calcSaveAmount(item.originPrice, item.flashPrice) : '',
  };
}

function mapWindow(window: FlashSaleWindow, total: number, now: number): FlashSaleWindowView {
  const status = computeWindowStatus(window.startAt, window.endAt, now);
  const target = status === 'UPCOMING' ? window.startAt : window.endAt;
  return {
    id: window.id,
    label: window.label,
    rangeText: formatTimeRange(window.startAt, window.endAt),
    status,
    statusLabel: mapStatusLabel(status),
    tabLabel: mapTabLabel(status),
    countdownParts: splitCountdown(formatCountdown(target, now)),
    startAt: window.startAt,
    endAt: window.endAt,
    total,
  };
}

Component({
  data: {
    pageTitle: '限时秒杀',
    products: [] as FlashSaleProductView[],
    displayProducts: [] as FlashSaleProductView[],
    freightRules: [] as FreightSubsidyRuleView[],
    windows: [] as FlashSaleWindowView[],
    activeWindowIndex: 0,
    activeWindow: null as FlashSaleWindowView | null,
    activeWindowId: '',
    countdownText: '00:00:00',
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
    _syncDerivedProducts(products: FlashSaleProductView[]) {
      this.setData({
        products,
        displayProducts: products,
      });
    },
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
            tabLabel: mapTabLabel(status),
            rangeText: formatTimeRange(w.startAt, w.endAt),
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

        const activeWindow = next[activeWindowIndex] ?? null;
        this.setData({
          windows: next,
          activeWindowIndex,
          activeWindow,
          countdownText: activeWindow ? formatCountdownText(activeWindow.countdownParts) : '00:00:00',
        });
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
        const activeWindow = windows[activeWindowIndex] ?? null;

        this.setData({
          windows,
          freightRules: mapFreightRules(result.freightRules || []),
          activeWindowIndex,
          activeWindow,
          activeWindowId: activeWindow ? `flash-window-${activeWindow.id}` : '',
          countdownText: activeWindow ? formatCountdownText(activeWindow.countdownParts) : '00:00:00',
          products: [],
          displayProducts: [],
          noMore: windows.length === 0,
        });
        this._startCountdowns();

        if (activeWindow) {
          await this.loadItems(true);
        }
      } catch {
        this.setData({
          windows: [],
          freightRules: [],
          products: [],
          displayProducts: [],
          activeWindow: null,
          noMore: true,
        });
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
        const merged = reset ? items : [...products, ...items];
        const noMore = merged.length >= result.total || items.length < pageSize;

        const windowsWithTotal = this.data.windows.map((w) =>
          w.id === window.id ? { ...w, total: result.total } : w,
        );

        const activityEnds = (result.items || [])
          .map((item) => String(item.activityEndAt || ''))
          .filter(Boolean)
          .sort();
        const countdownTarget = activityEnds[0] || window.endAt;
        const activeWindow = windowsWithTotal[activeWindowIndex] ?? null;

        this.setData({
          noMore,
          windows: windowsWithTotal,
          activeWindow,
          activeWindowId: activeWindow ? `flash-window-${activeWindow.id}` : '',
          countdownText: formatCountdown(countdownTarget, Date.now()) === '已结束'
            ? '00:00:00'
            : formatCountdown(countdownTarget, Date.now()),
        });
        this._syncDerivedProducts(merged);
      } catch {
        if (reset) {
          this._syncDerivedProducts([]);
          this.setData({ noMore: true });
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
      const activeWindow = this.data.windows[index] ?? null;
      this.setData({
        activeWindowIndex: index,
        activeWindow,
        activeWindowId: activeWindow ? `flash-window-${activeWindow.id}` : '',
        countdownText: activeWindow ? formatCountdownText(activeWindow.countdownParts) : '00:00:00',
        products: [],
        displayProducts: [],
        noMore: false,
      });
      await this.loadItems(true);
    },
    focusSubsidy() {
      const rules = this.data.freightRules || [];
      const tip = rules.length
        ? rules.map((item) => item.ruleText).join('；')
        : '暂无运费满减规则';
      wx.showToast({ title: tip.slice(0, 28), icon: 'none' });
    },
    openGroupBuy() {
      wx.navigateTo({ url: '/pages/quick/group-buy/index?title=拼团专区' });
    },
    openGiftZone() {
      wx.navigateTo({ url: '/pages/quick/gift-zone/index?title=礼盒专区' });
    },
    openOriginZone() {
      wx.navigateTo({ url: '/pages/quick/origin-zone/index?title=产地直供' });
    },
    openCoupons() {
      wx.switchTab({ url: '/pages/marketing/marketing' });
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
      const product = this.data.products.find((item) => item.itemId === itemId);
      if (product && product.stockLeft <= 0) {
        wx.showToast({ title: '已抢光', icon: 'none' });
        return;
      }
      await this.claimFlashSaleAndGoCheckout({ itemId, title, subtitle, coverUrl, originPrice });
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
  },
});
