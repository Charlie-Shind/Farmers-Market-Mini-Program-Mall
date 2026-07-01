"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
Page({
    data: {
        pageStyle: '',
        orderNo: '',
        items: [],
        submitting: false,
        emptyText: '加载中…',
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        const orderNo = options.orderNo || '';
        if (orderNo) {
            this.setData({ orderNo });
            this.loadOrderItems(orderNo);
        }
        else {
            this.setData({ emptyText: '订单号错误' });
        }
    },
    async loadOrderItems(orderNo) {
        try {
            const order = await (0, app_1.fetchOrderDetail)(orderNo);
            if (!order || !order.items || !order.items.length) {
                this.setData({ emptyText: '订单不存在或无商品' });
                return;
            }
            const items = order.items.map((item) => ({
                orderItemId: item.orderItemId || item.id,
                productId: item.productId,
                title: item.productTitle || item.title || '',
                skuName: item.skuName || '',
                coverUrl: item.productImage || '',
                rating: 5,
                content: '',
                images: [],
            }));
            this.setData({ items, emptyText: '' });
        }
        catch {
            this.setData({ emptyText: '加载订单信息失败' });
        }
    },
    onStarTap(e) {
        const { index, star } = e.currentTarget.dataset;
        const items = this.data.items;
        if (index >= 0 && index < items.length) {
            items[index].rating = star;
            this.setData({ items });
        }
    },
    onContentInput(e) {
        var _a;
        const index = Number(e.currentTarget.dataset.index);
        const value = String((_a = e.detail.value) !== null && _a !== void 0 ? _a : '');
        const items = this.data.items;
        if (index >= 0 && index < items.length) {
            items[index].content = value;
            this.setData({ items });
        }
    },
    async onSubmit() {
        if (!(0, auth_route_1.ensureCustomerAccess)('/pages/order/review/review')) {
            return;
        }
        const items = this.data.items;
        const emptyItem = items.find((item) => !item.content.trim());
        if (emptyItem) {
            wx.showToast({ title: '请填写评价内容', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            await (0, app_1.submitOrderReview)(this.data.orderNo, {
                reviews: items.map((item) => ({
                    orderItemId: item.orderItemId,
                    rating: item.rating,
                    content: item.content.trim(),
                })),
            });
            wx.showToast({ title: '评价成功', icon: 'success' });
            setTimeout(() => {
                wx.navigateBack({ delta: 1 });
            }, 1000);
        }
        catch (e) {
            wx.showToast({ title: e.message || '提交评价失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/index/index' });
    },
});
