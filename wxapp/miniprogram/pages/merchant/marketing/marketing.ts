import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantActivities, deleteMerchantActivity, type MerchantActivity } from '../../../services/merchant';

const TYPE_MAP: Record<string, string> = {
  SECKILL: '限时秒杀', GROUP_BUY: '拼团活动', CASHBACK: '满减优惠券', PRESALE: '预售活动',
};

function mapRules(item: MerchantActivity) {
  if (item.coupon) return [
    { value: `¥${item.coupon.thresholdAmount}`, label: '使用门槛' },
    { value: `¥${item.coupon.discountAmount}`, label: '优惠金额' },
    { value: `${item.coupon.stock}张`, label: '库存' },
  ];
  return [
    { value: `${item.productCount}件`, label: '关联商品' },
    { value: item.startAt?.slice(0, 10) || '-', label: '开始' },
    { value: item.endAt?.slice(0, 10) || '-', label: '结束' },
  ];
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loading: true,
    searchValue: '',
    weekAmount: '0',
    runningCount: 0,
    stockRate: 0,
    tabs: [
      { name: '全部', active: true }, { name: '进行中', active: false },
      { name: '草稿', active: false }, { name: '已结束', active: false },
    ],
    allActivities: [] as any[],
    activities: [] as any[],
    nav: [
      { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: false, tab: 0 },
      { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
      { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: false, tab: 2 },
      { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: false, tab: 3 },
      { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
    ],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadActivities(); },

  async loadActivities() {
    this.setData({ loading: true });
    try {
      const result = await fetchMerchantActivities();
      const items = ((result as any).items || result || []) as MerchantActivity[];
      const all = items.map((a: MerchantActivity) => ({
        id: String(a.id || a.activityId),
        name: a.title,
        typeName: TYPE_MAP[a.type || a.activityType] || a.type || a.activityType || '活动',
        timeText: a.startAt ? `${a.startAt.slice(0, 10)} - ${a.endAt?.slice(0, 10) || ''}` : '',
        statusText: a.status === 'PUBLISHED' ? '进行中' : a.status === 'DRAFT' ? '草稿' : a.status || '',
        statusClass: a.status === 'PUBLISHED' ? 'success' : a.status === 'DRAFT' ? 'warning' : 'info',
        cover: '/assets/goods/g2.svg',
        rules: mapRules(a),
        percent: Math.min(100, ((a.orderCount || 0) / Math.max(1, a.productCount || 1)) * 100),
        progressText: a.orderCount ? `已售 ${a.orderCount} 单` : '',
      }));
      const running = all.filter((a: any) => a.statusText === '进行中').length;
      this.setData({ allActivities: all, activities: all, runningCount: running, loading: false }, () => this.applyFilter());
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const all = this.data.allActivities as any[];
    const activeTab = (this.data.tabs as any[]).find((t: any) => t.active);
    const tab = activeTab?.name;
    let filtered: any[];
    if (!tab || tab === '全部') filtered = all;
    else if (tab === '进行中') filtered = all.filter((a: any) => a.statusText === '进行中');
    else if (tab === '草稿') filtered = all.filter((a: any) => a.statusText === '草稿');
    else filtered = all.filter((a: any) => a.statusText === '已结束');
    const kw = (this.data.searchValue as string || '').toLowerCase();
    if (kw) filtered = filtered.filter((a: any) => a.name.toLowerCase().includes(kw));
    this.setData({ activities: filtered });
  },

  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); } },
  goPage(e: any) { const url = e.currentTarget.dataset.url; if (url) wx.navigateTo({ url }); },
  goPublish() { wx.navigateTo({ url: '/pages/merchant/marketing-edit/marketing-edit' }); },
  goDrafts() { wx.navigateTo({ url: '/pages/merchant/marketing-drafts/marketing-drafts' }); },
  goStatistics() { wx.navigateTo({ url: '/pages/merchant/marketing-statistics/marketing-statistics' }); },
  goDetail(e: any) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/merchant/marketing-detail/marketing-detail?id=${id}` }); },
  goEdit(e: any) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/merchant/marketing-edit/marketing-edit?id=${id}` }); },

  async deleteActivity(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '删除后活动数据将无法恢复', confirmColor: '#A6453A',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await deleteMerchantActivity(Number(id));
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadActivities();
        } catch (err: any) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  onSearchInput(e: any) { this.setData({ searchValue: e.detail.value }, () => this.applyFilter()); },

  onTabTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const tabs = (this.data.tabs as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    this.setData({ tabs }, () => this.applyFilter());
  },
});
