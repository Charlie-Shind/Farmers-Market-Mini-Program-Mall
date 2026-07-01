"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const app_2 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const PAGE_SIZE = 12;
const COUPON_PREVIEW_COUNT = 2;
function buildCouponPreview(coupons, showAll) {
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
        icons: icons_1.iconPaths,
        pageStyle: '',
        merchantId: 0,
        shop: null,
        shopInitial: '商',
        coupons: [],
        visibleCoupons: [],
        moreCouponsCount: 0,
        couponMoreText: '更多',
        showAllCoupons: false,
        products: [],
        page: 1,
        total: 0,
        loading: false,
        loadingMore: false,
        noMore: false,
        hasLoaded: false,
    },
    lifetimes: {
        attached() {
            if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/merchant-public/detail/index')) {
                return;
            }
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
        },
    },
    pageLifetimes: {
        show() {
            void this.ensureShopReady();
        },
    },
    methods: {
        async ensureShopReady() {
            var _a;
            if (this.data.merchantId > 0 && this.data.hasLoaded) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const options = (current === null || current === void 0 ? void 0 : current.options) || {};
            const merchantId = Number((_a = options.merchantId) !== null && _a !== void 0 ? _a : 0);
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
        async loadShop(merchantId = this.data.merchantId) {
            try {
                const shop = await (0, app_1.fetchMerchantDetail)(merchantId);
                const shopInitial = (shop.storeName || '商').trim().charAt(0) || '商';
                this.setData({ shop, shopInitial });
            }
            catch {
                this.setData({ shop: null });
            }
        },
        async loadCoupons(merchantId = this.data.merchantId) {
            try {
                const coupons = await (0, app_1.fetchMerchantCoupons)(merchantId);
                this.setData({
                    coupons,
                    ...buildCouponPreview(coupons, this.data.showAllCoupons),
                });
            }
            catch {
                this.setData({
                    coupons: [],
                    ...buildCouponPreview([], this.data.showAllCoupons),
                });
            }
        },
        async loadProducts(reset, merchantId = this.data.merchantId) {
            if (this.data.loading || this.data.loadingMore) {
                return;
            }
            const page = reset ? 1 : this.data.page;
            this.setData({ [reset ? 'loading' : 'loadingMore']: true });
            try {
                const result = await (0, app_1.fetchMerchantPublicProducts)(merchantId, {
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
            }
            catch {
                if (reset) {
                    this.setData({ products: [], total: 0, noMore: true, hasLoaded: true });
                }
            }
            finally {
                this.setData({ loading: false, loadingMore: false });
            }
        },
        loadMore() {
            if (this.data.noMore || this.data.loadingMore || this.data.loading) {
                return;
            }
            void this.loadProducts(false);
        },
        openProductDetail(e) {
            const { productId } = e.currentTarget.dataset || {};
            if (!productId) {
                return;
            }
            wx.navigateTo({
                url: `/pages/product/detail/detail?productId=${productId}`,
            });
        },
        async onReceiveCoupon(e) {
            const { couponId, received, active } = e.currentTarget.dataset || {};
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
                await (0, app_2.receiveCoupon)(Number(couponId));
                wx.showToast({ title: '领取成功', icon: 'success' });
                const next = this.data.coupons.map((c) => c.couponId === Number(couponId) ? { ...c, received: true } : c);
                this.setData({
                    coupons: next,
                    ...buildCouponPreview(next, this.data.showAllCoupons),
                });
            }
            catch {
                wx.showToast({ title: '领取失败，请重试', icon: 'none' });
            }
        },
        toggleCoupons() {
            const showAllCoupons = !this.data.showAllCoupons;
            this.setData({
                showAllCoupons,
                ...buildCouponPreview(this.data.coupons, showAllCoupons),
            });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
    },
});
