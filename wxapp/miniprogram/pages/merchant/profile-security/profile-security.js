"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        loginProtect: true,
        withdrawConfirm: true,
        lastLoginAt: '',
        lastLoginDevice: '',
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadSecuritySettings();
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    async loadSecuritySettings() {
        var _a, _b;
        const settings = await (0, merchant_1.fetchMerchantSecurity)();
        if (settings) {
            this.setData({
                loginProtect: (_a = settings.loginProtect) !== null && _a !== void 0 ? _a : true,
                withdrawConfirm: (_b = settings.withdrawConfirm) !== null && _b !== void 0 ? _b : true,
                lastLoginAt: settings.lastLoginAt || '',
                lastLoginDevice: settings.lastLoginDevice || '',
            });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/shop/shop' });
    },
    goPage(e) {
        const url = e.currentTarget.dataset.url;
        if (!url)
            return;
        wx.navigateTo({ url });
    },
    async onLoginProtectChange(e) {
        const val = e.detail.value;
        this.setData({ loginProtect: val });
        try {
            await (0, merchant_1.updateMerchantSecurity)({ loginProtect: val });
        }
        catch { /* 静默 */ }
    },
    async onWithdrawConfirmChange(e) {
        const val = e.detail.value;
        this.setData({ withdrawConfirm: val });
        try {
            await (0, merchant_1.updateMerchantSecurity)({ withdrawConfirm: val });
        }
        catch { /* 静默 */ }
    },
    onTapDeviceManage() {
        wx.showToast({ title: '设备管理功能开发中', icon: 'none' });
    },
    onTapOperationLog() {
        wx.showToast({ title: '操作日志功能开发中', icon: 'none' });
    },
});
