import { iconPaths } from '../../../config/icons';
import {
  fetchOrders,
  cancelOrder,
  confirmOrder,
  createWechatPayment,
  fetchWechatPaymentStatus,
  mockPaySuccess,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess } from '../../../utils/auth-route';

type OrderStatusKey =
  | 'PENDING_PAY'
  | 'PENDING_SHIP'
  | 'PENDING_RECEIVE'
  | 'PENDING_COMMENT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDING'
  | 'REFUND_SUCCESS'
  | 'AFTER_SALE'
  | 'GROUP_BUYING'
  | 'GROUP_FAILED'
  | 'UNKNOWN';

const ORDER_TAB_KEYS = ['all', 'pay', 'groupBuying', 'ship', 'receive', 'done', 'refund', 'orders'] as const;
type OrderTabKey = (typeof ORDER_TAB_KEYS)[number];

function buildOrderActionButtons(order: any) {
  const refundStatus = Number(order?.afterSaleStatus ?? order?.refundStatus ?? 0);
  const statusEnum = String(order?.statusEnum || order?.orderStatus || '').toUpperCase();
  const statusLabel = String(order?.statusLabel || order?.status || '').trim();
  const isRefunding =
    refundStatus === 1 ||
    refundStatus === 2 ||
    refundStatus === 3 ||
    statusEnum === 'REFUND_SUCCESS' ||
    statusEnum === 'REFUNDING' ||
    statusLabel === '退款成功' ||
    statusLabel === '售后中' ||
    statusLabel === '退款申请中' ||
    statusLabel === '退款中';

  // 退款成功：不展示物流/收货/售后等操作，仅可点进订单详情
  if (refundStatus === 3 || statusEnum === 'REFUND_SUCCESS' || statusLabel === '退款成功') {
    return [];
  }

  const backendActionButtons = (Array.isArray(order?.actionButtons) ? order.actionButtons : []).filter(
    (item: any) => item?.key !== 'review' && !(isRefunding && item?.key === 'invite'),
  );
  const hasCancelAfterSale = backendActionButtons.some((item: any) => item?.key === 'cancelAfterSale');
  const shouldShowCancelAfterSale =
    statusLabel === '售后中' ||
    statusLabel === '退款申请中' ||
    refundStatus === 1;

  if (!shouldShowCancelAfterSale || hasCancelAfterSale) {
    return backendActionButtons;
  }

  return [
    ...backendActionButtons,
    { key: 'cancelAfterSale', label: '取消售后', type: 'secondary' },
  ];
}

function formatOrderDisplayStatus(order: any, normalizedStatus: OrderStatusKey): string {
  const backendLabel = String(order?.statusLabel || order?.status || '').trim();
  if (backendLabel) {
    if (backendLabel === '已过期') {
      return '支付超时';
    }
    return backendLabel;
  }

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
    case 'REFUND_SUCCESS':
      return '退款成功';
    case 'CANCELLED':
      return '已取消';
    case 'EXPIRED':
      return '支付超时';
    case 'GROUP_BUYING':
      return '拼团中';
    case 'GROUP_FAILED':
      return '拼团失败';
    default:
      return order?.status || order?.orderStatus || '未知状态';
  }
}

function normalizeOrderStatus(order: any): OrderStatusKey {
  if (!order) return 'UNKNOWN';

  const refundStatus = Number(order?.afterSaleStatus ?? order?.refundStatus ?? 0);
  if (refundStatus === 3) {
    return 'REFUND_SUCCESS';
  }
  if (refundStatus === 1 || refundStatus === 2) {
    return 'REFUNDING';
  }

  // 拼团优先：进行中的拼团不应归入待付款/待发货角标逻辑
  const gb = order.groupBuy;
  if (gb && gb.status === 'OPEN') {
    return 'GROUP_BUYING';
  }
  if (gb && gb.status === 'FAILED') {
    return 'GROUP_FAILED';
  }

  if (typeof order.statusEnum === 'string' && order.statusEnum.trim()) {
    const upper = order.statusEnum.toUpperCase();
    if (
      upper === 'PENDING_PAY' ||
      upper === 'PENDING_SHIP' ||
      upper === 'PENDING_RECEIVE' ||
      upper === 'PENDING_COMMENT' ||
      upper === 'COMPLETED' ||
      upper === 'CANCELLED' ||
      upper === 'EXPIRED' ||
      upper === 'REFUNDING' ||
      upper === 'REFUND_SUCCESS' ||
      upper === 'AFTER_SALE' ||
      upper === 'GROUP_BUYING' ||
      upper === 'GROUP_FAILED'
    ) {
      return upper as OrderStatusKey;
    }
  }

  if (typeof order.orderStatus === 'string') {
    const upper = order.orderStatus.toUpperCase();
    if (
      upper === 'PENDING_PAY' ||
      upper === 'PENDING_SHIP' ||
      upper === 'PENDING_RECEIVE' ||
      upper === 'COMPLETED' ||
      upper === 'CANCELLED' ||
      upper === 'EXPIRED' ||
      upper === 'REFUNDING' ||
      upper === 'AFTER_SALE' ||
      upper === 'GROUP_BUYING' ||
      upper === 'GROUP_FAILED'
    ) {
      return upper as OrderStatusKey;
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
  if (status === 'REFUND_SUCCESS' || status === '退款成功') {
    return 'REFUND_SUCCESS';
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

  return 'UNKNOWN';
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pay', label: '待付款' },
      { key: 'groupBuying', label: '拼团中' },
      { key: 'ship', label: '待发货' },
      { key: 'receive', label: '待收货' },
      { key: 'done', label: '已完成' },
      { key: 'refund', label: '退款/售后' },
    ],
    activeTab: 'all' as OrderTabKey,
    allOrders: [] as any[],
    orders: [] as any[],
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
        pageStyle: buildPageTopStyle(4),
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
    resolveActiveTab(this: any): OrderTabKey {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      const rawType = String(options.type || 'all').toLowerCase();
      return (ORDER_TAB_KEYS as readonly string[]).includes(rawType) ? (rawType as OrderTabKey) : 'all';
    },
    async loadOrders(this: any, reset = true, activeTab: OrderTabKey = this.data.activeTab) {
      if (this.data.loading || this.data.loadingMore) {
        return;
      }

      const page = reset ? 1 : this.data.page;
      try {
        if (reset) {
          this.setData({ loading: true });
          wx.showLoading({ title: '加载中…' });
        } else {
          this.setData({ loadingMore: true });
        }

        const statusQueryMap: Partial<Record<OrderTabKey, string>> = {
          pay: 'PENDING_PAY',
          ship: 'PENDING_SHIP',
          receive: 'PENDING_RECEIVE',
          done: 'COMPLETED',
          refund: 'REFUNDING',
        };
        const status = statusQueryMap[activeTab];
        const res = await fetchOrders({
          page,
          pageSize: this.data.pageSize,
          ...(status ? { status } : {}),
        });
        const items = (res.items || []).map((item: any) => ({
          ...item,
          actionButtons: buildOrderActionButtons(item),
          normalizedStatus: normalizeOrderStatus(item),
          displayStatus: formatOrderDisplayStatus(item, normalizeOrderStatus(item)),
        }));
        // 服务端已按状态筛选时，直接使用返回列表；全部/拼团等仍在本地过滤
        let displayItems = items;
        if (activeTab === 'groupBuying') {
          displayItems = items.filter((o: any) => o.normalizedStatus === 'GROUP_BUYING');
        } else if (!status && activeTab !== 'all' && activeTab !== 'orders') {
          displayItems = items.filter((o: any) => {
            if (activeTab === 'pay') return o.normalizedStatus === 'PENDING_PAY';
            if (activeTab === 'ship') return o.normalizedStatus === 'PENDING_SHIP';
            if (activeTab === 'receive') return o.normalizedStatus === 'PENDING_RECEIVE';
            if (activeTab === 'done') return o.normalizedStatus === 'COMPLETED';
            if (activeTab === 'refund') {
              return (
                o.normalizedStatus === 'REFUNDING' ||
                o.normalizedStatus === 'AFTER_SALE' ||
                o.normalizedStatus === 'REFUND_SUCCESS'
              );
            }
            return true;
          });
        }

        const mergedOrders = reset ? items : [...this.data.allOrders, ...items];
        const serverPageSize = Number((res as any).pageSize) || this.data.pageSize;
        const total = Number(res.total);
        const noMore =
          items.length === 0 ||
          items.length < serverPageSize ||
          (Number.isFinite(total) && total >= 0 && mergedOrders.length >= total);

        this.setData({
          allOrders: mergedOrders,
          orders: reset ? displayItems : [...this.data.orders, ...displayItems],
          total: Number.isFinite(total) ? total : mergedOrders.length,
          page: page + 1,
          noMore,
        });
      } catch (err) {
        console.error('Failed to load orders:', err);
        if (reset) {
          this.setData({
            allOrders: [],
            orders: [],
            total: 0,
            noMore: true,
          });
        }
      } finally {
        this.setData({ loading: false, loadingMore: false });
        wx.hideLoading();
      }
    },
    applyFilter(this: any, activeTab: OrderTabKey = this.data.activeTab) {
      void this.loadOrders(true, activeTab);
    },
    setTab(this: any, e: WechatMiniprogram.BaseEvent) {
      const { key } = e.currentTarget.dataset as { key?: string };
      if (!key) return;
      const nextTab = (ORDER_TAB_KEYS as readonly string[]).includes(key) ? (key as OrderTabKey) : 'all';
      this.setData({ activeTab: nextTab }, () => {
        void this.loadOrders(true, nextTab);
      });
    },
    loadMore(this: any) {
      if (this.data.noMore || this.data.loading || this.data.loadingMore) {
        return;
      }

      void this.loadOrders(false, this.data.activeTab as OrderTabKey);
    },
    goToDetail(e: WechatMiniprogram.BaseEvent) {
      const { orderNo } = e.currentTarget.dataset as { orderNo?: string };
      if (!orderNo) return;
      wx.navigateTo({
        url: `/pages/order/detail/detail?orderNo=${orderNo}`,
      });
    },
    handleOrderAction(e: WechatMiniprogram.BaseEvent) {
      const { key } = e.currentTarget.dataset as { key?: string };
      if (!key) return;
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
      if (key === 'cancelAfterSale') {
        this.onCancelAfterSale();
        return;
      }
      if (key === 'invite') {
        wx.showToast({ title: '请到订单详情页分享邀请好友', icon: 'none' });
      }
    },
    onPay(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/order/list/list')) {
        return;
      }

      const { orderNo, payAmount } = e.currentTarget.dataset as { orderNo?: string; payAmount?: string };
      if (!orderNo) return;
      wx.showLoading({ title: '准备支付…' });
      createWechatPayment({ orderNo })
        .then(async (payment) => {
          const paymentStatus = await fetchWechatPaymentStatus(orderNo);
          wx.hideLoading();
          wx.showModal({
            title: '支付单已创建',
            content:
              paymentStatus.tradeState === 'SUCCESS'
                ? `实付金额：¥${payAmount}\n支付单号：${payment.paymentNo}\n支付状态：已支付。`
                : `实付金额：¥${payAmount}\n支付单号：${payment.paymentNo}\n支付状态：待支付，可稍后继续支付。`,
            showCancel: false,
            confirmText: '知道了',
            confirmColor: '#2c4a39',
            success: async () => {
              if (paymentStatus.tradeState !== 'SUCCESS') {
                try {
                  await mockPaySuccess(orderNo);
                  wx.showToast({ title: '支付成功', icon: 'success' });
                } catch {
                  wx.showToast({ title: '模拟支付失败', icon: 'none' });
                }
              }
              this.loadOrders(true);
            },
          });
        })
        .catch((err: any) => {
          wx.hideLoading();
          wx.showToast({ title: err?.message || '支付单创建失败，请稍后重试', icon: 'none' });
        });
    },
    onConfirm(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/order/list/list')) {
        return;
      }

      const { orderNo } = e.currentTarget.dataset as { orderNo?: string };
      if (!orderNo) return;
      wx.showModal({
        title: '确认收货',
        content: '确认已收到购买的农产品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '正在确认…' });
              await confirmOrder(orderNo);
              wx.showToast({ title: '已确认收货', icon: 'success' });
              this.loadOrders(true);
            } catch {
              wx.showToast({ title: '确认收货失败', icon: 'none' });
            } finally {
              wx.hideLoading();
            }
          }
        },
      });
    },
    onLogistics(e: WechatMiniprogram.BaseEvent) {
      const { orderNo } = e.currentTarget.dataset as { orderNo?: string };
      if (!orderNo) return;
      wx.navigateTo({
        url: `/pages/order/logistics/detail/detail?orderNo=${orderNo}`,
      });
    },
    onRefund(e: WechatMiniprogram.BaseEvent) {
      const { orderNo } = e.currentTarget.dataset as { orderNo?: string };
      if (!orderNo) return;
      wx.navigateTo({
        url: `/pages/order/detail/detail?orderNo=${orderNo}&action=refund`,
      });
    },
    onCancelAfterSale() {
      wx.showModal({
        title: '取消售后',
        content: '当前暂不支持直接取消售后申请，请联系商家或客服处理。',
        showCancel: false,
      });
    },
    onCancel(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/order/list/list')) {
        return;
      }

      const { orderNo } = e.currentTarget.dataset as { orderNo?: string };
      if (!orderNo) return;
      wx.showModal({
        title: '取消订单',
        content: '确定要取消这笔订单吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '正在取消…' });
              await cancelOrder(orderNo);
              wx.showToast({ title: '订单已取消', icon: 'success' });
              this.loadOrders(true);
            } catch {
              wx.showToast({ title: '取消失败', icon: 'none' });
            } finally {
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
    preventBubble() {},
  }
});
