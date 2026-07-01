"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        loading: true,
        refundNo: '',
        refundType: '',
        refundStatus: '加载中',
        refundAmount: '',
        refundReason: '',
        refundDesc: '',
        goodsName: '',
        goodsImg: '/assets/goods/g1.svg',
        orderNo: '',
        goodsCount: '1',
        goodsPrice: '',
        evidence: [],
        timeline: [],
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        const refundNo = options.refundNo || options.id;
        if (refundNo) {
            this.setData({ refundNo });
            this.loadDetail(refundNo);
        }
    },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    async loadDetail(refundNo) {
        var _a, _b, _c, _d;
        this.setData({ loading: true });
        try {
            const d = await (0, merchant_1.fetchAfterSaleDetail)(refundNo);
            if (!d) {
                this.setData({ loading: false });
                return;
            }
            this.setData({
                refundType: d.applyTypeLabel || '退款',
                refundStatus: d.statusLabel || '待处理',
                refundAmount: d.refundAmount || '',
                refundReason: d.applyReason || '',
                refundDesc: d.merchantRemark || '',
                goodsName: ((_a = d.item) === null || _a === void 0 ? void 0 : _a.title) || '',
                goodsImg: ((_b = d.item) === null || _b === void 0 ? void 0 : _b.coverUrl) || '/assets/goods/g1.svg',
                orderNo: d.orderNo || '',
                goodsCount: String(((_c = d.item) === null || _c === void 0 ? void 0 : _c.quantity) || 1),
                goodsPrice: ((_d = d.item) === null || _d === void 0 ? void 0 : _d.price) || d.refundAmount || '',
                evidence: d.applyImages || [],
                timeline: (d.timeline || []).length ? d.timeline : [
                    { title: '买家提交退款', desc: d.createdAt || '' },
                ],
                loading: false,
            });
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载失败', icon: 'none' });
            this.setData({ loading: false });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/aftersale/aftersale' });
    },
    contactBuyer() { wx.showToast({ title: '已联系买家', icon: 'success' }); },
    async rejectRefund() {
        const refundNo = this.data.refundNo;
        wx.showModal({
            title: '确认拒绝退款', content: '请确认拒绝该退款申请。', confirmText: '确认拒绝', confirmColor: '#A6453A',
            success: async (res) => {
                if (!res.confirm)
                    return;
                try {
                    await (0, merchant_1.processMerchantRefund)(refundNo, { action: 'reject', remark: '商家拒绝退款' });
                    wx.showToast({ title: '已拒绝退款', icon: 'success' });
                    setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
                }
                catch (e) {
                    wx.showToast({ title: e.message || '操作失败', icon: 'none' });
                }
            },
        });
    },
    async agreeRefund() {
        const refundNo = this.data.refundNo;
        wx.showModal({
            title: '确认同意退款', content: `同意后将退款 ¥${this.data.refundAmount} 给买家`, confirmText: '确认退款', confirmColor: '#2F4F3A',
            success: async (res) => {
                if (!res.confirm)
                    return;
                try {
                    await (0, merchant_1.processMerchantRefund)(refundNo, { action: 'approve', remark: '商家同意退款' });
                    wx.showToast({ title: '已同意退款', icon: 'success' });
                    setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
                }
                catch (e) {
                    wx.showToast({ title: e.message || '操作失败', icon: 'none' });
                }
            },
        });
    },
});
