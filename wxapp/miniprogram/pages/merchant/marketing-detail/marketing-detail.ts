import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantActivityDetail, fetchMerchantActivityStatistics, pauseMerchantActivity, finishMerchantActivity } from '../../../services/merchant';

const TYPE_MAP: Record<string, string> = {
  SECKILL: '限时秒杀',
  GROUP_BUY: '拼团活动',
  CASHBACK: '满减优惠券',
  PRESALE: '预售活动',
};

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    activityName: '',
    typeName: '',
    statusText: '',
    statusClass: 'info',
    timeDesc: '',
    orderCount: 0,
    amount: '0',
    remainStock: 0,

    products: [] as any[],

    timeline: [] as any[],
  },

  onLoad(options: Record<string, string>) {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    if (options.id) this.loadDetail(Number(options.id));
  },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(8) }); },

  async loadDetail(id: number) {
    try {
      const [d, s] = await Promise.all([
        fetchMerchantActivityDetail(id).catch(() => null),
        fetchMerchantActivityStatistics(id).catch(() => null),
      ]);
      if (d) {
        const singleProduct = (d.products || []).slice(0, 1).map((item) => ({
          id: String(item.id || item.productId),
          name: item.title,
          cover: item.coverUrl,
          price: item.activityPrice,
          stock: item.activityStock,
          sold: item.soldCount,
          status: '已参加',
          tag: 'success',
        }));
        this.setData({
          activityName: d.title || '',
          typeName: TYPE_MAP[d.activityType] || d.activityType || '',
          statusText: d.status || '',
          timeDesc: d.startAt && d.endAt ? `${d.startAt.slice(0, 16)} - ${d.endAt.slice(0, 16)}` : '',
          products: singleProduct,
          timeline: [
            { title: '活动开始', desc: d.startAt ? `${d.startAt.slice(0, 16)} 自动上线` : '已上线' },
            { title: '活动结束', desc: d.endAt ? `${d.endAt.slice(0, 16)} 自动结束` : '待结束' },
          ],
        });
      }
      if (s) {
        this.setData({
          orderCount: s.orderCount || 0,
          amount: s.payAmount || '0',
          remainStock: s.remainStock || 0,
        });
      }
    } catch {}
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
  },

  goEdit() {
    wx.navigateTo({ url: '/pages/merchant/marketing-edit/marketing-edit' });
  },

  goProducts() {
    wx.navigateTo({ url: '/pages/merchant/marketing-products/marketing-products' });
  },

  goStatistics() {
    wx.navigateTo({ url: '/pages/merchant/marketing-statistics/marketing-statistics' });
  },

  pauseActivity() {
    wx.showModal({
      title: '确认暂停', content: '暂停后活动将不再在前端展示', confirmColor: '#B7791F',
      success: async (res) => {
        if (!res.confirm) return;
        try { await pauseMerchantActivity(Number(this.data.activityId || 0)); this.setData({ statusText: '已暂停', statusClass: 'warning' }); wx.showToast({ title: '已暂停', icon: 'success' }); }
        catch (e: any) { wx.showToast({ title: e.message || '操作失败', icon: 'none' }); }
      },
    });
  },

  endActivity() {
    wx.showModal({
      title: '确认结束', content: '结束后活动将不可恢复', confirmColor: '#A6453A',
      success: async (res) => {
        if (!res.confirm) return;
        try { await finishMerchantActivity(Number(this.data.activityId || 0)); this.setData({ statusText: '已结束', statusClass: 'danger' }); wx.showToast({ title: '已结束', icon: 'success' }); }
        catch (e: any) { wx.showToast({ title: e.message || '操作失败', icon: 'none' }); }
      },
    });
  },
});
