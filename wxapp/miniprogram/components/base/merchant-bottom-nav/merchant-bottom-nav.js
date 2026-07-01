"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const merchant_1 = require("../../../config/merchant");
function resolveActiveKeyFromRoute() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (!current) {
        return 'home';
    }
    const route = current.route || '';
    for (const item of merchant_1.merchantNavItems) {
        if (route.startsWith(item.url.replace(/^\//, '').replace(/\/?$/, ''))) {
            return item.key;
        }
    }
    return 'home';
}
function normalizeActiveKey(value) {
    if (value === 'dashboard') {
        return 'home';
    }
    if (value === 'messages') {
        return 'chat';
    }
    if (value === 'products') {
        return 'inventory';
    }
    if (value === 'shop') {
        return 'account';
    }
    return value;
}
Component({
    properties: {
        active: {
            type: String,
            value: 'home',
            observer(value) {
                this.syncActiveKey(normalizeActiveKey(value));
            },
        },
    },
    data: {
        activeKey: 'home',
        items: merchant_1.merchantNavItems,
    },
    lifetimes: {
        attached() {
            this.syncActiveKey(normalizeActiveKey(this.properties.active || 'home'));
        },
    },
    pageLifetimes: {
        show() {
            this.syncActiveKey(normalizeActiveKey(this.properties.active || resolveActiveKeyFromRoute()));
        },
    },
    methods: {
        syncActiveKey(preferred) {
            const resolved = preferred !== 'home' ? preferred : resolveActiveKeyFromRoute();
            this.setData({
                activeKey: resolved,
            });
        },
        go(e) {
            const { url, key } = e.currentTarget.dataset || {};
            if (!url || !key) {
                return;
            }
            this.setData({
                activeKey: key,
            });
            this.triggerEvent('change', {
                active: key,
                url,
            });
            wx.reLaunch({
                url,
            });
        },
    },
});
