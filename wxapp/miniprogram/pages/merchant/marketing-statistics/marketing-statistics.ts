import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantActivityStatistics } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    activityName: '',
    orderCount: 0,
    amount: '0',
    conversion: '0',

    chart: [] as Array<{ name: string; height: number }>,

    products: [] as Array<{ id: string; name: string; cover: string; amount: string; sold: number; conversion: string }>,
  },

  onLoad(options: Record<string, string>) {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    if (options.name) this.setData({ activityName: options.name });
    if (options.id) this.loadStats(Number(options.id));
  },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); },

  async loadStats(id: number) {
    try {
      const s = await fetchMerchantActivityStatistics(id);
      if (s) {
        this.setData({
          orderCount: s.orderCount || 0,
          amount: s.payAmount || '0',
          conversion: s.conversionRate || '0',
          chart: (s.trend || []).map(item => ({ name: item.date, height: Math.max(12, Math.min(140, Math.round((item.orderCount || 0) * 4))) })),
          products: (s.products || []).map(item => ({
            id: String(item.productId),
            name: item.title,
            cover: item.coverUrl,
            amount: item.payAmount || '0',
            sold: item.orderCount || 0,
            conversion: item.conversion || '0',
          })),
        });
      }
    } catch {
      this.setData({ chart: [], products: [] });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
  },
});
