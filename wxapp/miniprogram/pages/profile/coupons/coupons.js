"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const FILTER_TABS = [
    { key: 'ALL', label: '全部', count: 0 },
    { key: 'RECEIVED', label: '可使用', count: 0 },
    { key: 'USED', label: '已使用', count: 0 },
    { key: 'EXPIRED', label: '已过期', count: 0 },
];
function formatDate(value) {
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
    return `${year}-${month}-${day}`;
}
function buildCouponView(item) {
    const status = String(item.status || '').toUpperCase();
    const statusLabel = status === 'USED' ? '已使用' : status === 'EXPIRED' ? '已过期' : '可使用';
    const statusTone = status === 'USED' ? 'coupon-status--used' : status === 'EXPIRED' ? 'coupon-status--expired' : 'coupon-status--ready';
    const start = formatDate(item.validStartAt);
    const end = formatDate(item.validEndAt || item.expiredAt);
    const periodText = start && end ? `有效期：${start} - ${end}` : end ? `有效期至：${end}` : '长期有效';
    const usableHint = status === 'USED'
        ? '已在订单中使用'
        : status === 'EXPIRED'
            ? '已过期'
            : '可在结算页使用';
    return {
        ...item,
        statusLabel,
        statusTone,
        periodText,
        usableHint,
    };
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: false,
        loadingText: '正在加载卡券',
        coupons: [],
        visibleCoupons: [],
        activeFilter: 'ALL',
        filterTabs: FILTER_TABS,
        summary: {
            total: 0,
            available: 0,
            used: 0,
            expired: 0,
        },
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.loadCoupons();
        },
    },
    methods: {
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        async loadCoupons() {
            this.setData({
                loading: true,
                loadingText: '正在加载卡券',
            });
            try {
                const coupons = await (0, app_1.fetchUserCoupons)();
                const mapped = (coupons !== null && coupons !== void 0 ? coupons : []).map(buildCouponView);
                const summary = {
                    total: mapped.length,
                    available: mapped.filter((item) => item.statusTone === 'coupon-status--ready').length,
                    used: mapped.filter((item) => item.statusTone === 'coupon-status--used').length,
                    expired: mapped.filter((item) => item.statusTone === 'coupon-status--expired').length,
                };
                const visibleCoupons = mapped.filter((item) => {
                    if (this.data.activeFilter === 'ALL') {
                        return true;
                    }
                    if (this.data.activeFilter === 'RECEIVED') {
                        return item.statusTone === 'coupon-status--ready';
                    }
                    if (this.data.activeFilter === 'USED') {
                        return item.statusTone === 'coupon-status--used';
                    }
                    return item.statusTone === 'coupon-status--expired';
                });
                var tabs = this.data.filterTabs.map(function(t) {
                    if (t.key === 'ALL') return Object.assign({}, t, { count: mapped.length });
                    if (t.key === 'RECEIVED') return Object.assign({}, t, { count: mapped.filter(function(i) { return i.statusTone === 'coupon-status--ready'; }).length });
                    if (t.key === 'USED') return Object.assign({}, t, { count: mapped.filter(function(i) { return i.statusTone === 'coupon-status--used'; }).length });
                    return Object.assign({}, t, { count: mapped.filter(function(i) { return i.statusTone === 'coupon-status--expired'; }).length });
                });
                this.setData({
                    coupons: mapped,
                    summary,
                    filterTabs: tabs,
                    visibleCoupons,
                });
            }
            catch {
                this.setData({
                    coupons: [],
                    visibleCoupons: [],
                    summary: {
                        total: 0,
                        available: 0,
                        used: 0,
                        expired: 0,
                    },
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        applyFilter(filter) {
            const visibleCoupons = this.data.coupons.filter((item) => {
                if (filter === 'ALL') {
                    return true;
                }
                if (filter === 'RECEIVED') {
                    return item.statusTone === 'coupon-status--ready';
                }
                if (filter === 'USED') {
                    return item.statusTone === 'coupon-status--used';
                }
                return item.statusTone === 'coupon-status--expired';
            });
            this.setData({
                activeFilter: filter,
                visibleCoupons,
            });
        },
        switchFilter(e) {
            const { key } = e.currentTarget.dataset || {};
            if (!key) {
                return;
            }
            this.applyFilter(key);
        },
        showCouponDetail(e) {
            var _a;
            const index = Number((_a = e.currentTarget.dataset.index) !== null && _a !== void 0 ? _a : -1);
            const coupon = this.data.visibleCoupons[index];
            if (!coupon) {
                return;
            }
            wx.showModal({
                title: coupon.name,
                content: [
                    `面额：¥${coupon.discountAmount}`,
                    `门槛：满 ${coupon.thresholdAmount} 元`,
                    `状态：${coupon.statusLabel}`,
                    coupon.periodText,
                ].join('\n'),
                showCancel: false,
            });
        },
    },
});
