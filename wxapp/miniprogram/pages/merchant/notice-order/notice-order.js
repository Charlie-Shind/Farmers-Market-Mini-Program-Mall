"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: { pageStyle: '', notices: [] },
    onLoad() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); this.loadNotices(); },
    async loadNotices() {
        try {
            const result = await (0, merchant_1.fetchMerchantNotices)({ type: 'ORDER', page: 1, pageSize: 20 });
            const items = ((result === null || result === void 0 ? void 0 : result.items) || []);
            this.setData({
                notices: items.map((n, i) => ({
                    id: n.noticeId, index: i + 1, title: n.title, desc: n.summary,
                    status: n.typeLabel || '订单', pillClass: n.isRead ? 'info' : 'warning',
                    link: '/pages/merchant/orders/orders',
                })),
            });
        }
        catch { }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/notice/notice' });
    },
    goPage(e) {
        const url = e.currentTarget.dataset.url;
        if (!url)
            return;
        wx.navigateTo({ url });
    },
    openNotice(e) {
        const item = e.currentTarget.dataset.item;
        if (item.link) {
            wx.navigateTo({ url: item.link });
        }
    },
});
