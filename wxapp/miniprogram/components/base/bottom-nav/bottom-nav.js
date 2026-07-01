"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_route_1 = require("../../../utils/auth-route");
const baseItems = [
    { key: 'home', label: '首页', icon: 'home', url: '/pages/index/index' },
    { key: 'category', label: '分类', icon: 'category', url: '/pages/category/category' },
    { key: 'marketing', label: '发现', icon: 'discover', url: '/pages/marketing/marketing' },
    { key: 'cart', label: '购物车', icon: 'cart', url: '/pages/cart/cart' },
    { key: 'profile', label: '我的', icon: 'profile', url: '/pages/profile/profile' },
];
function normalizeBadge(value) {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return String(value);
    }
    if (parsed <= 0) {
        return '';
    }
    if (parsed > 99) {
        return '99+';
    }
    return String(parsed);
}
Component({
    properties: {
        active: {
            type: String,
            value: 'home',
        },
        cartBadge: {
            type: String,
            value: '',
            observer() {
                this.syncItems();
            },
        },
    },
    data: {
        items: baseItems,
    },
    lifetimes: {
        attached() {
            this.syncItems();
        },
    },
    methods: {
        syncItems() {
            const cartBadge = normalizeBadge(this.data.cartBadge);
            this.setData({
                items: baseItems.map((item) => (item.key === 'cart' ? { ...item, badge: cartBadge } : item)),
            });
        },
        go(e) {
            const { url } = e.currentTarget.dataset || {};
            if (!url) {
                return;
            }
            if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)(url)) {
                return;
            }
            wx.reLaunch({
                url,
            });
        },
    },
});
