import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantWorkbench } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    nav: [
      { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: true, tab: 0 },
      { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
      { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: false, tab: 2 },
      { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: false, tab: 3 },
      { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
    ],
    quickActions: [
      { title: '发布商品', icon: 'plus', tone: '', url: '/pages/merchant/publish/publish' },
      { title: '发布活动', icon: 'star', tone: 'accent', url: '/pages/merchant/marketing-publish/marketing-publish' },
      { title: '订单处理', icon: 'invoice', tone: 'info', url: '/pages/merchant/orders/orders' },
      { title: '售后', icon: 'shield', tone: 'warn', url: '/pages/merchant/aftersale/aftersale' },
    ],
    sections: [
      {
        title: '商品经营',
        rows: [
          { title: '商品库存', icon: 'package', status: '3个预警', statusType: 'warning', url: '/pages/merchant/products/products' },
          { title: '商品草稿箱', icon: 'edit', value: '8', url: '/pages/merchant/product-drafts/product-drafts' },
          { title: '规格库存', icon: 'invoice', value: '', url: '/pages/merchant/publish-sku/publish-sku' },
        ],
      },
      {
        title: '交易处理',
        rows: [
          { title: '订单管理', icon: 'invoice', status: '6待发货', statusType: 'warning', url: '/pages/merchant/orders/orders' },
          { title: '物流发货', icon: 'truck', value: '', url: '/pages/merchant/logistics/logistics' },
          { title: '退款售后', icon: 'shield', status: '2待处理', statusType: 'danger', url: '/pages/merchant/refund/refund' },
        ],
      },
      {
        title: '营销与数据',
        rows: [
          { title: '营销活动', icon: 'star', value: '', url: '/pages/merchant/marketing/marketing' },
          { title: '资金财务', icon: 'wallet', value: '¥8,920', url: '/pages/merchant/finance/finance' },
          { title: '经营统计', icon: 'discover', value: '', url: '/pages/merchant/statistics/statistics' },
        ],
      },
    ],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(8) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(8) }); this.loadTodos(); },

  async loadTodos() {
    try {
      const wb = await fetchMerchantWorkbench();
      if (!wb || !wb.todos) return;
      const rows = this.data.sections as any[];
      if (rows[0]) rows[0].rows[0].status = `${wb.todos.lowStock || 0}个预警`;
      if (rows[1]) { rows[1].rows[0].status = `${wb.todos.pendingShip || 0}待发货`; rows[1].rows[2].status = `${wb.todos.pendingRefund || 0}待处理`; }
      if (rows[0]) rows[0].rows[1].value = String(wb.todos.draftProducts || 0);
      this.setData({ sections: rows });
    } catch (e: any) {
      wx.showToast({ title: e.message || '工作台加载失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' })
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string
    if (!url) return
    wx.navigateTo({ url })
  },
})
