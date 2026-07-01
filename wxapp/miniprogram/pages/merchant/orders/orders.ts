import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantOrders, type MerchantOrder, acceptMerchantOrder } from '../../../services/merchant';

function mapStatus(order: MerchantOrder) {
  const orderStatus = Number(order.orderStatus || 0);
  const payStatus = Number(order.payStatus || 0);
  const deliveryStatus = Number(order.deliveryStatus || 0);
  const refundStatus = Number(order.refundStatus || 0);

  if (refundStatus === 1 || refundStatus === 2) {
    return { status: '退款中', statusType: 'danger', primaryText: '处理退款', primaryAction: 'refund' };
  }
  if (refundStatus === 3) {
    return { status: '退款成功', statusType: 'success', primaryText: '查看详情', primaryAction: 'detail' };
  }
  if (refundStatus === 4) {
    return { status: '退款拒绝', statusType: 'danger', primaryText: '查看详情', primaryAction: 'detail' };
  }
  if (payStatus === 0) {
    return { status: '待付款', statusType: 'muted', primaryText: '查看详情', primaryAction: 'detail' };
  }
  if (order.canAccept) {
    return { status: '待接单', statusType: 'warning', primaryText: '接单', primaryAction: 'accept' };
  }
  if (order.canShip) {
    return { status: '待发货', statusType: 'warning', primaryText: '发货', primaryAction: 'ship' };
  }
  if (orderStatus === 2 && deliveryStatus === 2) {
    return { status: '待收货', statusType: 'info', primaryText: '查看物流', primaryAction: 'logistics' };
  }
  if (orderStatus === 3) {
    return { status: '交易成功', statusType: 'success', primaryText: '查看评价', primaryAction: 'review' };
  }
  if (orderStatus === 4) {
    return { status: '已取消', statusType: 'muted', primaryText: '查看详情', primaryAction: 'detail' };
  }
  return { status: order.status || '待处理', statusType: 'info', primaryText: '查看详情', primaryAction: 'detail' };
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loading: true,
    nav: [
      { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: false, tab: 0 },
      { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
      { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: true, tab: 2 },
      { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: false, tab: 3 },
      { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
    ],
    tabs: [
      { name: '全部', active: true }, { name: '待付款', active: false },
      { name: '待发货', active: false }, { name: '待收货', active: false },
      { name: '待评价', active: false }, { name: '退款中', active: false },
    ],
    filters: [
      { name: '最新排序', active: true }, { name: '优先发货', active: false },
      { name: '售后优先', active: false }, { name: '今日订单', active: false },
    ],
    orders: [] as any[],
    allOrders: [] as any[],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(8) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(8) }); this.loadOrders(); },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const result = await fetchMerchantOrders({ page: 1, pageSize: 50 });
      const items = ((result as any).items || result || []) as MerchantOrder[];
      const orders = items.map((o: MerchantOrder) => {
        const item = o.items?.[0] || o.itemPreview?.[0] || {};
        const skuName = 'skuName' in item ? item.skuName : '规格未填';
        const mapped = mapStatus(o);
        return {
          id: o.orderNo,
          buyerName: o.userName || '买家',
          buyerAvatar: o.userAvatar || '/assets/avatars/a1.svg',
          phone: o.userMobile || '',
          time: o.createdAt ? o.createdAt.slice(5, 16).replace('T', ' ') : '',
          status: mapped.status,
          statusType: mapped.statusType,
          goodsImage: item.coverUrl || '/assets/goods/g1.svg',
          goodsTitle: item.title || o.orderNo,
          goodsMeta: `${skuName} · ${item.quantity || 0}件`,
          orderNo: `订单号 ${o.orderNo}`,
          amount: `¥${o.totalAmount || '0'}`,
          count: item.quantity || 1,
          summary: `共 ${item.quantity || 1} 件商品`,
          primaryText: mapped.primaryText,
          primaryAction: mapped.primaryAction,
        };
      });
      this.setData({ orders, allOrders: orders, loading: false });
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  showSearch() { wx.showToast({ title: '搜索订单', icon: 'none' }); },
  showBill() { wx.navigateTo({ url: '/pages/merchant/finance/finance' }); },
  showFilter() { wx.showToast({ title: '筛选已打开', icon: 'none' }); },

  onTabTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const tabs = (this.data.tabs as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    const tabNames = ['待付款', '待发货', '待收货', '待评价', '退款中'];
    const activeTab = tabs.find((t: any) => t.active);
    const filterName = activeTab?.name;
    const orders = tabNames.includes(filterName)
      ? (this.data.allOrders as any[]).filter((o: any) => o.status === filterName)
      : this.data.allOrders;
    this.setData({ tabs, orders });
  },

  onFilterTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const filters = (this.data.filters as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    this.setData({ filters });
    if (index === 3) this.setData({ orders: (this.data.allOrders as any[]).slice(0, 5) });
  },

  openOrderDetail(e: any) {
    const orderNo = e.currentTarget?.dataset?.orderNo || '';
    wx.navigateTo({ url: `/pages/merchant/order-detail/order-detail?orderNo=${orderNo}` });
  },

  contactBuyer(e: any) {
    const phone = e.currentTarget.dataset.phone as string;
    wx.showActionSheet({
      itemList: ['电话联系', '复制微信号', '查看订单'],
      success: (res) => {
        if (res.tapIndex === 0 && phone) wx.makePhoneCall({ phoneNumber: phone });
        if (res.tapIndex === 1) wx.setClipboardData({ data: 'buyer_wx_2026' });
        if (res.tapIndex === 2) this.openOrderDetail(e);
      },
    });
  },

  handlePrimaryAction(e: any) {
    const { action, orderNo } = e.currentTarget.dataset;
    if (action === 'accept') this.handleAccept(orderNo);
    else if (action === 'ship') wx.navigateTo({ url: `/pages/merchant/logistics/logistics?orderNo=${orderNo}` });
    else if (action === 'refund') wx.navigateTo({ url: '/pages/merchant/aftersale/aftersale' });
    else if (action === 'logistics') wx.navigateTo({ url: `/pages/merchant/logistics/logistics?orderNo=${orderNo}` });
    else if (action === 'detail') wx.navigateTo({ url: `/pages/merchant/order-detail/order-detail?orderNo=${orderNo}` });
    else wx.showToast({ title: '操作已记录', icon: 'none' });
  },

  async handleAccept(orderNo: string) {
    try {
      await acceptMerchantOrder(orderNo);
      wx.showToast({ title: '已接单', icon: 'success' });
      this.loadOrders();
    } catch (e: any) {
      wx.showToast({ title: e.message || '接单失败', icon: 'none' });
    }
  },
});
