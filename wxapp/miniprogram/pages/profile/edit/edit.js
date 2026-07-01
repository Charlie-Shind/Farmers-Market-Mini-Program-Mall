"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const merchant_1 = require("../../../services/merchant");
const profile_1 = require("../../../services/profile");
const request_1 = require("../../../services/request");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const util_1 = require("../../../utils/util");
const auth_1 = require("../../../services/auth");
const token_1 = require("../../../services/token");
const IDENTITY_OPTIONS = ['商户 / 农户', 'C端普通用户', '社区团长'];
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
        loading: false,
        loadingText: '正在加载资料编辑页',
        pageStyle: '',
        icons: icons_1.iconPaths,
        authKind: '',
        redirecting: false,
        isMerchantProfile: false,
        avatarUrl: icons_1.iconPaths.defaultAvatar,
        serverAvatarUrl: '',
        regionValue: [],
        identityOptions: IDENTITY_OPTIONS,
        identityIndex: 0,
        form: {
            displayName: '',
            identityType: IDENTITY_OPTIONS[0],
            contactName: '',
            contactMobile: '',
            region: '',
            bio: '',
        },
        preview: {
            title: '修改个人资料',
            lastSyncAt: '',
            metaText: '当前仅保留必要资料项，避免页面信息过载。',
        },
        saving: false,
        cropperVisible: false,
        cropperImageUrl: '',
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
            this.setData({
                authKind,
                loadingText: authKind === 'access'
                    ? '正在同步个人资料'
                    : authKind === 'guest'
                        ? '正在加载游客预览'
                        : '正在加载资料编辑页',
            });
        },
        async loadProfile() {
            var _a, _b, _c, _d, _e;
            this.syncAuthState();
            this.setData({ loading: true });
            try {
                const [me, merchantProfile] = await Promise.all([
                    (0, app_1.fetchMe)(),
                    (0, token_1.isMerchantSession)() ? (0, merchant_1.fetchMerchantProfile)().catch(() => null) : Promise.resolve(null),
                ]);
                const draft = (0, profile_1.loadProfileDraft)();
                const role = me.user.role || (0, token_1.getAuthUserRole)();
                const isMerchant = Boolean(merchantProfile);
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
                    region: '',
                    bio: '',
                    avatarUrl: serverAvatarUrl || icons_1.iconPaths.defaultAvatar,
                });
                const identityType = normalizedDraft.identityType;
                const identityIndex = Math.max(IDENTITY_OPTIONS.indexOf(identityType), 0);
                const displayName = normalizedDraft.displayName;
                const contactName = normalizedDraft.contactName;
                const contactMobile = normalizedDraft.contactMobile;
                const region = normalizedDraft.region;
                const bio = normalizedDraft.bio;
                const cachedAvatar = (0, util_1.isRemoteUrl)(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '';
                const resolvedServerAvatar = (0, util_1.isRemoteUrl)(serverAvatarUrl) ? serverAvatarUrl : '';
                const avatarUrl = cachedAvatar || resolvedServerAvatar || icons_1.iconPaths.defaultAvatar;
                const regionValue = this.resolveRegionValue(region);
                (0, profile_1.saveProfileDraft)({
                    ...normalizedDraft,
                    avatarUrl: (0, util_1.isRemoteUrl)(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '',
                });
                this.setData({
                    avatarUrl,
                    serverAvatarUrl,
                    regionValue,
                    isMerchantProfile: isMerchant,
                    identityIndex,
                    form: {
                        displayName,
                        identityType,
                        contactName,
                        contactMobile,
                        region,
                        bio,
                    },
                    preview: {
                        title: isMerchant ? '商户资料编辑' : '个人资料编辑',
                        lastSyncAt: formatDateTime((_d = me.profile) === null || _d === void 0 ? void 0 : _d.lastLoginAt),
                        metaText: isMerchant
                            ? `最近同步：${formatDateTime((_e = me.profile) === null || _e === void 0 ? void 0 : _e.lastLoginAt) || '暂无记录'}`
                            : '当前仅保留昵称、头像、手机号、地区和简介等必要资料项。',
                    },
                });
            }
            catch {
                wx.showToast({
                    title: '登录状态异常，请重新登录',
                    icon: 'none',
                });
                (0, auth_1.clearUserLocalState)();
                this.goLogin();
            }
            finally {
                this.setData({ loading: false });
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        goLogin() {
            wx.navigateTo({
                url: (0, auth_route_1.buildLoginUrl)('/pages/profile/edit/edit'),
            });
        },
        onChooseAvatar(e) {
            if (!this.ensureAccess()) {
                return;
            }
            const avatarUrl = e.detail.avatarUrl;
            if (!avatarUrl)
                return;
            this.setData({
                cropperImageUrl: avatarUrl,
                cropperVisible: true,
            });
        },
        async onGetPhoneNumber(e) {
            var _a, _b;
            if (!this.ensureAccess()) {
                return;
            }
            const { code, encryptedData } = e.detail;
            if (!code && !encryptedData) {
                wx.showToast({
                    title: '获取手机号失败',
                    icon: 'none',
                });
                return;
            }
            this.setData({
                loading: true,
                loadingText: '正在绑定手机号',
            });
            try {
                const loginRes = await new Promise((resolve, reject) => {
                    wx.login({
                        success: resolve,
                        fail: reject,
                    });
                });
                await (0, auth_1.bindWechatPhone)({
                    loginCode: loginRes.code,
                    phoneCode: code || encryptedData || '',
                });
                const me = await (0, app_1.fetchMe)();
                const mobile = ((_a = me.user) === null || _a === void 0 ? void 0 : _a.mobile) || ((_b = me.profile) === null || _b === void 0 ? void 0 : _b.mobile) || '';
                if (mobile) {
                    this.setData({
                        [`form.contactMobile`]: mobile,
                    });
                    const draft = (0, profile_1.loadProfileDraft)();
                    (0, profile_1.saveProfileDraft)((0, profile_1.normalizeProfileDraft)({ ...draft, contactMobile: mobile }, {
                        displayName: this.data.form.displayName,
                        identityType: this.data.form.identityType,
                        contactName: this.data.form.contactName,
                        contactMobile: mobile,
                        region: this.data.form.region,
                        bio: this.data.form.bio,
                        avatarUrl: this.data.avatarUrl,
                    }));
                    wx.showToast({
                        title: '手机号绑定成功',
                        icon: 'success',
                    });
                }
                else {
                    throw new Error('未获取到手机号');
                }
            }
            catch (err) {
                wx.showToast({
                    title: err.message || '绑定手机号失败，请重试',
                    icon: 'none',
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        resolveRegionValue(regionText) {
            if (!regionText) {
                return [];
            }
            const parts = regionText
                .split(/[·•、/|-]/)
                .map((item) => item.trim())
                .filter(Boolean);
            if (parts.length >= 2) {
                return parts.slice(0, 3);
            }
            return [regionText];
        },
        onCropSuccess(e) {
            const tempFilePath = e.detail.tempFilePath;
            this.setData({
                cropperVisible: false,
            });
            this.uploadAvatar(tempFilePath);
        },
        onCropCancel() {
            this.setData({
                cropperVisible: false,
            });
        },
        async uploadAvatar(filePath) {
            this.setData({
                loading: true,
                loadingText: '正在上传头像',
            });
            try {
                const uploaded = await (0, request_1.upload)({
                    url: '/files/upload',
                    filePath: filePath,
                    name: 'file',
                    auth: false,
                });
                if (!(uploaded === null || uploaded === void 0 ? void 0 : uploaded.url)) {
                    throw new Error('上传失败');
                }
                this.setData({
                    avatarUrl: uploaded.url,
                    serverAvatarUrl: uploaded.url,
                });
                (0, profile_1.saveProfileDraft)((0, profile_1.normalizeProfileDraft)({ avatarUrl: uploaded.url }, {
                    displayName: this.data.form.displayName,
                    identityType: this.data.form.identityType,
                    contactName: this.data.form.contactName,
                    contactMobile: this.data.form.contactMobile,
                    region: this.data.form.region,
                    bio: this.data.form.bio,
                    avatarUrl: uploaded.url,
                }));
                wx.showToast({
                    title: '头像已上传',
                    icon: 'success',
                });
            }
            catch {
                wx.showToast({
                    title: '头像上传失败',
                    icon: 'none',
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        onInput(e) {
            var _a;
            const field = (_a = e.currentTarget.dataset) === null || _a === void 0 ? void 0 : _a.field;
            if (!field) {
                return;
            }
            this.setData({
                [`form.${field}`]: e.detail.value,
            });
        },
        onIdentityChange(e) {
            const index = Number(e.detail.value);
            const identityType = IDENTITY_OPTIONS[index] || IDENTITY_OPTIONS[0];
            this.setData({
                identityIndex: index,
                [`form.identityType`]: identityType,
            });
        },
        onRegionPickerChange(e) {
            const value = e.detail.value || [];
            const regionText = value.filter(Boolean).join(' · ');
            this.setData({
                regionValue: value,
                [`form.region`]: regionText,
            });
        },
        async saveProfile() {
            var _a;
            if (this.data.authKind !== 'access') {
                this.goLogin();
                return;
            }
            if (!this.ensureAccess()) {
                return;
            }
            if (this.data.saving) {
                return;
            }
            const draft = (0, profile_1.normalizeProfileDraft)({
                displayName: this.data.form.displayName.trim(),
                identityType: this.data.form.identityType,
                contactName: this.data.form.contactName.trim(),
                contactMobile: this.data.form.contactMobile.trim(),
                region: this.data.form.region.trim(),
                bio: this.data.form.bio.trim(),
                avatarUrl: this.data.avatarUrl,
            }, {
                displayName: this.data.form.displayName.trim(),
                identityType: this.data.form.identityType,
                contactName: this.data.form.contactName.trim(),
                contactMobile: this.data.form.contactMobile.trim(),
                region: this.data.form.region.trim(),
                bio: this.data.form.bio.trim(),
                avatarUrl: this.data.serverAvatarUrl,
            });
            this.setData({ saving: true });
            try {
                const payload = {
                    displayName: draft.displayName,
                    contactName: draft.contactName || draft.displayName,
                    contactMobile: draft.contactMobile,
                    identityType: draft.identityType,
                    region: draft.region,
                    bio: draft.bio,
                };
                const avatarUrl = (0, util_1.isRemoteUrl)(this.data.avatarUrl)
                    ? this.data.avatarUrl
                    : (0, util_1.isRemoteUrl)(this.data.serverAvatarUrl)
                        ? this.data.serverAvatarUrl
                        : '';
                if (avatarUrl) {
                    payload.avatarUrl = avatarUrl;
                }
                await (0, app_1.updateMeProfile)(payload);
                (0, profile_1.saveProfileDraft)({
                    ...draft,
                    avatarUrl: (0, util_1.isRemoteUrl)(this.data.avatarUrl) ? this.data.avatarUrl : this.data.serverAvatarUrl || '',
                });
                wx.showToast({
                    title: '资料已保存',
                    icon: 'success',
                });
                setTimeout(() => {
                    (0, auth_route_1.navigateBackOrHome)();
                }, 300);
            }
            catch (error) {
                const message = String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : '');
                if (message.includes('登录已失效') || message.includes('Guest session cannot update profile')) {
                    this.goLogin();
                    return;
                }
                if (message.includes('手机号已被其他账号使用')) {
                    wx.showToast({
                        title: '手机号已被其他账号使用',
                        icon: 'none',
                    });
                    return;
                }
                wx.showToast({
                    title: message || '保存失败，请重试',
                    icon: 'none',
                });
            }
            finally {
                this.setData({ saving: false });
            }
        },
    },
});
