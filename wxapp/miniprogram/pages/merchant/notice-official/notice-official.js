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
            const result = await (0, merchant_1.fetchMerchantNotices)({ type: 'SYSTEM', page: 1, pageSize: 20 });
            const items = ((result === null || result === void 0 ? void 0 : result.items) || []);
            this.setData({
                notices: items.map((n) => ({
                    id: n.noticeId, title: n.title, desc: n.summary,
                    icon: 'star', iconClass: n.isRead ? '' : 'ok',
                    link: '/pages/merchant/marketing/marketing',
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
    goPage(e) { const url = e.currentTarget.dataset.url; if (url)
        wx.navigateTo({ url }); },
    openNotice(e) {
        var _a;
        const link = (_a = e.currentTarget.dataset.item) === null || _a === void 0 ? void 0 : _a.link;
        if (link)
            wx.navigateTo({ url: link });
    },
});
