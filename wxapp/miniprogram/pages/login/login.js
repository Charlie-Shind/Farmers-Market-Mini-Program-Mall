"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const page_layout_1 = require("../../utils/page-layout");
const logger_1 = require("../../utils/logger");
const auth_route_1 = require("../../utils/auth-route");
const auth_1 = require("../../services/auth");
const token_1 = require("../../services/token");
const USER_PROTOCOL_TEXT = [
    '1. 你可以使用微信手机号一键登录农仓小程序，平台会根据微信身份和手机号识别账号。',
    '2. 登录后，平台会在商品浏览、下单、订单查询、售后处理、客服沟通等必要场景使用你的账号信息。',
    '3. 你应确保授权的手机号属于你本人，或已经获得合法授权。',
    '4. 若账号出现异常、误绑定或需要解绑处理，可通过平台客服或相关功能入口发起申请。',
    '5. 你在使用本服务前，需要同时接受平台的业务规则、订单规则和交易规则。',
].join('\n');
const PRIVACY_POLICY_TEXT = [
    '1. 我们仅收集实现登录、交易和服务所必需的信息，包括微信身份、手机号、头像昵称、订单信息、收货地址和必要的操作记录。',
    '2. 上述信息主要用于账号识别、订单履约、售后处理、消息通知、客服支持和安全风控。',
    '3. 平台不会向无关第三方出售你的个人信息，只有在法律要求、服务必要或你主动授权时才会共享必要数据。',
    '4. 你可以通过账户相关入口查询、更正或管理部分个人信息；如需注销或删除相关数据，可按平台流程提交申请。',
    '5. 平台会采取合理的技术与管理措施保护你的信息安全，但你也需要妥善保管自己的账号和设备。',
].join('\n');
Component({
    data: {
        loginMode: 'wechat',
        phoneNumber: '',
        verifyCode: '',
        agree: false,
        redirectPath: '/pages/index/index',
        safeBackPath: '/pages/index/index',
        loading: false,
        loadingText: '处理中',
        toastVisible: false,
        toastMessage: '',
        toastType: 'info',
        protocolDialog: {
            show: false,
            title: '',
            content: '',
            cancelText: '关闭',
            confirmText: '我知道了',
        },
        icons: icons_1.iconPaths,
        pageStyle: '',
    },
    lifetimes: {
        attached() {
            this.syncRouteState();
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
        },
    },
    methods: {
        syncRouteState() {
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const redirect = current && current.options && current.options.redirect
                ? (0, auth_route_1.resolveRedirectPath)(current.options.redirect, '/pages/index/index')
                : '/pages/index/index';
            const safeBackPath = (0, auth_route_1.resolveSafeLoginBackPath)(redirect);
            this.setData({
                redirectPath: redirect,
                safeBackPath,
            });
        },
        goBack() {
            if (this.data.safeBackPath !== this.data.redirectPath) {
                wx.reLaunch({
                    url: this.data.safeBackPath,
                });
                return;
            }
            (0, auth_route_1.navigateBackOrHome)();
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
        openProtocolDialog(title, content) {
            this.setData({
                protocolDialog: {
                    show: true,
                    title,
                    content,
                    cancelText: '关闭',
                    confirmText: '我知道了',
                },
            });
        },
        hideProtocolDialog() {
            this.setData({
                protocolDialog: {
                    ...this.data.protocolDialog,
                    show: false,
                },
            });
        },
        toggleAgree() {
            this.setData({
                agree: !this.data.agree,
            });
        },
        showUserProtocol() {
            this.openProtocolDialog('用户协议', USER_PROTOCOL_TEXT);
        },
        showPrivacyProtocol() {
            this.openProtocolDialog('隐私政策', PRIVACY_POLICY_TEXT);
        },
        switchLoginMode(e) {
            const { mode } = e.currentTarget.dataset || {};
            if (!mode || mode === this.data.loginMode) {
                return;
            }
            this.setData({
                loginMode: mode,
            });
        },
        handlePhoneNumberInput(e) {
            var _a, _b;
            const detail = (_a = e.detail) !== null && _a !== void 0 ? _a : {};
            const rawValue = String((_b = detail.value) !== null && _b !== void 0 ? _b : '');
            this.setData({
                phoneNumber: rawValue.replace(/\D/g, '').slice(0, 11),
            });
        },
        handleVerifyCodeInput(e) {
            var _a, _b;
            const detail = (_a = e.detail) !== null && _a !== void 0 ? _a : {};
            const rawValue = String((_b = detail.value) !== null && _b !== void 0 ? _b : '');
            this.setData({
                verifyCode: rawValue.replace(/\D/g, '').slice(0, 6),
            });
        },
        async completeAuth(message, role) {
            this.setToast(message, 'success');
            setTimeout(() => {
                (0, auth_route_1.navigateAfterLogin)(this.data.redirectPath, '/pages/index/index', role);
            }, 500);
        },
        getErrorMessage(error) {
            if (error instanceof Error && error.message.trim()) {
                return error.message;
            }
            return '登录失败，请重试';
        },
        async handleWechatPhoneLogin(e) {
            var _a;
            const detail = e.detail;
            if (!this.data.agree) {
                this.setToast('请先勾选协议', 'warning');
                return;
            }
            if (!detail || !detail.code || detail.errMsg !== 'getPhoneNumber:ok') {
                this.setToast('手机号授权失败，请重试', 'warning');
                return;
            }
            (0, auth_1.clearUserLocalState)();
            this.setData({
                loading: true,
                loadingText: '正在完成微信登录',
            });
            try {
                const loginCode = await new Promise((resolve, reject) => {
                    wx.login({
                        success: (res) => {
                            if (res.code) {
                                resolve(res.code);
                                return;
                            }
                            reject(new Error(res.errMsg || '微信登录失败'));
                        },
                        fail: (error) => {
                            reject(error);
                        },
                    });
                });
                await (0, auth_1.loginWithWechatCode)({
                    code: loginCode,
                });
                const boundSession = await (0, auth_1.bindWechatPhone)({
                    loginCode,
                    phoneCode: detail.code,
                });
                this.completeAuth('登录成功', (_a = boundSession.user) === null || _a === void 0 ? void 0 : _a.role);
            }
            catch (error) {
                logger_1.logger.error('wechat login failed', error);
                this.setToast(this.getErrorMessage(error), 'danger');
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        handleSendPhoneSms(e) {
            var _a;
            const detail = (_a = e.detail) !== null && _a !== void 0 ? _a : {};
            if (detail.errCode === 0) {
                this.setToast('验证码已发送，请注意查收', 'success');
                return;
            }
            if (detail.errCode === 10001005) {
                this.setToast('当前账号未开通微信短信能力', 'warning');
                return;
            }
            if (detail.errCode === 10001006) {
                this.setToast('验证码错误，请重新发送', 'warning');
                return;
            }
            this.setToast(detail.errMsg || '验证码发送失败，请重试', 'danger');
        },
        async handleSmsLogin() {
            var _a;
            if (!this.data.agree) {
                this.setToast('请先勾选协议', 'warning');
                return;
            }
            const phoneNumber = this.data.phoneNumber.trim();
            const verifyCode = this.data.verifyCode.trim();
            if (!/^1\d{10}$/.test(phoneNumber)) {
                this.setToast('请输入正确的手机号', 'warning');
                return;
            }
            if (!/^\d{6}$/.test(verifyCode)) {
                this.setToast('请输入 6 位验证码', 'warning');
                return;
            }
            (0, auth_1.clearUserLocalState)();
            this.setData({
                loading: true,
                loadingText: '正在完成短信登录',
            });
            try {
                const smsCode = await new Promise((resolve, reject) => {
                    const phoneSmsLogin = wx.phoneSmsLogin;
                    if (!phoneSmsLogin) {
                        reject(new Error('当前基础库不支持短信登录'));
                        return;
                    }
                    phoneSmsLogin({
                        phoneNumber,
                        verifyCode,
                        success: (res) => {
                            if (res && res.code) {
                                resolve(res.code);
                                return;
                            }
                            reject(new Error((res === null || res === void 0 ? void 0 : res.errMsg) || '短信登录失败'));
                        },
                        fail: (error) => {
                            reject(error);
                        },
                    });
                });
                const session = await (0, auth_1.loginWithWechatSms)({
                    code: smsCode,
                });
                this.completeAuth('登录成功', (_a = session.user) === null || _a === void 0 ? void 0 : _a.role);
            }
            catch (error) {
                logger_1.logger.error('sms login failed', error);
                this.setToast(this.getErrorMessage(error), 'danger');
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        enterGuest() {
            this.setData({
                loading: true,
                loadingText: '正在进入游客态',
            });
            (0, auth_1.clearUserLocalState)();
            (0, auth_1.fetchAnonymousSession)()
                .then(() => {
                this.completeAuth('已进入游客态');
            })
                .catch((error) => {
                logger_1.logger.warn('anonymous session failed, fallback to guest browsing', error);
                (0, token_1.setGuestMode)();
                this.completeAuth('已进入游客态');
            })
                .finally(() => {
                this.setData({
                    loading: false,
                });
            });
        },
    },
});
