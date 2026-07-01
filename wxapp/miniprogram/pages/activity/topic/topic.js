"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const token_1 = require("../../../services/token");
const TOPIC_FILTERS = ['精选', '秒杀', '拼团', '礼盒'];
function readPageOptions() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    return (current === null || current === void 0 ? void 0 : current.options) || {};
}
function formatSaleCount(value) {
    return Number(value || 0).toLocaleString('zh-CN');
}
function buildTopicTags(product, index) {
    const tags = [];
    if (product.isHot) {
        tags.push('热销');
    }
    if (product.isPreSale) {
        tags.push('预售');
    }
    if (product.originPlace) {
        tags.push(product.originPlace);
    }
    if (!tags.length) {
        tags.push(index % 2 === 0 ? '精选' : '限时');
    }
    return tags.slice(0, 2);
}
function buildTopicView(product, index) {
    return {
        id: String(product.id),
        skuId: product.skuId,
        title: product.title,
        desc: product.subtitle || product.originPlace || '活动专题精选商品',
        price: product.minPrice || '0.00',
        imageClass: ['img-orange', 'img-tomato', 'img-egg', 'img-rice', 'img-meat', 'img-gift'][index % 6],
        imageStyle: product.coverUrl
            ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
            : '',
        tags: buildTopicTags(product, index),
        saleCount: formatSaleCount(product.saleCount),
    };
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        pageTitle: '活动专题',
        pageDesc: '源头好货限时补贴，产地直采、冷链直发、售后无忧。',
        filters: TOPIC_FILTERS,
        activeFilter: TOPIC_FILTERS[0],
        loading: false,
        allProducts: [],
        products: [],
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
        },
    },
    pageLifetimes: {
        show() {
            void this.bootstrapPage();
        },
    },
    methods: {
        async bootstrapPage() {
            await new Promise((resolve) => setTimeout(resolve, 0));
            const options = readPageOptions();
            this.setData({
                pageTitle: options.title ? decodeURIComponent(options.title) : '活动专题',
                pageDesc: options.title ? '平台官方活动专题聚合页' : '源头好货限时补贴，产地直采、冷链直发、售后无忧。',
            });
            await this.loadTopicData();
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        ensureAccess() {
            if ((0, token_1.getAuthTokenType)() === 'access') {
                return true;
            }
            wx.navigateTo({
                url: (0, auth_route_1.buildProfileLoginUrl)('/pages/activity/topic/topic'),
            });
            return false;
        },
        async loadTopicData() {
            this.setData({ loading: true });
            try {
                const [pageResult, hotProducts] = await Promise.all([
                    (0, app_1.fetchProducts)('', 12),
                    (0, app_1.fetchHomeHotProducts)().catch(() => []),
                ]);
                const pageProducts = pageResult.items || [];
                const merged = pageProducts.length ? pageProducts : hotProducts;
                const items = merged.map((product, index) => buildTopicView(product, index));
                this.setData({
                    allProducts: items,
                });
                this.applyFilter(this.data.activeFilter, items);
            }
            catch {
                this.setData({
                    allProducts: [],
                    products: [],
                });
            }
            finally {
                this.setData({ loading: false });
            }
        },
        applyFilter(filter, source) {
            const all = source || this.data.allProducts;
            const filtered = (() => {
                if (filter === '精选') {
                    return all;
                }
                if (filter === '秒杀') {
                    return all.filter((item, index) => index < 6 || Number(item.saleCount.replace(/,/g, '')) > 100);
                }
                if (filter === '拼团') {
                    return all.filter((item, index) => index % 2 === 0 || item.tags.includes('热销'));
                }
                if (filter === '礼盒') {
                    return all.filter((item) => item.title.includes('礼盒') || item.tags.includes('礼盒'));
                }
                return all;
            })();
            this.setData({
                activeFilter: filter,
                products: filtered,
            });
        },
        changeFilter(e) {
            const { filter } = e.currentTarget.dataset || {};
            if (!filter) {
                return;
            }
            this.applyFilter(filter);
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
        openProductList() {
            wx.navigateTo({
                url: `/pages/product/list/list?title=${encodeURIComponent(this.data.pageTitle)}`,
            });
        },
        async quickAdd(e) {
            const { skuId, productId } = e.currentTarget.dataset || {};
            if (!this.ensureAccess()) {
                return;
            }
            if (!skuId) {
                wx.navigateTo({
                    url: `/pages/product/detail/detail?productId=${productId}`,
                });
                return;
            }
            try {
                wx.showLoading({ title: '加入中…' });
                await (0, app_1.addToCart)(Number(skuId), 1);
                wx.showToast({ title: '已加入购物车', icon: 'success' });
            }
            catch {
                wx.showToast({ title: '加入失败，请稍后再试', icon: 'none' });
            }
            finally {
                wx.hideLoading();
            }
        },
    },
});
