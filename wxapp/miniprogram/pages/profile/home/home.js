"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const merchant_1 = require("../../../services/merchant");
const profile_1 = require("../../../services/profile");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const util_1 = require("../../../utils/util");
const token_1 = require("../../../services/token");
Component({
    data: {
        loading: false,
        loadingText: '正在加载个人资料',
        pageStyle: '',
        icons: icons_1.iconPaths,
        authKind: '',
        primaryActionTitle: '编辑个人资料',
        primaryActionLabel: '去编辑',
        redirecting: false,
        profile: {
            avatarUrl: icons_1.iconPaths.defaultAvatar,
            displayName: '加载中',
            subtitle: '正在获取个人资料',
            roleBadge: '未登录',
            roleBadgeClass: 'role-badge--guest',
            trustTags: [],
        },
        bioText: '',
        baseInfo: [],
        metrics: [],
        activeTab: 'main', // 'main' | 'info' | 'action'
        merchantProducts: [],
        userCoupons: [],
    },
    lifetimes: {
        attached() {
            this.syncAuthState();
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(0),
            });
            if (!this.ensureAccess()) {
                return;
            }
            this.loadProfile();
        },
    },
    pageLifetimes: {
        show() {
            this.syncAuthState();
            if (!this.ensureAccess()) {
                return;
            }
            this.loadProfile();
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
            this.goLogin();
            return false;
        },
        syncAuthState() {
            const authKind = (0, token_1.getAuthTokenType)();
            const isAccess = authKind === 'access';
            this.setData({
                authKind,
                loadingText: '正在加载个人资料',
                primaryActionTitle: isAccess ? '编辑个人资料' : '登录后查看完整资料',
                primaryActionLabel: isAccess ? '去编辑' : '去登录',
            });
        },
        async loadProfile() {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            this.syncAuthState();
            this.setData({ loading: true });
            try {
                const [me, merchantProfile, assetsSummary] = await Promise.all([
                    (0, app_1.fetchMe)(),
                    (0, token_1.isMerchantSession)() ? (0, merchant_1.fetchMerchantProfile)().catch(() => null) : Promise.resolve(null),
                    (0, app_1.fetchAssetsSummary)().catch(() => null),
                ]);
                const draft = (0, profile_1.loadProfileDraft)();
                const role = me.user.role || (0, token_1.getAuthUserRole)();
                const isMerchant = Boolean(merchantProfile);
                const isAccess = this.data.authKind === 'access';
                const profileName = ((_a = me.profile) === null || _a === void 0 ? void 0 : _a.nickname) || me.user.nickname || '';
                const profileMobile = ((_b = me.profile) === null || _b === void 0 ? void 0 : _b.mobile) || me.user.mobile || '';
                const profileAvatarUrl = ((_c = me.profile) === null || _c === void 0 ? void 0 : _c.avatarUrl) || me.user.avatarUrl || '';
                const serverAvatarUrl = (merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.storeLogo) || profileAvatarUrl || '';
                const normalizedDraft = (0, profile_1.normalizeProfileDraft)(draft, {
                    displayName: (merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.storeName) || profileName || '',
                    identityType: isMerchant
                        ? '商户 / 农户'
                        : role === 'GUEST'
                            ? '游客'
                            : 'C端普通用户',
                    contactName: (merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.contactName) || profileName || '',
                    contactMobile: (merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.contactMobile) || profileMobile || '',
                    region: isMerchant ? '湾源县 · 东山社区' : '湾源县 · 个人中心',
                    bio: isMerchant
                        ? '本地果蔬合作社负责人，主营湾源脐橙、自然成熟番茄和时令蔬菜。支持产地直采、同城配送和冷链发货。'
                        : '正在浏览湾源农仓商品，关注产地直采和家庭采买。',
                    avatarUrl: serverAvatarUrl || icons_1.iconPaths.defaultAvatar,
                });
                const isHttp = (url) => url ? /^(https?:)?\/\//.test(url) : false;
                const cachedAvatar = isHttp(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '';
                const resolvedServerAvatar = isHttp(serverAvatarUrl) ? serverAvatarUrl : '';
                const avatarUrl = cachedAvatar || resolvedServerAvatar || icons_1.iconPaths.defaultAvatar;
                const displayName = normalizedDraft.displayName;
                const contactName = normalizedDraft.contactName;
                const contactMobile = normalizedDraft.contactMobile;
                const region = normalizedDraft.region;
                const bio = normalizedDraft.bio;
                const bioText = role === 'GUEST' ? '当前资料仅保留基础信息，登录后可继续完善。' : bio;
                (0, profile_1.saveProfileDraft)({
                    ...normalizedDraft,
                    avatarUrl: isHttp(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '',
                });
                const trustTags = isMerchant
                    ? ['已实名', '资质已认证', (merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.status) === 'APPROVED' ? '营业中' : '待审核']
                    : role === 'GUEST'
                        ? ['资料待完善', '可继续登录']
                        : ['资料可编辑', '账户已验证'];
                const metrics = isMerchant
                    ? [
                        { key: 'product', label: '商品数', value: String((_d = merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.productCount) !== null && _d !== void 0 ? _d : 0) },
                        { key: 'order', label: '订单数', value: String((_e = merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.orderCount) !== null && _e !== void 0 ? _e : 0) },
                        { key: 'wallet', label: '可提现', value: `¥${(_f = merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.availableAmount) !== null && _f !== void 0 ? _f : '0.00'}` },
                    ]
                    : (() => {
                        var _a, _b;
                        const summary = assetsSummary;
                        const orderTotal = summary
                            ? summary.orders.pendingPay +
                                summary.orders.pendingShip +
                                summary.orders.pendingReceive +
                                summary.orders.pendingReview +
                                summary.orders.refunding +
                                summary.orders.totalCompleted
                            : 0;
                        return [
                            { key: 'order', label: '订单数', value: String(orderTotal) },
                            { key: 'coupon', label: '卡券数', value: String((_a = summary === null || summary === void 0 ? void 0 : summary.coupons.unused) !== null && _a !== void 0 ? _a : 0) },
                            { key: 'points', label: '积分', value: String((_b = summary === null || summary === void 0 ? void 0 : summary.points.balance) !== null && _b !== void 0 ? _b : 0) },
                        ];
                    })();
                const subtitle = isMerchant
                    ? `专注本地产地直供 · ${(_g = merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.productCount) !== null && _g !== void 0 ? _g : 0} 个商品 · ${(_h = merchantProfile === null || merchantProfile === void 0 ? void 0 : merchantProfile.orderCount) !== null && _h !== void 0 ? _h : 0} 笔订单`
                    : role === 'GUEST'
                        ? '当前资料未完整同步，登录后可查看完整信息'
                        : '资料已同步，可继续编辑';
                const baseInfo = [
                    { label: '身份类型', value: normalizedDraft.identityType },
                    { label: '联系人', value: contactName },
                    { label: '手机号', value: (0, util_1.maskPhone)(contactMobile) || contactMobile },
                    { label: '所在地区', value: region },
                ];
                let merchantProducts = [];
                let userCoupons = [];
                if (isAccess) {
                    if (isMerchant) {
                        const productPage = await (0, merchant_1.fetchMerchantProducts)({ page: 1, pageSize: 20 }).catch(() => null);
                        merchantProducts = (_j = productPage === null || productPage === void 0 ? void 0 : productPage.items) !== null && _j !== void 0 ? _j : [];
                    }
                    else {
                        userCoupons = await (0, app_1.fetchUserCoupons)().catch(() => []);
                    }
                }
                this.setData({
                    profile: {
                        avatarUrl,
                        displayName,
                        subtitle,
                        roleBadge: isMerchant ? '商户' : role === 'GUEST' ? '游客' : isAccess ? '用户' : '未登录',
                        roleBadgeClass: isMerchant
                            ? 'role-badge--merchant'
                            : role === 'GUEST'
                                ? 'role-badge--guest'
                                : 'role-badge--user',
                        trustTags,
                    },
                    bioText,
                    baseInfo,
                    metrics,
                    merchantProducts,
                    userCoupons,
                });
            }
            catch {
                // Keep the shell when data loading fails.
            }
            finally {
                this.setData({ loading: false });
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        goLogin(redirectPath = '/pages/profile/home/home') {
            wx.navigateTo({
                url: (0, auth_route_1.buildProfileLoginUrl)(redirectPath),
            });
        },
        goEdit() {
            if (!this.ensureAccess()) {
                return;
            }
            wx.navigateTo({
                url: '/pages/profile/edit/edit',
            });
        },
        handlePrimaryAction() {
            if (this.data.authKind === 'access') {
                this.goEdit();
                return;
            }
            this.goLogin();
        },
        shareProfile() {
            wx.showActionSheet({
                itemList: ['修改个人昵称', '修改个人头像', '修改个人信息', '分享个人资料'],
                success: (result) => {
                    if (result.tapIndex <= 2) {
                        this.goEdit();
                        return;
                    }
                    wx.showToast({ title: '请点击右上角 ··· 转发', icon: 'none' });
                },
            });
        },
        openAction(e) {
            const { key } = e.currentTarget.dataset || {};
            if (!this.ensureAccess()) {
                return;
            }
            if (key === 'nickname' || key === 'avatar' || key === 'info') {
                this.goEdit();
                return;
            }
            if (key === 'share') {
                this.shareProfile();
                return;
            }
            wx.navigateTo({ url: '/pages/profile/edit/edit' });
        },
        switchTab(e) {
            const { tab } = e.currentTarget.dataset || {};
            if (tab) {
                this.setData({
                    activeTab: tab,
                });
            }
        },
        handleProfileAvatarError() {
            if (this.data.profile.avatarUrl === icons_1.iconPaths.defaultAvatar) {
                return;
            }
            this.setData({
                'profile.avatarUrl': icons_1.iconPaths.defaultAvatar,
            });
        },
    },
});
