"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        loading: true,
        orderNo: '',
        canAccept: false,
        canShip: false,
        order: { orderNo: '', status: '加载中', statusType: 'info', noticeTitle: '', noticeDesc: '' },
        buyer: { name: '', avatar: '/assets/avatars/a1.svg', summary: '', address: '', contact: '', phone: '', wechat: '' },
        goods: { image: '/assets/goods/g1.svg', title: '', meta: '', price: '', countText: '', note: '' },
        amountRows: [],
        timeline: [],
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        const orderNo = options.orderNo;
        if (orderNo) {
            this.setData({ orderNo });
            this.loadDetail(orderNo);
        }
    },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    async loadDetail(orderNo) {
        var _a;
        this.setData({ loading: true });
        try {
            const d = await (0, merchant_1.fetchMerchantOrderDetail)(orderNo);
            if (!d) {
                this.setData({ loading: false });
                return;
            }
            const addr = (d.addressSnapshot || {});
            const item = ((_a = d.items) === null || _a === void 0 ? void 0 : _a[0]) || {};
            const canAccept = !!d.canAccept;
            const canShip = !!d.canShip;
            const statusLabel = canAccept ? '待接单'
                : canShip ? '待发货'
                    : d.status || '待处理';
            const statusType = canAccept || canShip ? 'warning'
                : (d.status || '').includes('退款') ? 'danger'
                    : (d.status || '').includes('完成') || (d.status || '').includes('成功') ? 'success'
                        : 'info';
            const receiverName = addr.receiverName || addr.name || d.userName || '买家';
            const receiverMobile = addr.receiverMobile || addr.mobile || d.userMobile || '';
            const detailAddress = addr.detailAddress || addr.detail || '';
            this.setData({
                canAccept,
                canShip,
                order: {
                    orderNo: d.orderNo, status: statusLabel, statusType,
                    noticeTitle: canAccept ? '买家已付款，等待商家接单'
                        : canShip ? '已接单，等待商家发货'
                            : `订单状态：${d.status || statusLabel}`,
                    noticeDesc: canAccept ? '请先接单再发货'
                        : canShip ? '请尽快录入物流信息'
                            : '',
                },
                buyer: {
                    name: d.userName || '买家', avatar: d.userAvatar || '/assets/avatars/a1.svg',
                    summary: `收货地：${addr.province || ''}${addr.city || ''} · ${d.createdAt ? d.createdAt.slice(0, 10) : ''}`,
                    address: `${addr.province || ''}${addr.city || ''}${addr.district || ''} ${detailAddress}`,
                    contact: `${receiverName} ${receiverMobile}`,
                    phone: receiverMobile || d.userMobile || '13800000000', wechat: '',
                },
                goods: {
                    image: item.coverUrl || '/assets/goods/g1.svg',
                    title: item.title || '商品',
                    meta: `规格：${item.skuName || '默认'} · 数量：${item.quantity || 1}件`,
                    price: `¥${item.price || d.payAmount || '0'}`,
                    countText: `${item.quantity || 1}件`, note: '',
                },
                amountRows: [
                    { label: '商品金额', value: `¥${d.totalAmount || '0'}` },
                    { label: '运费', value: `¥${d.freightAmount || '0.00'}` },
                    { label: '优惠减免', value: `-¥${d.discountAmount || '0.00'}` },
                    { label: '预计入账', value: `¥${d.payAmount || d.totalAmount || '0'}`, strong: true },
                ],
                timeline: [
                    { title: '订单已创建', desc: d.createdAt || '' },
                    d.paidAt ? { title: '买家已付款', desc: d.paidAt } : null,
                    d.logisticsCompany ? { title: `物流：${d.logisticsCompany} ${d.trackingNo || ''}`, desc: '' } : null,
                    d.completedAt ? { title: '订单已完成', desc: d.completedAt } : null,
                ].filter(Boolean),
                loading: false,
            });
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载失败', icon: 'none' });
            this.setData({ loading: false });
        }
    },
    async handleAccept() {
        const orderNo = this.data.orderNo;
        if (!orderNo)
            return;
        try {
            await (0, merchant_1.acceptMerchantOrder)(orderNo);
            wx.showToast({ title: '已接单', icon: 'success' });
            this.loadDetail(orderNo);
        }
        catch (e) {
            wx.showToast({ title: e.message || '接单失败', icon: 'none' });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/orders/orders' });
    },
    goChat() { wx.navigateTo({ url: '/pages/merchant/chat-detail/chat-detail' }); },
    goProduct() { wx.navigateTo({ url: `/pages/merchant/products/edit/edit?productId=0` }); },
    goLogistics() { wx.navigateTo({ url: `/pages/merchant/logistics/logistics?orderNo=${this.data.orderNo}` }); },
    copyAddress() {
        const b = this.data.buyer;
        wx.setClipboardData({ data: `${b.address} ${b.contact}` });
    },
    contactBuyer() {
        const b = this.data.buyer;
        wx.showActionSheet({
            itemList: ['电话联系', '复制地址', '查看订单'],
            success: (res) => {
                if (res.tapIndex === 0 && b.phone)
                    wx.makePhoneCall({ phoneNumber: b.phone });
                if (res.tapIndex === 1)
                    this.copyAddress();
            },
        });
    },
});
