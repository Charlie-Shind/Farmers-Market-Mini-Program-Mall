"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
async function readPageOptions() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    return (current === null || current === void 0 ? void 0 : current.options) || {};
}
function mapRecommendProduct(item, index) {
    var _a;
    const groupBuyConfig = (_a = item.groupBuyConfig) !== null && _a !== void 0 ? _a : null;
    return {
        id: String(item.id),
        skuId: item.skuId,
        title: item.title,
        subtitle: item.subtitle || '本周热卖',
        price: item.price || '0.00',
        badge: (groupBuyConfig === null || groupBuyConfig === void 0 ? void 0 : groupBuyConfig.enabled) ? '拼团' : item.isHot ? '热卖' : '推荐',
        imageClass: ['img-orange', 'img-tomato', 'img-egg', 'img-rice', 'img-meat', 'img-gift'][index % 6],
        imageStyle: item.coverUrl
            ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
            : '',
        isPreSale: !!item.isPreSale,
        originPlace: item.originPlace || '',
        productNature: item.productNature || '',
        deliveryType: item.deliveryType,
        groupBuyConfig,
    };
}
function mapBackendProduct(item, index) {
    var _a;
    const groupBuyConfig = (_a = item.groupBuyConfig) !== null && _a !== void 0 ? _a : null;
    return {
        id: String(item.id),
        skuId: item.skuId,
        title: item.title,
        subtitle: item.subtitle || item.originPlace || '产地直供',
        price: item.minPrice || '0.00',
        badge: (groupBuyConfig === null || groupBuyConfig === void 0 ? void 0 : groupBuyConfig.enabled) ? '拼团' : item.isHot ? '热卖' : '现货',
        imageClass: ['img-orange', 'img-tomato', 'img-egg', 'img-rice', 'img-meat', 'img-gift'][index % 6],
        imageStyle: item.coverUrl
            ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
            : '',
        isPreSale: !!item.isPreSale,
        originPlace: item.originPlace || '',
        productNature: item.productNature || '',
        deliveryType: item.deliveryType,
        groupBuyConfig,
    };
}
function isOrganicProduct(item) {
    const text = `${item.title}${item.subtitle}${item.productNature || ''}`;
    return /有机|认证|organic/i.test(text);
}
function isPreSaleProduct(item) {
    var _a;
    return Boolean(item.isPreSale || Number((_a = item.deliveryType) !== null && _a !== void 0 ? _a : 1) === 2);
}
Component({
    data: {
        categoryKey: 'fruit',
        categoryName: '时令果蔬',
        categoryId: '',
        products: [],
        bannerInfo: null,
        loading: false,
        cartBadge: '',
        icons: icons_1.iconPaths,
        pageStyle: '',
        showSpecSheet: false,
        activeSpecProduct: null,
        // 筛选标签相关
        filterOptions: [
            { label: '全部', value: '' },
            { label: '有机认证', value: 'organic' },
            { label: '产地筛选', value: 'origin' },
            { label: '现货商品', value: 'instock' },
            { label: '预售商品', value: 'presale' },
        ],
        activeFilter: '',
        selectedOrigin: '',
        originPlaces: [],
        allProducts: [],
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.syncCartBadge();
        },
    },
    pageLifetimes: {
        show() {
            void this.syncCartBadge();
            void this.loadBoardState();
        },
    },
    methods: {
        async syncCartBadge() {
            try {
                const count = await (0, app_1.fetchCartItemCount)();
                this.setData({
                    cartBadge: count > 0 ? String(count) : '',
                });
            }
            catch {
                this.setData({
                    cartBadge: '',
                });
            }
        },
        async loadBoardState() {
            var _a, _b, _c;
            const options = await readPageOptions();
            const routeCategoryId = options.categoryId ? String(options.categoryId) : '';
            const routeCategoryName = options.categoryName ? decodeURIComponent(options.categoryName) : '';
            const activeKey = options.cat ? String(options.cat) : '';
            const numericCategoryId = Number(routeCategoryId);
            if (!routeCategoryId || !Number.isFinite(numericCategoryId) || numericCategoryId <= 0) {
                wx.showToast({ title: '分类未找到', icon: 'none' });
                setTimeout(() => (0, auth_route_1.navigateBackOrHome)(), 1500);
                return;
            }
            const bannerId = options.bannerId ? Number(options.bannerId) : null;
            let bannerInfo = null;
            if (bannerId != null && bannerId > 0) {
                try {
                    const banners = await (0, app_1.fetchHomeBanners)().catch(() => []);
                    const found = banners.find((b) => b.id === bannerId);
                    if (found) {
                        bannerInfo = {
                            title: found.title,
                            imageUrl: found.imageUrl,
                        };
                    }
                }
                catch (err) {
                    console.error('Fetch banner failed:', err);
                }
            }
            this.setData({
                categoryKey: activeKey,
                categoryName: routeCategoryName || '全部分类',
                categoryId: routeCategoryId,
                bannerInfo,
                loading: true,
                activeFilter: '',
                selectedOrigin: '',
                originPlaces: [],
            });
            try {
                const resCatId = numericCategoryId;
                const recResponse = await (0, app_1.fetchCategoryRecommendations)(resCatId, { period: 'week', pageSize: 8 }).catch(() => null);
                const recItems = (_a = recResponse === null || recResponse === void 0 ? void 0 : recResponse.items) !== null && _a !== void 0 ? _a : [];
                if (recItems.length) {
                    const mappedItems = recItems.map((item, index) => mapRecommendProduct(item, index));
                    const origins = Array.from(new Set(mappedItems.map((item) => item.originPlace).filter(Boolean)));
                    this.setData({
                        allProducts: mappedItems,
                        originPlaces: origins,
                    });
                    this.applyFilter();
                    return;
                }
                const response = await (0, app_1.fetchProducts)('', 8, resCatId);
                const items = (_b = response.items) !== null && _b !== void 0 ? _b : [];
                if (items.length) {
                    const mappedItems = items.map((item, index) => mapBackendProduct(item, index));
                    const origins = Array.from(new Set(mappedItems.map((item) => item.originPlace).filter(Boolean)));
                    this.setData({
                        allProducts: mappedItems,
                        originPlaces: origins,
                    });
                    this.applyFilter();
                    return;
                }
                        this.setData({
                            allProducts: [],
                            products: [],
                            originPlaces: [],
                        });
                    }
                    catch {
                        this.setData({
                    allProducts: [],
                    products: [],
                    originPlaces: [],
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        async addToCart(e) {
            var _a, _b, _c;
            const productId = ((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.product) === null || _b === void 0 ? void 0 : _b.id) || ((_c = e.currentTarget.dataset) === null || _c === void 0 ? void 0 : _c.id);
            if (!productId) {
                wx.showToast({ title: '商品不存在', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '加载中...', mask: true });
            try {
                const fullProduct = await (0, app_1.fetchProductDetail)(Number(productId));
                wx.hideLoading();
                if (fullProduct.skus && fullProduct.skus.length > 0) {
                    this.setData({
                        activeSpecProduct: fullProduct,
                        showSpecSheet: true,
                    });
                }
                else {
                    wx.showToast({ title: '该商品暂无规格', icon: 'none' });
                }
            }
            catch (err) {
                wx.hideLoading();
                wx.showToast({ title: err.message || '获取商品规格失败', icon: 'none' });
            }
        },
        onCloseSpecSheet() {
            this.setData({ showSpecSheet: false });
        },
        async onConfirmSpecSheet(e) {
            const { sku, qty } = e.detail || {};
            if (!sku) {
                wx.showToast({ title: '请选择规格', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '添加中...', mask: true });
            try {
                const result = await (0, app_1.addToCart)(Number(sku.id), qty || 1);
                wx.hideLoading();
                wx.showToast({ title: '已加入购物车', icon: 'success' });
                this.setData({
                    showSpecSheet: false,
                    cartBadge: result.cartCount > 0 ? String(result.cartCount) : '',
                });
            }
            catch (err) {
                wx.hideLoading();
                wx.showToast({ title: err.message || '加入购物车失败', icon: 'none' });
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        openProductDetail(e) {
            const { id } = e.currentTarget.dataset || {};
            if (id) {
                wx.navigateTo({
                    url: `/pages/product/detail/detail?productId=${id}`,
                });
            }
        },
        applyFilter() {
            const { allProducts, activeFilter, selectedOrigin } = this.data;
            let filtered = [...allProducts];
            if (activeFilter === 'organic') {
                filtered = filtered.filter((item) => isOrganicProduct(item));
            }
            else if (activeFilter === 'origin') {
                if (selectedOrigin) {
                    filtered = filtered.filter(item => item.originPlace === selectedOrigin);
                }
                else {
                    filtered = filtered.filter(item => !!item.originPlace);
                }
            }
            else if (activeFilter === 'instock') {
                filtered = filtered.filter((item) => !isPreSaleProduct(item));
            }
            else if (activeFilter === 'presale') {
                filtered = filtered.filter((item) => isPreSaleProduct(item));
            }
            this.setData({
                products: filtered
            });
        },
        onFilterChange(e) {
            const { value } = e.currentTarget.dataset;
            this.setData({
                activeFilter: value,
                selectedOrigin: value === 'origin' ? this.data.selectedOrigin : '',
            });
            this.applyFilter();
        },
        onSelectOrigin(e) {
            const { origin } = e.currentTarget.dataset;
            this.setData({
                selectedOrigin: origin
            });
            this.applyFilter();
        }
    },
});
