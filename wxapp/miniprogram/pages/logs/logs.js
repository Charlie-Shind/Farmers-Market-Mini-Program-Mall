"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
const BROWSE_HISTORY_KEY = 'farm.browse.history.v1';
function formatDateTime(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function normalizeHistoryItems(raw) {
    const records = Array.isArray(raw) ? raw : [];
    return records
        .filter((item) => item && Number.isFinite(Number(item.productId)))
        .map((item) => ({
        ...item,
        visitedAtText: formatDateTime(item.visitedAt),
        coverStyle: item.coverUrl
            ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
            : '',
        priceLabel: item.price ? `¥${item.price}` : '¥0.00',
    }));
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        showClearSheet: false,
        history: {
            items: [],
        },
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
            void this.loadHistory();
        },
    },
    methods: {
        async loadHistory() {
            const raw = wx.getStorageSync(BROWSE_HISTORY_KEY);
            this.setData({
                history: {
                    items: normalizeHistoryItems(raw),
                },
            });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        openProductDetail(e) {
            const { productId } = e.currentTarget.dataset || {};
            if (!productId) {
                return;
            }
            wx.navigateTo({
                url: `/pages/product/detail/detail?productId=${Number(productId)}`,
            });
        },
        openClearSheet() {
            this.setData({
                showClearSheet: true,
            });
        },
        closeClearSheet() {
            this.setData({
                showClearSheet: false,
            });
        },
        stopBubble() {
            // swallow overlay taps
        },
        clearHistory() {
            wx.removeStorageSync(BROWSE_HISTORY_KEY);
            this.setData({
                showClearSheet: false,
                history: {
                    items: [],
                },
            });
            wx.showToast({ title: '已清空', icon: 'success' });
        },
    },
});
