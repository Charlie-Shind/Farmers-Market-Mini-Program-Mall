"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        activityName: '',
        orderCount: 0,
        amount: '0',
        conversion: '0',
        chart: [],
        products: [],
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        if (options.name)
            this.setData({ activityName: options.name });
        if (options.id)
            this.loadStats(Number(options.id));
    },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    async loadStats(id) {
        try {
            const s = await (0, merchant_1.fetchMerchantActivityStatistics)(id);
            if (s) {
                this.setData({
                    orderCount: s.orderCount || 0,
                    amount: s.payAmount || '0',
                    conversion: s.conversionRate || '0',
                    chart: (s.trend || []).map(item => ({ name: item.date, height: Math.max(12, Math.min(140, Math.round((item.orderCount || 0) * 4))) })),
                    products: (s.products || []).map(item => ({
                        id: String(item.productId),
                        name: item.title,
                        cover: item.coverUrl,
                        amount: item.payAmount || '0',
                        sold: item.orderCount || 0,
                        conversion: item.conversion || '0',
                    })),
                });
            }
        }
        catch {
            this.setData({ chart: [], products: [] });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
    },
});
