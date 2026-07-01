"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        shopName: '湾源农仓',
        stats: [
            { label: '在售商品', value: '16' },
            { label: '进行中活动', value: '3' },
            { label: '及时发货率', value: '91%' },
        ],
        quickEntries: [
            { title: '工作台', icon: 'package', url: '/pages/merchant/workbench/workbench' },
            { title: '发布活动', icon: 'star', url: '/pages/merchant/marketing-publish/marketing-publish' },
            { title: '资金', icon: 'wallet', url: '/pages/merchant/finance/finance' },
            { title: '配送', icon: 'truck', url: '/pages/merchant/delivery/delivery' },
        ],
        manageRows: [
            { title: '店铺主页预览', desc: '查看消费者看到的店铺展示', action: '预览', url: '/pages/merchant/merchant-public/merchant-public' },
            { title: '主体认证', desc: '营业信息、联系人、资质状态', badge: '已认证', url: '/pages/merchant/profile-certify/profile-certify' },
            { title: '账号安全', desc: '登录保护、手机号、权限提醒', action: '设置', url: '/pages/merchant/profile-security/profile-security' },
            { title: '配送设置', desc: '发货地、运费模板、快递偏好', action: '进入', url: '/pages/merchant/delivery/delivery' },
        ],
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadShopData();
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    async loadShopData() {
        var _a, _b, _c, _d, _e;
        try {
            const profile = await (0, merchant_1.fetchMerchantProfile)();
            if (profile) {
                this.setData({
                    shopName: profile.storeName || '湾源农仓',
                    stats: [
                        { label: '在售商品', value: String(profile.productCount || '0') },
                        { label: '待发订单', value: String(profile.orderCount || '0') },
                        { label: '可提现', value: '¥' + (profile.availableAmount || '0') },
                    ],
                });
            }
        }
        catch { /* 后端未就绪 */ }
        try {
            const dashboard = await (0, merchant_1.fetchMerchantDashboard)();
            if (dashboard && dashboard.shop) {
                this.setData({ shopName: dashboard.shop.name || this.data.shopName });
                if (dashboard.heroStats && dashboard.heroStats.length >= 3) {
                    this.setData({
                        stats: [
                            { label: ((_a = dashboard.heroStats[0]) === null || _a === void 0 ? void 0 : _a.label) || '在售商品', value: ((_b = dashboard.heroStats[0]) === null || _b === void 0 ? void 0 : _b.value) || '16' },
                            { label: ((_c = dashboard.heroStats[1]) === null || _c === void 0 ? void 0 : _c.label) || '进行中活动', value: ((_d = dashboard.heroStats[1]) === null || _d === void 0 ? void 0 : _d.value) || '3' },
                            { label: '及时发货率', value: ((_e = dashboard.heroStats[2]) === null || _e === void 0 ? void 0 : _e.value) || '91%' },
                        ],
                    });
                }
            }
        }
        catch { /* 静默 */ }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' });
    },
    goPage(e) {
        const url = e.currentTarget.dataset.url;
        if (!url)
            return;
        wx.navigateTo({ url });
    },
});
