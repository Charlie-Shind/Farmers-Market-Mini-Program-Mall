import { iconPaths } from '../../../config/icons';
import {
  fetchMerchantDetail,
  fetchMerchantPublicProducts,
  fetchMerchantCoupons,
  type AppMerchantCoupon,
  type AppMerchantProduct,
  type AppMerchantSummary,
} from '../../../services/app';
import { receiveCoupon } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

const PAGE_SIZE = 12;
const COUPON_PREVIEW_COUNT = 2;

function buildCouponPreview(coupons: AppMerchantCoupon[], showAll: boolean) {
  const list = Array.isArray(coupons) ? coupons : [];
  const visibleCoupons = showAll ? list : list.slice(0, COUPON_PREVIEW_COUNT);
  const moreCouponsCount = Math.max(list.length - visibleCoupons.length, 0);

  return {
    visibleCoupons,
    moreCouponsCount,
    couponMoreText: showAll ? '收起' : `更多 ${moreCouponsCount} 张`,
  };
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    merchantId: 0,
    shop: null as AppMerchantSummary | null,
    shopInitial: '商',
    coupons: [] as AppMerchantCoupon[],
    visibleCoupons: [] as AppMerchantCoupon[],
    moreCouponsCount: 0,
    couponMoreText: '更多',
    showAllCoupons: false,
    products: [] as AppMerchantProduct[],
    page: 1,
    total: 0,
    loading: false,
    loadingMore: false,
    noMore: false,
    hasLoaded: false,
  },
  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/merchant-public/detail/index')) {
        return;
      }

      this.setData({
        pageStyle: buildPageTopStyle(4),
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
        this.setData({
          merchantId,
        });
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
        const shopInitial = (shop.storeName || '商').trim().charAt(0) || '商';
        this.setData({ shop, shopInitial });
      } catch {
        this.setData({ shop: null });
      }
    },
    async loadCoupons(this: any, merchantId = this.data.merchantId) {
      try {
        const coupons = await fetchMerchantCoupons(merchantId);
        this.setData({
          coupons,
          ...buildCouponPreview(coupons, this.data.showAllCoupons),
        });
      } catch {
        this.setData({
          coupons: [],
          ...buildCouponPreview([], this.data.showAllCoupons),
        });
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
          total: result.total,
          page: page + 1,
          noMore,
          hasLoaded: true,
        });
      } catch {
        if (reset) {
          this.setData({ products: [], total: 0, noMore: true, hasLoaded: true });
        }
      } finally {
        this.setData({ loading: false, loadingMore: false });
      }
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
        this.setData({
          coupons: next,
          ...buildCouponPreview(next, this.data.showAllCoupons),
        });
      } catch {
        wx.showToast({ title: '领取失败，请重试', icon: 'none' });
      }
    },
    toggleCoupons(this: any) {
      const showAllCoupons = !this.data.showAllCoupons;
      this.setData({
        showAllCoupons,
        ...buildCouponPreview(this.data.coupons, showAllCoupons),
      });
    },
    goBack() {
      navigateBackOrHome();
    },
  },
});
