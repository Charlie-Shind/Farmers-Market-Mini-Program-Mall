"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        loading: true,
        orderNo: '',
        goodsImg: '/assets/goods/g1.svg',
        goodsName: '',
        buyerName: '',
        goodsPrice: '',
        expressCompany: '',
        expressNo: '',
        remark: '',
        checkAddress: '',
        checkGoods: '',
        canAccept: false,
        canShip: false,
        saving: false,
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        const orderNo = options.orderNo;
        if (orderNo) {
            this.setData({ orderNo });
            this.loadOrder(orderNo);
        }
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    async loadOrder(orderNo) {
        var _a;
        this.setData({ loading: true });
        try {
            const detail = await (0, merchant_1.fetchMerchantOrderDetail)(orderNo);
            if (!detail) {
                wx.showToast({ title: '订单不存在', icon: 'none' });
                this.setData({ loading: false });
                return;
            }
            const addr = (detail.addressSnapshot || {});
            const item = ((_a = detail.items) === null || _a === void 0 ? void 0 : _a[0]) || {};
            this.setData({
                goodsImg: item.coverUrl || '/assets/goods/g1.svg',
                goodsName: item.title || detail.userName || '',
                buyerName: detail.userName || '',
                goodsPrice: item.price || detail.payAmount || '',
                expressCompany: detail.logisticsCompany || '',
                expressNo: detail.trackingNo || '',
                canAccept: !!detail.canAccept,
                canShip: !!detail.canShip,
                checkAddress: `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detailAddress || addr.detail || ''}，${addr.receiverMobile || addr.mobile || detail.userMobile || ''}`,
                checkGoods: `${item.title || ''} ${item.quantity || 1} 件`,
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
        wx.navigateTo({ url: '/pages/merchant/orders/orders' });
    },
    onExpressCompany(e) { this.setData({ expressCompany: e.detail.value }); },
    onExpressNo(e) { this.setData({ expressNo: e.detail.value }); },
    onRemark(e) { this.setData({ remark: e.detail.value }); },
    copyExpressNo() {
        const no = this.data.expressNo;
        if (!no) {
            wx.showToast({ title: '请先输入快递单号', icon: 'none' });
            return;
        }
        wx.setClipboardData({ data: no, success: () => {
                wx.showToast({ title: '已复制单号', icon: 'success' });
            } });
    },
    async saveLogistics() {
        const orderNo = this.data.orderNo;
        const company = this.data.expressCompany;
        const trackingNo = this.data.expressNo;
        if (!orderNo) {
            wx.showToast({ title: '缺少订单号', icon: 'none' });
            return;
        }
        if (!company || !trackingNo) {
            wx.showToast({ title: '请填写快递公司和单号', icon: 'none' });
            return;
        }
        this.setData({ saving: true });
        try {
            if (this.data.canAccept) {
                await (0, merchant_1.acceptMerchantOrder)(orderNo);
                wx.showToast({ title: '已接单', icon: 'success' });
            }
            await (0, merchant_1.shipMerchantOrder)(orderNo, { trackingNo, logisticsCompany: company });
            wx.showToast({ title: '已保存物流信息', icon: 'success' });
            setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
        }
        catch (e) {
            wx.showToast({ title: e.message || '保存失败', icon: 'none' });
        }
        finally {
            this.setData({ saving: false });
        }
    },
});
