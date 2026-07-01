"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const ORDER_TAB_KEYS = ['all', 'pay', 'groupBuying', 'ship', 'receive', 'comment', 'done', 'refund', 'orders'];
function buildOrderActionButtons(order) {
    const backendActionButtons = Array.isArray(order === null || order === void 0 ? void 0 : order.actionButtons) ? order.actionButtons : [];
    const hasCancelAfterSale = backendActionButtons.some((item) => (item === null || item === void 0 ? void 0 : item.key) === 'cancelAfterSale');
    const statusLabel = String((order === null || order === void 0 ? void 0 : order.statusLabel) || (order === null || order === void 0 ? void 0 : order.status) || '').trim();
    const refundStatus = Number((order === null || order === void 0 ? void 0 : order.afterSaleStatus) ?? (order === null || order === void 0 ? void 0 : order.refundStatus) ?? 0);
    const shouldShowCancelAfterSale = statusLabel === '售后中' || statusLabel === '退款申请中' || refundStatus === 1;
    if (!shouldShowCancelAfterSale || hasCancelAfterSale) {
        return backendActionButtons;
    }
    return [
        ...backendActionButtons,
        { key: 'cancelAfterSale', label: '取消售后', type: 'secondary' },
    ];
}
function formatOrderDisplayStatus(order, normalizedStatus) {
    switch (normalizedStatus) {
        case 'PENDING_PAY':
            return '待付款';
        case 'PENDING_SHIP':
            return '待发货';
        case 'PENDING_RECEIVE':
            return '待收货';
        case 'PENDING_COMMENT':
            return '已签收待评价';
        case 'COMPLETED':
            return '已完成';
        case 'REFUNDING':
        case 'AFTER_SALE':
            return '售后中';
        case 'CANCELLED':
            return '已取消';
        case 'EXPIRED':
            return '支付超时';
        case 'GROUP_BUYING':
            return '拼团中';
        case 'GROUP_FAILED':
            return '拼团失败';
        default:
            return (order === null || order === void 0 ? void 0 : order.status) || (order === null || order === void 0 ? void 0 : order.orderStatus) || '未知状态';
    }
}
function normalizeOrderStatus(order) {
    if (!order)
        return 'UNKNOWN';
    // 拼团订单特殊处理：未支付/已支付但拼团未完成时
    const gb = order.groupBuy;
    if (gb && gb.status === 'OPEN') {
        return 'GROUP_BUYING';
    }
    if (gb && gb.status === 'FAILED') {
        return 'GROUP_FAILED';
    }
    if (typeof order.orderStatus === 'string') {
        const upper = order.orderStatus.toUpperCase();
        if (upper === 'PENDING_PAY' ||
            upper === 'PENDING_SHIP' ||
            upper === 'PENDING_RECEIVE' ||
            upper === 'COMPLETED' ||
            upper === 'CANCELLED' ||
            upper === 'EXPIRED' ||
            upper === 'REFUNDING' ||
            upper === 'AFTER_SALE' ||
            upper === 'GROUP_BUYING' ||
            upper === 'GROUP_FAILED') {
            return upper;
        }
    }
    const statusText = String(order.status || '').trim();
    if (statusText === '待付款' || statusText === '待支付' || statusText === '等待付款' || statusText === 'NORMAL' || statusText === 'PENDING') {
        return 'PENDING_PAY';
    }
    if (statusText === '待接单' || statusText === '待发货' || statusText === '等待商家发货') {
        return 'PENDING_SHIP';
    }
    if (statusText === '待收货' || statusText === '已发货' || statusText === '商品已发货' || statusText === '运输中') {
        return 'PENDING_RECEIVE';
    }
    if (statusText === '待评价' || statusText === '已签收待评价') {
        return 'PENDING_COMMENT';
    }
    if (statusText === '已完成' || statusText === '交易已完成') {
        return 'COMPLETED';
    }
    if (statusText === '已取消' || statusText === '订单已取消') {
        return 'CANCELLED';
    }
    if (statusText === '已过期' || statusText === '支付超时') {
        return 'EXPIRED';
    }
    if (statusText === '售后中' || statusText === '退款中' || statusText === '退款申请中') {
        return 'REFUNDING';
    }
    const status = order.status;
    if (status === 'EXPIRED' || status === '已过期' || status === '支付超时' || status === 5 || status === '5') {
        return 'EXPIRED';
    }
    if (status === 'CANCELLED' || status === '已取消' || status === 4 || status === '4') {
        return 'CANCELLED';
    }
    if (status === 'COMPLETED' || status === '已完成' || status === 3 || status === '3') {
        return 'COMPLETED';
    }
    if (status === 'REFUNDING' || status === '售后中' || status === 5 || status === '5') {
        return 'REFUNDING';
    }
    if (status === 'AFTER_SALE' || status === '售后') {
        return 'AFTER_SALE';
    }
    if (order.payStatus === 0 || order.payStatus === '0') {
        return 'PENDING_PAY';
    }
    if (order.payStatus === 1 || order.payStatus === '1') {
        if (order.deliveryStatus === 0 || order.deliveryStatus === '0') {
            return 'PENDING_SHIP';
        }
        if (order.deliveryStatus === 1 || order.deliveryStatus === '1') {
            return 'PENDING_RECEIVE';
        }
        if (order.deliveryStatus === 2 || order.deliveryStatus === '2') {
            return 'PENDING_COMMENT';
        }
        return 'PENDING_SHIP';
    }
    if (order.afterSaleStatus === 1 || order.afterSaleStatus === 3) {
        return 'AFTER_SALE';
    }
    return 'UNKNOWN';
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        tabs: [
            { key: 'all', label: '全部' },
            { key: 'pay', label: '待付款' },
            { key: 'groupBuying', label: '拼团中' },
            { key: 'ship', label: '待发货' },
            { key: 'receive', label: '待收货' },
            { key: 'comment', label: '待评价' },
            { key: 'done', label: '已完成' },
            { key: 'refund', label: '退款/售后' },
        ],
        activeTab: 'all',
        allOrders: [],
        orders: [],
        page: 1,
        pageSize: 20,
        total: 0,
        loading: false,
        loadingMore: false,
        noMore: false,
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
        },
    },
    pageLifetimes: {
        show() {
            const activeTab = this.resolveActiveTab();
            this.setData({ activeTab });
            void this.loadOrders(true, activeTab);
        },
    },
    methods: {
        resolveActiveTab() {
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const options = (current === null || current === void 0 ? void 0 : current.options) || {};
            const rawType = String(options.type || 'all').toLowerCase();
            return ORDER_TAB_KEYS.includes(rawType) ? rawType : 'all';
        },
        async loadOrders(reset = true, activeTab = this.data.activeTab) {
            var _a, _b;
            if (this.data.loading || this.data.loadingMore) {
                return;
            }
            const page = reset ? 1 : this.data.page;
            try {
                if (reset) {
                    this.setData({ loading: true });
                    wx.showLoading({ title: '加载中…' });
                }
                else {
                    this.setData({ loadingMore: true });
                }
                const res = await (0, app_1.fetchOrders)({ page, pageSize: this.data.pageSize });
                const items = (res.items || []).map((item) => ({
                    ...item,
                    actionButtons: buildOrderActionButtons(item),
                    normalizedStatus: normalizeOrderStatus(item),
                    displayStatus: formatOrderDisplayStatus(item, normalizeOrderStatus(item)),
                }));
                const mergedOrders = reset ? items : [...this.data.allOrders, ...items];
                this.setData({
                    allOrders: mergedOrders,
                    total: (_a = res.total) !== null && _a !== void 0 ? _a : mergedOrders.length,
                    page: page + 1,
                    noMore: mergedOrders.length >= ((_b = res.total) !== null && _b !== void 0 ? _b : mergedOrders.length) || items.length < this.data.pageSize,
                });
                this.applyFilter(activeTab);
            }
            catch (err) {
                console.error('Failed to load orders:', err);
                if (reset) {
                    this.setData({
                        allOrders: [],
                        orders: [],
                        total: 0,
                        noMore: true,
                    });
                }
            }
            finally {
                this.setData({ loading: false, loadingMore: false });
                wx.hideLoading();
            }
        },
        applyFilter(activeTab = this.data.activeTab) {
            const { allOrders } = this.data;
            let orders = allOrders;
            if (activeTab === 'pay') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'PENDING_PAY');
            }
            else if (activeTab === 'groupBuying') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'GROUP_BUYING');
            }
            else if (activeTab === 'ship') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'PENDING_SHIP');
            }
            else if (activeTab === 'receive') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'PENDING_RECEIVE');
            }
            else if (activeTab === 'comment') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'PENDING_COMMENT');
            }
            else if (activeTab === 'done') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'COMPLETED');
            }
            else if (activeTab === 'refund') {
                orders = allOrders.filter((o) => o.normalizedStatus === 'REFUNDING' || o.normalizedStatus === 'AFTER_SALE');
            }
            this.setData({ orders });
        },
        setTab(e) {
            const { key } = e.currentTarget.dataset;
            if (!key)
                return;
            const nextTab = ORDER_TAB_KEYS.includes(key) ? key : 'all';
            this.setData({ activeTab: nextTab }, () => {
                this.applyFilter(nextTab);
            });
        },
        loadMore() {
            if (this.data.noMore || this.data.loading || this.data.loadingMore) {
                return;
            }
            void this.loadOrders(false, this.data.activeTab);
        },
        goToDetail(e) {
            const { orderNo } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.navigateTo({
                url: `/pages/order/detail/detail?orderNo=${orderNo}`,
            });
        },
        handleOrderAction(e) {
            const { key } = e.currentTarget.dataset;
            if (!key)
                return;
            if (key === 'cancel') {
                this.onCancel(e);
                return;
            }
            if (key === 'pay') {
                this.onPay(e);
                return;
            }
            if (key === 'logistics') {
                this.onLogistics(e);
                return;
            }
            if (key === 'confirm') {
                this.onConfirm(e);
                return;
            }
            if (key === 'refund') {
                this.onRefund(e);
                return;
            }
            if (key === 'review') {
                this.onGoReview(e);
                return;
            }
            if (key === 'cancelAfterSale') {
                this.onCancelAfterSale();
                return;
            }
            if (key === 'invite') {
                wx.showToast({ title: '请到订单详情页分享邀请好友', icon: 'none' });
            }
        },
        onPay(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/order/list/list')) {
                return;
            }
            const { orderNo, payAmount } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.showLoading({ title: '准备支付…' });
            (0, app_1.createWechatPayment)({ orderNo })
                .then(async (payment) => {
                const paymentStatus = await (0, app_1.fetchWechatPaymentStatus)(orderNo);
                wx.hideLoading();
                wx.showModal({
                    title: '支付单已创建',
                    content: paymentStatus.tradeState === 'SUCCESS'
                        ? `实付金额：¥${payAmount}\n支付单号：${payment.paymentNo}\n支付状态：已支付。`
                        : `实付金额：¥${payAmount}\n支付单号：${payment.paymentNo}\n支付状态：待支付，可稍后继续支付。`,
                    showCancel: false,
                    confirmText: '知道了',
                    confirmColor: '#2c4a39',
                    success: () => {
                        this.loadOrders(true);
                    },
                });
            })
                .catch((err) => {
                wx.hideLoading();
                wx.showToast({ title: (err === null || err === void 0 ? void 0 : err.message) || '支付单创建失败，请稍后重试', icon: 'none' });
            });
        },
        onConfirm(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/order/list/list')) {
                return;
            }
            const { orderNo } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.showModal({
                title: '确认收货',
                content: '确认已收到购买的农产品吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            wx.showLoading({ title: '正在确认…' });
                            await (0, app_1.confirmOrder)(orderNo);
                            wx.showToast({ title: '已确认收货', icon: 'success' });
                            this.loadOrders(true);
                        }
                        catch {
                            wx.showToast({ title: '确认收货失败', icon: 'none' });
                        }
                        finally {
                            wx.hideLoading();
                        }
                    }
                },
            });
        },
        onLogistics(e) {
            const { orderNo } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.navigateTo({
                url: `/pages/order/logistics/detail/detail?orderNo=${orderNo}`,
            });
        },
        onRefund(e) {
            const { orderNo } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.navigateTo({
                url: `/pages/order/detail/detail?orderNo=${orderNo}&action=refund`,
            });
        },
        onGoReview(e) {
            const { orderNo } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.navigateTo({
                url: `/pages/order/review/review?orderNo=${orderNo}`,
            });
        },
        onCancelAfterSale() {
            wx.showModal({
                title: '取消售后',
                content: '当前暂不支持直接取消售后申请，请联系商家或客服处理。',
                showCancel: false,
            });
        },
        onCancel(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/order/list/list')) {
                return;
            }
            const { orderNo } = e.currentTarget.dataset;
            if (!orderNo)
                return;
            wx.showModal({
                title: '取消订单',
                content: '确定要取消这笔订单吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            wx.showLoading({ title: '正在取消…' });
                            await (0, app_1.cancelOrder)(orderNo);
                            wx.showToast({ title: '订单已取消', icon: 'success' });
                            this.loadOrders(true);
                        }
                        catch {
                            wx.showToast({ title: '取消失败', icon: 'none' });
                        }
                        finally {
                            wx.hideLoading();
                        }
                    }
                },
            });
        },
        goBack() {
            wx.navigateBack({
                fail() {
                    wx.reLaunch({ url: '/pages/profile/profile' });
                }
            });
        },
        preventBubble() { },
    }
});
