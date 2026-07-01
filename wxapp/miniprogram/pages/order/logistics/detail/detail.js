"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../../config/icons");
const app_1 = require("../../../../services/app");
const page_layout_1 = require("../../../../utils/page-layout");
const auth_route_1 = require("../../../../utils/auth-route");
function formatDateTime(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function resolveStatusLabel(order) {
    if (!order) {
        return '加载中';
    }
    return order.statusLabel || '物流已更新';
}
function resolveStatusSubLabel(order) {
    if (!order) {
        return '';
    }
    if (order.status === 'DELIVERED') {
        return '包裹已签收，可前往订单详情继续处理售后。';
    }
    if (order.status === 'IN_TRANSIT') {
        return '包裹已出库，正在运送中。';
    }
    return '订单已提交，等待商家配货。';
}
function buildTimeline(order) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const timeline = (order === null || order === void 0 ? void 0 : order.timeline) || [];
    return [
        {
            key: 'submit',
            title: '订单已提交',
            desc: ((_a = timeline[0]) === null || _a === void 0 ? void 0 : _a.time) ? `下单时间 ${formatDateTime(timeline[0].time || undefined)}` : ((_b = timeline[0]) === null || _b === void 0 ? void 0 : _b.desc) || '等待商家审核和配货',
            active: true,
        },
        {
            key: 'pay',
            title: '等待发货',
            desc: ((_c = timeline[1]) === null || _c === void 0 ? void 0 : _c.time) ? `付款时间 ${formatDateTime(timeline[1].time || undefined)}` : ((_d = timeline[1]) === null || _d === void 0 ? void 0 : _d.desc) || '等待完成支付',
            active: ((_e = timeline[1]) === null || _e === void 0 ? void 0 : _e.status) === 'done' || (order === null || order === void 0 ? void 0 : order.status) !== 'PENDING_SHIP',
        },
        {
            key: 'delivery',
            title: '运输中',
            desc: ((_f = timeline[2]) === null || _f === void 0 ? void 0 : _f.time) ? `${formatDateTime(timeline[2].time || undefined)} · ${timeline[2].desc}` : ((_g = timeline[2]) === null || _g === void 0 ? void 0 : _g.desc) || '物流节点更新后将显示最新信息',
            active: ((_h = timeline[2]) === null || _h === void 0 ? void 0 : _h.status) === 'done' || (order === null || order === void 0 ? void 0 : order.status) === 'IN_TRANSIT' || (order === null || order === void 0 ? void 0 : order.status) === 'DELIVERED',
        },
        {
            key: 'signed',
            title: '已签收',
            desc: ((_j = timeline[3]) === null || _j === void 0 ? void 0 : _j.time) ? `${formatDateTime(timeline[3].time || undefined)} · ${timeline[3].desc}` : ((_k = timeline[3]) === null || _k === void 0 ? void 0 : _k.desc) || '签收后可在订单详情申请售后',
            active: ((_l = timeline[3]) === null || _l === void 0 ? void 0 : _l.status) === 'done' || (order === null || order === void 0 ? void 0 : order.status) === 'DELIVERED',
        },
    ];
}
Page({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: true,
        orderNo: '',
        order: null,
        statusLabel: '',
        statusSubLabel: '',
        timeline: [],
    },
    onLoad(options) {
        this.setData({
            pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
        });
        const orderNo = options.orderNo || '';
        if (!orderNo) {
            wx.showToast({ title: '缺少订单编号', icon: 'none' });
            setTimeout(() => (0, auth_route_1.navigateBackOrHome)(1), 800);
            return;
        }
        this.setData({ orderNo });
        void this.loadOrder(orderNo);
    },
    async loadOrder(orderNo) {
        this.setData({ loading: true });
        try {
            const order = await (0, app_1.fetchOrderLogisticsDetail)(orderNo);
            this.setData({
                order,
                statusLabel: resolveStatusLabel(order),
                statusSubLabel: resolveStatusSubLabel(order),
                timeline: buildTimeline(order),
            });
        }
        catch (err) {
            wx.showToast({ title: (err === null || err === void 0 ? void 0 : err.message) || '加载物流信息失败', icon: 'none' });
            this.setData({
                order: null,
                statusLabel: '',
                statusSubLabel: '',
                timeline: [],
            });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goBack() {
        (0, auth_route_1.navigateBackOrHome)(1);
    },
    openOrderDetail() {
        if (!this.data.orderNo) {
            return;
        }
        wx.navigateTo({
            url: `/pages/order/detail/detail?orderNo=${this.data.orderNo}`,
        });
    },
    copyOrderNumber() {
        if (!this.data.orderNo) {
            return;
        }
        wx.setClipboardData({
            data: this.data.orderNo,
            success: () => wx.showToast({ title: '单号已复制', icon: 'success' }),
        });
    },
    copyTrackingNumber(e) {
        const { expressNo } = e.currentTarget.dataset;
        if (!expressNo) {
            return;
        }
        wx.setClipboardData({
            data: expressNo,
            success: () => wx.showToast({ title: '快递单号已复制', icon: 'success' }),
        });
    },
});
