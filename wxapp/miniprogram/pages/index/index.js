"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const location_1 = require("../../services/location");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
const money_1 = require("../../utils/money");
let hasPromptedThisSession = false;
function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
const GOODS_IMAGE_CLASSES = ['orange-img', 'egg-img', 'tomato-img', 'rice-img', 'oil-img', 'date-img'];
const QUICK_ENTRY_IMAGE_PATHS = [
    '/assets/quick/1.png',
    '/assets/quick/2.png',
    '/assets/quick/3.png',
    '/assets/quick/4.png',
];
const RANK_TABS = [
    { key: 'sales', label: '销量TOP' },
    { key: 'new', label: '新品TOP' },
    { key: 'good', label: '好评TOP' },
];
function resolveHomeEntryRoute(linkType, _linkId, title) {
    if (linkType === 'product' && _linkId) {
        return `/pages/product/detail/detail?productId=${_linkId}`;
    }
    if (linkType === 'activity') {
        return `/pages/activity/topic/topic?title=${encodeURIComponent(title || '活动专题')}`;
    }
    if (linkType === 'flashSale') {
        return `/pages/quick/flash-sale/index?title=${encodeURIComponent(title || '限时秒杀')}`;
    }
    if (linkType === 'groupBuy') {
        return `/pages/quick/group-buy-products/index?title=${encodeURIComponent(title || '拼团领券')}`;
    }
    if (linkType === 'gift') {
        return `/pages/quick/gift-zone/index?title=${encodeURIComponent(title || '礼盒专区')}`;
    }
    if (linkType === 'origin') {
        return `/pages/quick/origin-zone/index?title=${encodeURIComponent(title || '产地直供')}`;
    }
    if (linkType === 'category') {
        return '/pages/category/category';
    }
    if (linkType === 'coupon') {
        return '/pages/marketing/marketing';
    }
    if (linkType === 'points') {
        return '/pages/profile/profile';
    }
    return '';
}
function truncateLocationText(text, maxChars = 9) {
    const chars = Array.from(String(text || ''));
    if (chars.length <= maxChars) {
        return chars.join('');
    }
    return `${chars.slice(0, maxChars).join('')}…`;
}
Component({
    data: {
        home: {
            location: location_1.DEFAULT_LOCATION_LABEL,
            locationDisplay: truncateLocationText(location_1.DEFAULT_LOCATION_LABEL),
            searchPlaceholder: '搜索商品名称',
            locationModeLabel: '当前定位 · 自动',
            banners: [],
            activeBannerIndex: 0,
            quickEntries: [],
            recommendations: [],
            rankTabs: RANK_TABS,
            rankDataSets: {},
            activeRankTab: 'sales',
            hotList: [],
            unreadMessageCount: 0,
        },
        icons: icons_1.iconPaths,
        pageStyle: '',
        topSearchStyle: '',
        cartBadge: '',
        locationMode: 'auto',
        isLocating: false,
        showSpecSheet: false,
        activeSpecProduct: null,
    },
    lifetimes: {
        attached() {
            if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/index/index')) {
                return;
            }
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(8),
                topSearchStyle: (0, page_layout_1.buildHeaderSafeRightStyle)(16),
            });
            this.loadHomeData();
            this.syncMessageBadge();
        },
    },
    pageLifetimes: {
        show() {
            var _a, _b;
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(8),
            });
            this.loadHomeData();
            this.syncCartBadge();
            this.syncMessageBadge();
            this.autoUpdateLocationIfEnabled();
            this.checkLocationChangePrompt();
            const tabBar = (_b = (_a = this).getTabBar) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (tabBar) {
                tabBar.setData({
                    active: 'home',
                });
                if (typeof tabBar.syncFromRoute === 'function') {
                    tabBar.syncFromRoute();
                }
            }
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
        async syncMessageBadge() {
            try {
                const { unreadCount } = await (0, app_1.fetchUnreadMessageCount)();
                this.setData({
                    unreadMessageCount: unreadCount > 0 ? unreadCount : 0,
                });
            }
            catch {
                this.setData({
                    unreadMessageCount: 0,
                });
            }
        },
        async loadHomeData() {
            var _a;
            try {
                const selectedLocation = (0, location_1.loadSelectedLocation)();
                const [banners, quickEntries, hotProducts, productsPage] = await Promise.all([
                    (0, app_1.fetchHomeBanners)().catch(() => []),
                    (0, app_1.fetchHomeQuickEntries)(),
                    (0, app_1.fetchHomeHotProducts)(),
                    (0, app_1.fetchProducts)('', 6),
                ]);
                const bannerViews = (banners || []).map((b) => {
                    var _a, _b, _c, _d, _e, _f;
                    return ({
                        id: (_b = (_a = b.id) !== null && _a !== void 0 ? _a : b.bannerId) !== null && _b !== void 0 ? _b : 0,
                        title: (_c = b.title) !== null && _c !== void 0 ? _c : '',
                        imageUrl: (_d = b.imageUrl) !== null && _d !== void 0 ? _d : '',
                        linkType: (_e = b.linkType) !== null && _e !== void 0 ? _e : '',
                        linkId: (_f = b.linkId) !== null && _f !== void 0 ? _f : null,
                    });
                });
                const products = (_a = productsPage.items) !== null && _a !== void 0 ? _a : [];
                const hotProductMap = new Map();
                hotProducts.forEach((item) => {
                    hotProductMap.set(String(item.id), item);
                });
                const mergedProducts = products.map((product) => {
                    var _a, _b, _c, _d;
                    const hot = hotProductMap.get(String(product.id)) || {};
                    return {
                        ...product,
                        saleCount: Number((_c = (_b = (_a = product.saleCount) !== null && _a !== void 0 ? _a : hot.saleCount) !== null && _b !== void 0 ? _b : hot.salesCount) !== null && _c !== void 0 ? _c : 0),
                        createdAt: product.createdAt || hot.createdAt || '',
                        isHot: Boolean((_d = product.isHot) !== null && _d !== void 0 ? _d : hot.isHot),
                    };
                });
                const locationMode = (selectedLocation === null || selectedLocation === void 0 ? void 0 : selectedLocation.source) || 'auto';
                const locationModeLabel = locationMode === 'manual' ? '当前定位 · 手动' : '当前定位 · 自动';
                const buildRankView = (product, index, _tabKey) => {
                    var _a;
                    return {
                        id: String(product.id),
                        skuId: product.skuId,
                        rank: String(index + 1),
                        title: product.title,
                        desc: product.subtitle || product.originPlace || '热销商品',
                        price: `¥${(0, money_1.formatMoneyDisplay)(product.minPrice)}`,
                        sales: `已售 ${Number((_a = product.saleCount) !== null && _a !== void 0 ? _a : 0).toLocaleString('zh-CN')}件`,
                        imageClass: GOODS_IMAGE_CLASSES[(index + 3) % GOODS_IMAGE_CLASSES.length],
                        coverUrl: product.coverUrl,
                        icon: product.icon || '',
                        imageStyle: product.coverUrl
                            ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
                            : '',
                    };
                };
                const salesSorted = [...mergedProducts]
                    .sort((a, b) => { var _a, _b; return Number((_a = b.saleCount) !== null && _a !== void 0 ? _a : 0) - Number((_b = a.saleCount) !== null && _b !== void 0 ? _b : 0) || Number(b.isHot) - Number(a.isHot); })
                    .slice(0, 3);
                const newSorted = [...mergedProducts]
                    .sort((a, b) => { var _a, _b; return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() || Number((_a = b.saleCount) !== null && _a !== void 0 ? _a : 0) - Number((_b = a.saleCount) !== null && _b !== void 0 ? _b : 0); })
                    .slice(0, 3);
                const goodSorted = [...mergedProducts]
                    .sort((a, b) => { var _a, _b; return Number(b.isHot) - Number(a.isHot) || Number((_a = b.saleCount) !== null && _a !== void 0 ? _a : 0) - Number((_b = a.saleCount) !== null && _b !== void 0 ? _b : 0) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(); })
                    .slice(0, 3);
                this.setData({
                    locationMode,
                    home: {
                        location: (selectedLocation === null || selectedLocation === void 0 ? void 0 : selectedLocation.name) || (selectedLocation === null || selectedLocation === void 0 ? void 0 : selectedLocation.address) || location_1.DEFAULT_LOCATION_LABEL,
                        locationDisplay: truncateLocationText((selectedLocation === null || selectedLocation === void 0 ? void 0 : selectedLocation.name) || (selectedLocation === null || selectedLocation === void 0 ? void 0 : selectedLocation.address) || location_1.DEFAULT_LOCATION_LABEL),
                        searchPlaceholder: '搜索商品名称',
                        locationModeLabel,
                        banners: bannerViews,
                        activeBannerIndex: 0,
                        quickEntries: quickEntries.map((entry, index) => ({
                            ...entry,
                            label: entry.linkType === 'origin' ? '产地直销' : entry.title,
                            icon: QUICK_ENTRY_IMAGE_PATHS[index] || icons_1.iconPaths[entry.icon] || icons_1.iconPaths.flash,
                        })),
                        recommendations: products.slice(0, 3).map((product, index) => ({
                            id: String(product.id),
                            skuId: product.skuId,
                            title: product.title,
                            desc: product.subtitle || product.originPlace || '优选好货',
                            price: `¥${(0, money_1.formatMoneyDisplay)(product.minPrice)}`,
                            imageClass: GOODS_IMAGE_CLASSES[index % GOODS_IMAGE_CLASSES.length],
                            coverUrl: product.coverUrl,
                            imageStyle: product.coverUrl ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;` : '',
                        })),
                        rankTabs: RANK_TABS,
                        rankDataSets: {
                            sales: salesSorted.map((item, index) => buildRankView(item, index, 'sales')),
                            new: newSorted.map((item, index) => buildRankView(item, index, 'new')),
                            good: goodSorted.map((item, index) => buildRankView(item, index, 'good')),
                        },
                        activeRankTab: 'sales',
                        hotList: salesSorted.map((item, index) => buildRankView(item, index, 'sales')),
                        unreadMessageCount: this.data.unreadMessageCount,
                    },
                });
            }
            catch {
                // Keep the initial shell data when the backend is temporarily unavailable.
            }
        },
        openLogin() {
            wx.navigateTo({
                url: (0, auth_route_1.buildLoginUrl)('/pages/index/index'),
            });
        },
        openSearch() {
            wx.navigateTo({
                url: '/pages/search/search',
            });
        },
        onBannerChange(e) {
            const { current } = e.detail || {};
            this.setData({
                activeBannerIndex: typeof current === 'number' ? current : 0,
            });
        },
        openHomeEntry(e) {
            const { linkType, linkId, title } = e.currentTarget.dataset || {};
            const route = resolveHomeEntryRoute(linkType, linkId != null ? Number(linkId) : null, title);
            if (route) {
                wx.navigateTo({
                    url: route,
                });
            }
        },
        openSection(e) {
            const { label, target, scene } = e.currentTarget.dataset || {};
            if (label === '定位') {
                this.startManualLocation();
                return;
            }
            if (label === '消息') {
                wx.navigateTo({ url: '/pages/message/message' });
                return;
            }
            if (target === 'category') {
                wx.navigateTo({ url: '/pages/category/category' });
                return;
            }
            if (target === 'product-list') {
                const sceneParam = scene ? `&scene=${encodeURIComponent(scene)}` : '';
                wx.navigateTo({
                    url: `/pages/product/list/list?title=${encodeURIComponent(label || '商品列表')}${sceneParam}`,
                });
                return;
            }
            if (target === 'marketing') {
                wx.navigateTo({ url: '/pages/marketing/marketing' });
                return;
            }
            return;
        },
        switchRankTab(e) {
            const { key } = e.currentTarget.dataset || {};
            if (!key) {
                return;
            }
            const rankDataSets = this.data.home.rankDataSets || {};
            this.setData({
                'home.activeRankTab': key,
                'home.hotList': rankDataSets[key] || [],
            });
        },
        async addHomeProductToCart(e) {
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
            var _a, _b;
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
                const tabBar = (_b = (_a = this).getTabBar) === null || _b === void 0 ? void 0 : _b.call(_a);
                if (tabBar && typeof tabBar.syncFromRoute === 'function') {
                    tabBar.syncFromRoute();
                }
            }
            catch (err) {
                wx.hideLoading();
                wx.showToast({ title: err.message || '加入购物车失败', icon: 'none' });
            }
        },
        openProductDetail(e) {
            const { id } = e.currentTarget.dataset || {};
            if (id) {
                wx.navigateTo({
                    url: `/pages/product/detail/detail?productId=${id}`,
                });
            }
        },
        async autoUpdateLocationIfEnabled() {
            const selectedLocation = (0, location_1.loadSelectedLocation)();
            if (selectedLocation) {
                const locationText = selectedLocation.name || selectedLocation.address;
                this.setData({
                    'home.location': locationText,
                    'home.locationDisplay': truncateLocationText(locationText),
                    'home.locationModeLabel': '当前定位 · 手动',
                    locationMode: 'manual',
                });
            }
            else {
                this.setData({
                    'home.location': location_1.DEFAULT_LOCATION_LABEL,
                    'home.locationDisplay': truncateLocationText(location_1.DEFAULT_LOCATION_LABEL),
                    'home.locationModeLabel': '当前定位 · 自动',
                    locationMode: 'auto',
                });
            }
        },
        toggleLocationMode() {
            // 废弃无用的自动定位切换，仅作接口占位
        },
        checkLocationChangePrompt() {
            if (hasPromptedThisSession) {
                return;
            }
            const selected = (0, location_1.loadSelectedLocation)();
            const isDefault = !selected || selected.name === location_1.DEFAULT_LOCATION_LABEL;
            if (isDefault) {
                hasPromptedThisSession = true;
                wx.showModal({
                    title: '位置提示',
                    content: '您当前处于默认位置，是否前往进行定位以获取真实周边商品？',
                    confirmText: '重新定位',
                    cancelText: '暂不',
                    success: (modalRes) => {
                        if (modalRes.confirm) {
                            this.startManualLocation();
                        }
                    },
                });
                return;
            }
            wx.getSetting({
                success: (res) => {
                    if (!res.authSetting['scope.userLocation']) {
                        return;
                    }
                    const getGPS = () => {
                        return new Promise((resolve, reject) => {
                            const fuzzy = wx.getFuzzyLocation;
                            const options = {
                                type: 'gcj02',
                                success: resolve,
                                fail: () => {
                                    wx.getLocation({
                                        type: 'gcj02',
                                        success: resolve,
                                        fail: reject,
                                    });
                                },
                            };
                            if (typeof fuzzy === 'function') {
                                fuzzy(options);
                            }
                            else {
                                wx.getLocation(options);
                            }
                        });
                    };
                    getGPS().then((gps) => {
                        const dist = getDistance(gps.latitude, gps.longitude, selected.latitude, selected.longitude);
                        if (dist > 5000) { // 超过 5 公里
                            hasPromptedThisSession = true;
                            wx.showModal({
                                title: '位置提示',
                                content: '检测到您当前的物理位置已发生变动，是否重新选点定位？',
                                confirmText: '重新定位',
                                cancelText: '暂不',
                                success: (modalRes) => {
                                    if (modalRes.confirm) {
                                        this.startManualLocation();
                                    }
                                },
                            });
                        }
                    }).catch((err) => {
                        console.error('Check location change GPS failed:', err);
                    });
                },
            });
        },
        startManualLocation() {
            wx.getSetting({
                success: (settingRes) => {
                    const choose = () => {
                        wx.chooseLocation({
                            success: (chooseRes) => {
                                const lat = Number(chooseRes.latitude);
                                const lng = Number(chooseRes.longitude);
                                const manualLoc = {
                                    source: 'manual',
                                    name: chooseRes.name || '选择的位置',
                                    address: chooseRes.address || '',
                                    latitude: lat,
                                    longitude: lng,
                                    updatedAt: Date.now(),
                                };
                                (0, location_1.saveSelectedLocation)(manualLoc);
                                const locationText = manualLoc.name || manualLoc.address;
                                this.setData({
                                    'home.location': locationText,
                                    'home.locationDisplay': truncateLocationText(locationText),
                                    'home.locationModeLabel': '当前定位 · 手动',
                                    locationMode: 'manual',
                                });
                                wx.showToast({ title: '已更新位置', icon: 'success' });
                                void this.loadHomeData();
                            },
                            fail: (err) => {
                                console.error('chooseLocation failed', err);
                            }
                        });
                    };
                    if (settingRes.authSetting['scope.userLocation']) {
                        choose();
                    }
                    else {
                        wx.authorize({
                            scope: 'scope.userLocation',
                            success: choose,
                            fail: () => {
                                wx.showModal({
                                    title: '需要定位权限',
                                    content: '请在设置中允许小程序使用定位权限以选择位置。',
                                    confirmText: '去设置',
                                    success: (modalRes) => {
                                        if (modalRes.confirm) {
                                            wx.openSetting({
                                                success: (settingRes2) => {
                                                    if (settingRes2.authSetting['scope.userLocation']) {
                                                        choose();
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            });
        },
    },
});
