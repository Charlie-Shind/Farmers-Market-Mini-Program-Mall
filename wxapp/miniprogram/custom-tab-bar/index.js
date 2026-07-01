"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../services/app");
const CUSTOMER_ITEMS = [
    { key: 'home', label: '首页', icon: 'home', url: '/pages/index/index' },
    { key: 'category', label: '分类', icon: 'category', url: '/pages/category/category' },
    { key: 'marketing', label: '发现', icon: 'discover', url: '/pages/marketing/marketing' },
    { key: 'cart', label: '购物车', icon: 'cart', url: '/pages/cart/cart' },
    { key: 'profile', label: '我的', icon: 'profile', url: '/pages/profile/profile' },
];
function normalizeRoute(route) {
    return route.startsWith('/') ? route : `/${route}`;
}
function normalizeBadge(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return '';
    }
    if (value > 99) {
        return '99+';
    }
    return String(value);
}
Component({
    data: {
        active: 'home',
        visible: true,
        items: CUSTOMER_ITEMS,
    },
    lifetimes: {
        attached() {
            void this.syncFromRoute();
        },
    },
    pageLifetimes: {
        show() {
            (0, app_1.invalidateCartItemCount)();
            void this.syncFromRoute();
        },
    },
    methods: {
        syncFromRoute() {
            var _a;
            const pages = getCurrentPages();
            if (!pages || pages.length === 0) {
                return;
            }
            const currentRoute = normalizeRoute(((_a = pages[pages.length - 1]) === null || _a === void 0 ? void 0 : _a.route) || '');
            const activeItem = CUSTOMER_ITEMS.find((item) => normalizeRoute(item.url) === currentRoute);
            const visible = !!activeItem;
            const currentActive = this.data.active;
            const targetActive = (activeItem === null || activeItem === void 0 ? void 0 : activeItem.key) || currentActive || 'home';
            // Use wx.nextTick to defer the rendering updates. This prevents the WeChat rendering engine
            // from encountering "expect FLOW_CREATE_NODE but get another" errors due to page-transition vs custom-tab-bar state updates.
            wx.nextTick(async () => {
                const updateData = {
                    visible,
                };
                if (this.data.active !== targetActive) {
                    updateData.active = targetActive;
                }
                try {
                    const count = await (0, app_1.fetchCartItemCount)();
                    const cartBadge = normalizeBadge(Number(count || 0));
                    const nextItems = CUSTOMER_ITEMS.map((item) => {
                        const newItem = { ...item };
                        if (newItem.key === 'cart') {
                            newItem.badge = cartBadge;
                        }
                        return newItem;
                    });
                    updateData.items = nextItems;
                }
                catch {
                    const nextItems = CUSTOMER_ITEMS.map((item) => {
                        const newItem = { ...item };
                        if (newItem.key === 'cart') {
                            newItem.badge = '';
                        }
                        return newItem;
                    });
                    updateData.items = nextItems;
                }
                this.setData(updateData);
            });
        },
        go(e) {
            const { url } = e.currentTarget.dataset || {};
            if (!url) {
                return;
            }
            wx.switchTab({
                url,
            });
        },
    },
});
