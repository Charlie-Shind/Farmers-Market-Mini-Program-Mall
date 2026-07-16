import { iconPaths } from '../../../config/icons';
import {
  fetchMerchantDetail,
  fetchMerchantPublicProducts,
  fetchMerchantCoupons,
  receiveCoupon,
  fetchChatSupportTarget,
  openChatConversation,
  type AppMerchantCoupon,
  type AppMerchantProduct,
  type AppMerchantSummary,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import {
  ensureCustomerAccess,
  navigateBackOrHome,
  redirectMerchantAwayFromCustomerRoute,
} from '../../../utils/auth-route';

const PAGE_SIZE = 12;

type SortKey = 'default' | 'sales' | 'price';

const SORT_TABS: Array<{ key: SortKey; label: string }> = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'price', label: '价格' },
];

function sortProducts(products: AppMerchantProduct[], sort: SortKey) {
  const list = [...products];
  if (sort === 'sales') {
    return list.sort((a, b) => Number(b.saleCount || 0) - Number(a.saleCount || 0));
  }
  if (sort === 'price') {
    return list.sort((a, b) => Number(a.minPrice || 0) - Number(b.minPrice || 0));
  }
  return list;
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    merchantId: 0,
    shop: null as AppMerchantSummary | null,
    coupons: [] as AppMerchantCoupon[],
    products: [] as AppMerchantProduct[],
    displayProducts: [] as AppMerchantProduct[],
    sortTabs: SORT_TABS,
    productSort: 'default' as SortKey,
    page: 1,
    total: 0,
    loading: false,
    loadingMore: false,
    noMore: false,
    hasLoaded: false,
    scrollIntoView: '',
  },
  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/merchant-public/detail/index')) {
        return;
      }
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  pageLifetimes: {
    show() {
      void this.ensureShopReady();
    },
  },
  methods: {
    async ensureShopReady(this: any) {
      if (this.data.merchantId > 0 && this.data.hasLoaded) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));

      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      const merchantId = Number(options.merchantId ?? 0);

      if (!merchantId) {
        wx.showToast({ title: '缺少店铺参数', icon: 'none' });
        setTimeout(() => this.goBack(), 1200);
        return;
      }

      if (merchantId !== this.data.merchantId) {
        this.setData({ merchantId });
      }

      if (!this.data.hasLoaded && !this.data.loading) {
        void this.loadShop(merchantId);
        void this.loadCoupons(merchantId);
        void this.loadProducts(true, merchantId);
      }
    },
    async loadShop(this: any, merchantId = this.data.merchantId) {
      try {
        const shop = await fetchMerchantDetail(merchantId);
        this.setData({ shop });
      } catch {
        this.setData({ shop: null });
      }
    },
    async loadCoupons(this: any, merchantId = this.data.merchantId) {
      try {
        const coupons = await fetchMerchantCoupons(merchantId);
        this.setData({ coupons: Array.isArray(coupons) ? coupons : [] });
      } catch {
        this.setData({ coupons: [] });
      }
    },
    async loadProducts(this: any, reset: boolean, merchantId = this.data.merchantId) {
      if (this.data.loading || this.data.loadingMore) {
        return;
      }
      const page = reset ? 1 : this.data.page;
      this.setData({ [reset ? 'loading' : 'loadingMore']: true });
      try {
        const result = await fetchMerchantPublicProducts(merchantId, {
          page,
          pageSize: PAGE_SIZE,
        });
        const items = result.items || [];
        const merged = reset ? items : [...this.data.products, ...items];
        const noMore = merged.length >= result.total || items.length < PAGE_SIZE;
        this.setData({
          products: merged,
          displayProducts: sortProducts(merged, this.data.productSort),
          total: result.total,
          page: page + 1,
          noMore,
          hasLoaded: true,
        });
      } catch {
        if (reset) {
          this.setData({
            products: [],
            displayProducts: [],
            total: 0,
            noMore: true,
            hasLoaded: true,
          });
        }
      } finally {
        this.setData({ loading: false, loadingMore: false });
      }
    },
    selectSort(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: SortKey }) || {};
      if (!key || key === this.data.productSort) {
        return;
      }
      this.setData({
        productSort: key,
        displayProducts: sortProducts(this.data.products, key),
      });
    },
    loadMore() {
      if (this.data.noMore || this.data.loadingMore || this.data.loading) {
        return;
      }
      void this.loadProducts(false);
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: string | number }) || {};
      if (!productId) {
        return;
      }
      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${productId}`,
      });
    },
    async onReceiveCoupon(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/merchant-public/detail/index')) {
        return;
      }

      const { couponId, received, active } = (e.currentTarget.dataset as {
        couponId?: string | number;
        received?: string | boolean;
        active?: string | boolean;
      }) || {};
      const isReceived = received === true || received === 'true' || received === '1';
      const isActive = active === true || active === 'true' || active === '1';
      if (!couponId) {
        return;
      }
      if (isReceived) {
        wx.showToast({ title: '已领取过该券', icon: 'none' });
        return;
      }
      if (!isActive) {
        wx.showToast({ title: '该券已失效', icon: 'none' });
        return;
      }
      try {
        await receiveCoupon(Number(couponId));
        wx.showToast({ title: '领取成功', icon: 'success' });
        const next = this.data.coupons.map((c) =>
          c.couponId === Number(couponId) ? { ...c, received: true } : c,
        );
        this.setData({ coupons: next });
      } catch {
        wx.showToast({ title: '领取失败，请重试', icon: 'none' });
      }
    },
    scrollToCoupons() {
      this.setData({ scrollIntoView: 'shop-coupons' });
      setTimeout(() => this.setData({ scrollIntoView: '' }), 400);
    },
    scrollToProducts() {
      this.setData({ scrollIntoView: 'shop-products' });
      setTimeout(() => this.setData({ scrollIntoView: '' }), 400);
    },
    async contactShop() {
      if (!ensureCustomerAccess('/pages/merchant-public/detail/index')) {
        return;
      }
      try {
        const merchantId = this.data.merchantId;
        const target = await fetchChatSupportTarget();
        const opened = await openChatConversation({
          merchantId: merchantId || target.merchantId,
          sceneType: 'GENERAL',
          sceneLabel: this.data.shop?.storeName || '店铺咨询',
          sceneSource: '店铺主页',
        });
        if (opened && (opened as any).conversationId) {
          wx.navigateTo({
            url: `/pages/chat/chat?conversationId=${(opened as any).conversationId}`,
          });
          return;
        }
        wx.showToast({ title: '客服暂不可用', icon: 'none' });
      } catch {
        wx.showToast({ title: '客服暂不可用，请稍后再试', icon: 'none' });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
  },
});
