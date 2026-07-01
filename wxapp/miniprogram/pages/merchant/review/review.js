"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        shopScore: '4.8', goodRate: '96%', pendingReply: '0',
        activeChip: 'all',
        allList: [],
        filteredList: [],
    },
    onLoad() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); this.loadData(); },
    async loadData() {
        try {
            const [summary, result] = await Promise.all([
                (0, merchant_1.fetchReviewSummary)().catch(() => null),
                (0, merchant_1.fetchReviewList)({ page: 1, pageSize: 50 }).catch(() => null),
            ]);
            if (summary)
                this.setData({ shopScore: summary.shopScore, goodRate: summary.goodRate, pendingReply: String(summary.pendingReply) });
            if (result) {
                const items = (result.items || []);
                this.setData({
                    allList: items.map((r) => {
                        var _a, _b, _c, _d;
                        return ({
                            id: String(r.id),
                            orderNo: String(r.orderNo || ''),
                            buyer: ((_a = r.buyer) === null || _a === void 0 ? void 0 : _a.nickname) || '',
                            avatar: ((_b = r.buyer) === null || _b === void 0 ? void 0 : _b.avatarUrl) || '',
                            content: r.content || '',
                            score: String(r.rating),
                            goodsName: ((_c = r.product) === null || _c === void 0 ? void 0 : _c.title) || '',
                            goodsImg: ((_d = r.product) === null || _d === void 0 ? void 0 : _d.coverUrl) || '',
                            starText: `${r.rating}星`,
                            tag: r.rating >= 4 ? 'good' : r.rating >= 3 ? 'normal' : 'bad',
                            replyStatus: r.replyContent ? 'done' : 'todo',
                            replyText: r.replyContent ? '已回复' : '待回复',
                        });
                    }),
                }, () => this.applyFilter());
            }
        }
        catch (e) {
            wx.showToast({ title: e.message || '评价加载失败', icon: 'none' });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/orders/orders' });
    },
    goPage(e) {
        const url = e.currentTarget.dataset.url;
        if (!url)
            return;
        wx.navigateTo({ url });
    },
    onChipTap(e) {
        this.setData({ activeChip: e.currentTarget.dataset.chip });
        this.applyFilter();
    },
    applyFilter() {
        const list = this.data.allList;
        const chip = this.data.activeChip;
        let filtered = list;
        if (chip === 'todo')
            filtered = list.filter((item) => item.replyStatus === 'todo');
        else if (chip !== 'all')
            filtered = list.filter((item) => item.tag === chip);
        this.setData({ filteredList: filtered });
    },
    goOrderDetail(_e) {
        const orderNo = String(_e.currentTarget.dataset.orderNo || '');
        if (!orderNo)
            return;
        wx.navigateTo({ url: `/pages/merchant/order-detail/order-detail?orderNo=${orderNo}` });
    },
    copyReview(e) {
        const id = e.currentTarget.dataset.id;
        const item = this.data.allList.find(r => r.id === id);
        if (item) {
            wx.setClipboardData({ data: item.content, success: () => {
                    wx.showToast({ title: '已复制评价', icon: 'success' });
                } });
        }
    },
    async replyReview(e) {
        var _a, _b;
        const id = Number(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) || 0);
        if (!id)
            return;
        try {
            await (0, merchant_1.replyMerchantReview)(id, '感谢您的评价！');
            wx.showToast({ title: '已回复评价', icon: 'success' });
            this.loadData();
        }
        catch (e) {
            wx.showToast({ title: e.message || '回复失败', icon: 'none' });
        }
    },
    showToast() {
        wx.showToast({ title: '操作已记录', icon: 'none' });
    },
});
