"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const app_1 = require("../../../services/app");
Page({
    data: {
        pageStyle: '',
        merchantId: 0,
        shopName: '',
        shopDesc: '',
        products: [],
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        if (options.merchantId) {
            this.setData({ merchantId: Number(options.merchantId) });
        }
        this.loadData();
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    async loadData() {
        const { merchantId } = this.data;
        if (merchantId) {
            try {
                const merchant = await (0, app_1.fetchMerchantDetail)(merchantId);
                if (merchant) {
                    this.setData({
                        shopName: merchant.storeName || '',
                        shopDesc: merchant.contactName ? `联系人已认证 · 商品${merchant.productCount}件` : `商品${merchant.productCount}件`,
                    });
                }
            }
            catch { /* 后端未就绪 */ }
            try {
                const res = await (0, app_1.fetchMerchantPublicProducts)(merchantId, { page: 1, pageSize: 20 });
                if (res && res.items) {
                    const items = res.items.map((p) => ({
                        id: p.productId,
                        thumb: p.coverUrl || '/assets/goods/g2.svg',
                        title: p.title,
                        tag: p.saleCount > 100 ? '热卖' : '',
                        tagClass: p.saleCount > 100 ? 'success' : '',
                        meta: p.originPlace || '产地直供',
                        price: '¥' + (p.minPrice || '0'),
                        sold: p.saleCount || 0,
                    }));
                    this.setData({ products: items });
                    return;
                }
            }
            catch { /* 后端未就绪 */ }
        }
        this.setData({ products: [] });
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/shop/shop' });
    },
    onFollowTap() {
        wx.showToast({ title: '已关注预览', icon: 'success' });
    },
});
