"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function formatDateTime(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: false,
        traceCode: '',
        traceDetail: null,
        recordedAtLabel: '',
        supportTarget: null,
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
            void this.bootstrapTraceDetail();
        },
    },
    methods: {
        async resolveTraceCode() {
            var _a, _b;
            await new Promise((resolve) => setTimeout(resolve, 0));
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            return String((_b = (_a = current === null || current === void 0 ? void 0 : current.options) === null || _a === void 0 ? void 0 : _a.traceCode) !== null && _b !== void 0 ? _b : '').trim();
        },
        async bootstrapTraceDetail() {
            const traceCode = await this.resolveTraceCode();
            if (!traceCode) {
                wx.showToast({ title: '缺少溯源码', icon: 'none' });
                setTimeout(() => this.goBack(), 1200);
                return;
            }
            if (traceCode === this.data.traceCode && this.data.traceDetail) {
                return;
            }
            await this.loadTraceDetail(traceCode);
        },
        async loadSupportTarget() {
            try {
                const supportTarget = await (0, app_1.fetchChatSupportTarget)();
                this.setData({ supportTarget });
            }
            catch {
                this.setData({ supportTarget: null });
            }
        },
        async loadTraceDetail(traceCode) {
            this.setData({
                loading: true,
                traceCode,
            });
            wx.showLoading({ title: '查询中...' });
            try {
                const traceDetail = await (0, app_1.fetchTraceDetail)(traceCode);
                void this.loadSupportTarget();
                this.setData({
                    traceDetail,
                    recordedAtLabel: formatDateTime(traceDetail.recordedAt),
                });
            }
            catch {
                this.setData({
                    traceDetail: null,
                });
                wx.showToast({ title: '未找到对应溯源码', icon: 'none' });
            }
            finally {
                this.setData({ loading: false });
                wx.hideLoading();
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        openProductDetail() {
            var _a, _b;
            const productId = (_b = (_a = this.data.traceDetail) === null || _a === void 0 ? void 0 : _a.product) === null || _b === void 0 ? void 0 : _b.id;
            if (!productId) {
                return;
            }
            wx.navigateTo({
                url: `/pages/product/detail/detail?productId=${productId}`,
            });
        },
        contactMerchant() {
            const traceDetail = this.data.traceDetail;
            const target = this.data.supportTarget;
            if (!traceDetail) {
                wx.showToast({ title: '客服信息加载中', icon: 'none' });
                return;
            }
            wx.navigateTo({
                url: `/pages/chat/chat?sceneType=OFFICIAL&sceneLabel=${encodeURIComponent('来自溯源详情')}&sceneSource=${encodeURIComponent(traceDetail.product.title || (target === null || target === void 0 ? void 0 : target.sceneSource) || traceDetail.traceCode)}`,
            });
        },
    },
});
