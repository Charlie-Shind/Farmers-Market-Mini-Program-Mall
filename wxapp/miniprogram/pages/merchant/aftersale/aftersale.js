"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        keyword: '',
        activeTab: 'all',
        showFilter: false,
        filterType: 'all',
        allList: [],
        filteredList: [],
    },
    onLoad() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); this.loadList(); },
    async loadList() {
        try {
            const result = await (0, merchant_1.fetchAfterSaleList)({ page: 1, pageSize: 50 });
            const items = (result.items || []);
            this.setData({
                allList: items.map((a) => {
                    var _a, _b, _c, _d;
                    return ({
                        id: a.refundNo, buyer: ((_a = a.buyer) === null || _a === void 0 ? void 0 : _a.nickname) || '', avatar: ((_b = a.buyer) === null || _b === void 0 ? void 0 : _b.avatarUrl) || '',
                        statusText: a.statusLabel, statusType: a.status === 1 ? 'danger' : a.status === 2 ? '' : 'success',
                        statusKey: a.status === 1 ? 'pending' : a.status === 2 ? 'return' : 'done',
                        goodsName: ((_c = a.item) === null || _c === void 0 ? void 0 : _c.title) || '', goodsImg: ((_d = a.item) === null || _d === void 0 ? void 0 : _d.coverUrl) || '',
                        reason: `退款金额 ¥${a.refundAmount} · 原因：${a.applyReason}`,
                        amount: a.refundAmount, type: a.applyType === 1 ? 'refund' : 'return',
                        canContact: true, canHandle: a.status === 1, canUrge: a.status === 2,
                    });
                }),
            }, () => this.applyFilters());
        }
        catch (e) {
            wx.showToast({ title: e.message || '售后列表加载失败', icon: 'none' });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/workbench/workbench' });
    },
    goPage(e) {
        const url = e.currentTarget.dataset.url;
        if (!url)
            return;
        wx.navigateTo({ url });
    },
    onSearch(e) {
        this.setData({ keyword: e.detail.value });
        this.applyFilters();
    },
    onTabTap(e) {
        this.setData({ activeTab: e.currentTarget.dataset.tab });
        this.applyFilters();
    },
    openFilter() { this.setData({ showFilter: true }); },
    closeFilter() { this.setData({ showFilter: false }); },
    setFilterType(e) { this.setData({ filterType: e.currentTarget.dataset.type }); },
    applyFilter() {
        this.setData({ showFilter: false });
        this.applyFilters();
        wx.showToast({ title: '已应用筛选', icon: 'none' });
    },
    applyFilters() {
        const list = this.data.allList;
        const keyword = (this.data.keyword || '').toLowerCase();
        const tab = this.data.activeTab;
        const type = this.data.filterType;
        let filtered = list;
        if (tab !== 'all')
            filtered = filtered.filter((item) => item.statusKey === tab);
        if (type !== 'all')
            filtered = filtered.filter((item) => item.type === type);
        if (keyword)
            filtered = filtered.filter((item) => item.buyer.includes(keyword) || item.goodsName.includes(keyword));
        this.setData({ filteredList: filtered });
    },
    goRefund(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/merchant/refund/refund?id=${id}` });
    },
    contactBuyer() {
        wx.showToast({ title: '已联系买家', icon: 'success' });
    },
    urgeReturn() {
        wx.showToast({ title: '已催买家寄回', icon: 'success' });
    },
    showToast() {
        wx.showToast({ title: '操作已记录', icon: 'none' });
    },
});
