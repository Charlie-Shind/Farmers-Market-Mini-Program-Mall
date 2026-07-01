"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const auth_route_1 = require("../../utils/auth-route");
const token_1 = require("../../services/token");
const auth_1 = require("../../services/auth");
const util_1 = require("../../utils/util");
const merchant_1 = require("../../config/merchant");
const profile_1 = require("../../services/profile");
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
        profile: {
            user: {
                name: '加载中',
                phone: '正在获取真实数据',
                avatarSrc: icons_1.iconPaths.defaultAvatar,
            },
            stats: [
                { key: 'growth', label: '成长值', value: '--' },
                { key: 'points', label: '积分值', value: '--' },
            ],
            orders: [
                { key: 'pay', label: '待付款', icon: icons_1.iconPaths.wallet },
                { key: 'ship', label: '待发货', icon: icons_1.iconPaths.truck },
                { key: 'receive', label: '待收货', icon: icons_1.iconPaths.package },
                { key: 'comment', label: '待评价', icon: icons_1.iconPaths.comment },
                { key: 'refund', label: '售后/退款', icon: icons_1.iconPaths.refund },
            ],
            services: [
                { key: 'address', label: '地址管理', icon: icons_1.iconPaths.address },
                { key: 'coupon', label: '卡券包', icon: icons_1.iconPaths.coupon },
                { key: 'points', label: '我的积分', icon: icons_1.iconPaths.points },
                { key: 'favorite', label: '我的收藏', icon: icons_1.iconPaths.favorite },
                { key: 'history', label: '浏览记录', icon: icons_1.iconPaths.history },
                { key: 'follow', label: '我的关注', icon: icons_1.iconPaths.favorite },
                { key: 'help', label: '联系客服', icon: icons_1.iconPaths.phone },
                { key: 'feedback', label: '意见反馈', icon: icons_1.iconPaths.feedback },
            ],
        },
        authKind: '',
        icons: icons_1.iconPaths,
        redirecting: false,
        addresses: [],
        coupons: [],
        pointLogs: [],
        addressPreview: [],
        couponPreview: [],
        pointPreview: [],
        favoriteCount: 0,
        orderSummary: {
            total: 0,
            pay: 0,
            ship: 0,
            receive: 0,
            comment: 0,
            refund: 0,
        },
        toastVisible: false,
        toastMessage: '',
        toastType: 'info',
        cartBadge: '',
        messageBadge: '',
        userRole: '',
        activeSheet: '',
        sheetTitle: '',
    },
    lifetimes: {
        attached() {
            this.syncAuthState();
            if (this.data.authKind === 'access') {
                this.loadProfileData();
            }
        },
    },
    pageLifetimes: {
        show() {
            var _a, _b;
            this.syncAuthState();
            if (this.data.authKind === 'access') {
                // 静默刷新 Token，确保 role 始终是最新的（如商户审核刚通过）
                this.silentRefreshRole();
                this.loadProfileData();
                this.syncCartBadge();
                this.syncMessageBadge();
            }
            else {
                this.setData({
                    cartBadge: '',
                    messageBadge: '',
                    redirecting: false,
                });
            }
            const tabBar = (_b = (_a = this).getTabBar) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (tabBar) {
                tabBar.setData({
                    active: 'profile',
                });
                if (typeof tabBar.syncFromRoute === 'function') {
                    tabBar.syncFromRoute();
                }
            }
        },
    },
    methods: {
        ensureAccess() {
            if (this.data.authKind === 'access') {
                if (this.data.redirecting) {
                    this.setData({
                        redirecting: false,
                    });
                }
                return true;
            }
            if (this.data.redirecting) {
                return false;
            }
            this.setData({
                redirecting: true,
            });
            this.goLogin('/pages/profile/home/home');
            return false;
        },
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
                const res = await (0, app_1.fetchUnreadMessageCount)();
                const count = Number(res.unreadCount || 0);
                this.setData({
                    messageBadge: count > 99 ? '99+' : count > 0 ? String(count) : '',
                });
            }
            catch {
                this.setData({
                    messageBadge: '',
                });
            }
        },
        syncAuthState() {
            const authKind = (0, token_1.getAuthTokenType)();
            const userRole = (0, token_1.getAuthUserRole)();
            this.setData({
                authKind,
                userRole,
            });
            if (authKind !== 'access') {
                this.setData({
                    'profile.user.name': '点击登录',
                    'profile.user.phone': '登录后查看更多',
                    'profile.user.avatarSrc': icons_1.iconPaths.defaultAvatar,
                });
            }
        },
        async silentRefreshRole() {
            var _a;
            // 仅在 access 会话时尝试静默刷新，以同步后端最新角色
            if ((0, token_1.getAuthTokenType)() !== 'access') {
                return;
            }
            try {
                const session = await (0, auth_1.refreshToken)();
                if (session && ((_a = session.user) === null || _a === void 0 ? void 0 : _a.role)) {
                    // refreshToken 内部已调用 setToken，这里额外写入以确保 globalData 同步
                    (0, token_1.setToken)(session.accessToken, session.tokenType === 'guest' ? 'guest' : 'access', session.user.role);
                    // 重新同步页面状态（角色可能已从 USER 升级到 MERCHANT）
                    this.syncAuthState();
                }
            }
            catch {
                // 静默刷新失败不影响主流程
            }
        },
        async loadProfileData() {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                const [me, ordersPage, addresses, userCoupons, pointLogs, favorites] = await Promise.all([
                    (0, app_1.fetchMe)(),
                    (0, app_1.fetchOrders)({ page: 1, pageSize: 50 }),
                    (0, app_1.fetchAddresses)(),
                    (0, app_1.fetchUserCoupons)(),
                    (0, app_1.fetchPointsLogs)(),
                    (0, app_1.fetchFavorites)({ page: 1, pageSize: 20 }),
                ]);
                const user = me.user;
                const profile = me.profile;
                const orders = (_a = ordersPage.items) !== null && _a !== void 0 ? _a : [];
                const addressPreview = (addresses !== null && addresses !== void 0 ? addresses : []).slice(0, 2).map((item) => ({
                    id: item.id,
                    title: `${item.receiverName} ${(0, util_1.maskPhone)(item.receiverMobile) || item.receiverMobile}`,
                    desc: `${item.province}${item.city}${item.district}${item.detailAddress}`,
                    tag: item.isDefault ? '默认地址' : '收货地址',
                }));
                const couponPreview = (userCoupons !== null && userCoupons !== void 0 ? userCoupons : []).slice(0, 3).map((item) => ({
                    id: item.userCouponId,
                    couponId: item.couponId,
                    name: item.name,
                    desc: `满${item.thresholdAmount}减${item.discountAmount}`,
                    tag: item.status === 'USED' ? '已使用' : item.status === 'EXPIRED' ? '已过期' : '已拥有',
                    received: item.status === 'RECEIVED',
                    status: item.status,
                }));
                const pointPreview = (pointLogs !== null && pointLogs !== void 0 ? pointLogs : []).slice(0, 3).map((item) => ({
                    id: item.id,
                    title: item.changeType,
                    desc: `${item.sourceType}${item.sourceNo ? ` · ${item.sourceNo}` : ''}${item.remark ? ` · ${item.remark}` : ''}`,
                    points: item.points,
                    createdAt: formatDateTime(item.createdAt),
                }));
                const orderSummary = {
                    total: (_b = ordersPage.total) !== null && _b !== void 0 ? _b : orders.length,
                    pay: orders.filter((item) => Number(item.payStatus) === 0).length,
                    ship: orders.filter((item) => Number(item.payStatus) === 1 && Number(item.deliveryStatus) === 0).length,
                    receive: orders.filter((item) => Number(item.payStatus) === 1 && Number(item.deliveryStatus) === 1).length,
                    comment: orders.filter((item) => Number(item.payStatus) === 1 && Number(item.deliveryStatus) === 2).length,
                    refund: orders.filter((item) => String(item.status) === 'REFUNDING' || String(item.status) === '售后中').length,
                };
                // Check local draft for newly uploaded avatar (instant refresh)
                const draft = (0, profile_1.loadProfileDraft)();
                const isHttp = (url) => url ? /^(https?:)?\/\//.test(url) : false;
                const cachedAvatar = isHttp(draft === null || draft === void 0 ? void 0 : draft.avatarUrl) ? draft.avatarUrl : '';
                const serverAvatar = isHttp(profile === null || profile === void 0 ? void 0 : profile.avatarUrl)
                    ? profile === null || profile === void 0 ? void 0 : profile.avatarUrl
                    : isHttp(user.avatarUrl)
                        ? user.avatarUrl
                        : '';
                this.setData({
                    profile: {
                        user: {
                            name: (profile === null || profile === void 0 ? void 0 : profile.nickname) || user.nickname || '我的资料',
                            phone: (0, util_1.maskPhone)((profile === null || profile === void 0 ? void 0 : profile.mobile) || user.mobile) || '登录后查看手机号',
                            avatarSrc: cachedAvatar || serverAvatar || icons_1.iconPaths.defaultAvatar,
                        },
                        stats: [
                            { key: 'growth', label: '成长值', value: String((_d = (_c = favorites.total) !== null && _c !== void 0 ? _c : favorites.items.length) !== null && _d !== void 0 ? _d : 0) },
                            { key: 'points', label: '积分值', value: String((_f = (_e = ordersPage.total) !== null && _e !== void 0 ? _e : orders.length) !== null && _f !== void 0 ? _f : 0) },
                        ],
                        orders: this.data.profile.orders,
                        services: this.data.profile.services,
                    },
                    addresses,
                    coupons: (userCoupons !== null && userCoupons !== void 0 ? userCoupons : []).map(item => ({ ...item, received: item.status === 'RECEIVED', tag: item.status === 'USED' ? '已使用' : item.status === 'EXPIRED' ? '已过期' : '可使用' })),
                    pointLogs,
                    addressPreview,
                    couponPreview,
                    pointPreview,
                    favoriteCount: (_h = (_g = favorites.total) !== null && _g !== void 0 ? _g : favorites.items.length) !== null && _h !== void 0 ? _h : 0,
                    orderSummary,
                });
            }
            catch {
                // Keep the existing shell when the backend is temporarily unavailable.
            }
        },
        setToast(message, type = 'info') {
            this.setData({
                toastMessage: message,
                toastType: type,
                toastVisible: true,
            });
        },
        hideToast() {
            this.setData({
                toastVisible: false,
            });
        },
        handleProfileAvatarError() {
            if (this.data.profile.user.avatarSrc === icons_1.iconPaths.defaultAvatar) {
                return;
            }
            this.setData({
                'profile.user.avatarSrc': icons_1.iconPaths.defaultAvatar,
            });
        },
        goLogin(redirectPath = '/pages/profile/home/home') {
            wx.navigateTo({
                url: (0, auth_route_1.buildProfileLoginUrl)(redirectPath),
            });
        },
        openUserCenter() {
            if (!this.ensureAccess()) {
                return;
            }
            wx.navigateTo({
                url: '/pages/profile/home/home',
            });
        },
        handleHeaderAction(e) {
            var _a, _b;
            (_b = (_a = e).stopPropagation) === null || _b === void 0 ? void 0 : _b.call(_a);
            const { action } = e.currentTarget.dataset || {};
            if (action === 'scan') {
                wx.showToast({ title: '扫码功能开发中', icon: 'none' });
                return;
            }
            if (!this.ensureAccess()) {
                return;
            }
            if (action === 'settings') {
                wx.navigateTo({
                    url: '/pages/profile/settings/settings',
                });
                return;
            }
            if (action === 'message') {
                wx.navigateTo({
                    url: '/pages/message/message',
                });
            }
        },
        openProtectedSection(e) {
            const { key } = e.currentTarget.dataset || {};
            if (!this.ensureAccess()) {
                return;
            }
            if (key === 'message') {
                wx.navigateTo({
                    url: '/pages/message/message',
                });
                return;
            }
            if (key === 'address') {
                wx.navigateTo({
                    url: '/pages/address/list/list',
                });
                return;
            }
            if (key === 'favorite') {
                wx.navigateTo({
                    url: '/pages/favorite/list/list',
                });
                return;
            }
            if (key === 'history') {
                wx.navigateTo({
                    url: '/pages/logs/logs',
                });
                return;
            }
            if (key === 'follow') {
                wx.navigateTo({
                    url: '/pages/favorite/list/list',
                });
                return;
            }
            if (key === 'help') {
                wx.showModal({
                    title: '未开放',
                    content: '联系客服功能暂未开放',
                    showCancel: false,
                });
                return;
            }
            if (key === 'feedback') {
                wx.navigateTo({
                    url: '/pages/profile/feedback/feedback',
                });
                return;
            }
            if (['orders', 'pay', 'ship', 'receive', 'comment', 'refund'].includes(key || '')) {
                const orderType = key === 'orders' ? 'all' : key;
                wx.navigateTo({
                    url: `/pages/order/list/list?type=${orderType}`,
                });
                return;
            }
            if (key === 'coupon') {
                wx.navigateTo({
                    url: '/pages/profile/coupons/coupons',
                });
                return;
            }
            if (key === 'points') {
                wx.navigateTo({
                    url: '/pages/marketing/points/exchange',
                });
                return;
            }
            wx.navigateTo({ url: '/pages/profile/home/home' });
        },
        closeSheet() {
            this.setData({
                activeSheet: '',
            });
        },
        preventBubble() {
            // Prevent event bubbling to overlay
        },
        preventTouchMove() {
            // Prevent scrolling of body underneath drawer
        },
        async goToApply() {
            try {
                const { fetchMerchantEntryStatus } = await Promise.resolve().then(() => __importStar(require('../../services/app')));
                const status = await fetchMerchantEntryStatus();
                if (!(status === null || status === void 0 ? void 0 : status.enabled)) {
                    wx.showToast({ title: '请先完成手机号绑定后再申请入驻', icon: 'none' });
                    return;
                }
            }
            catch { /* 请求失败放行，不阻塞用户 */ }
            wx.navigateTo({
                url: '/pages/profile/apply/apply',
            });
        },
        goToMerchantDashboard() {
            wx.reLaunch({
                url: merchant_1.merchantHomeRoute,
            });
        },
        handleLogout() {
            wx.showModal({
                title: '提示',
                content: '确定要退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        (0, auth_1.clearUserLocalState)();
                        (0, token_1.setGuestMode)();
                        wx.showToast({
                            title: '已退出登录',
                            icon: 'success',
                        });
                        setTimeout(() => {
                            wx.reLaunch({
                                url: '/pages/index/index',
                            });
                        }, 800);
                    }
                },
            });
        },
    },
});
