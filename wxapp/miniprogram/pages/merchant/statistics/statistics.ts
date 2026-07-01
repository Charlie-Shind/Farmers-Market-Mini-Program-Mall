import { buildPageTopStyle } from '../../../utils/page-layout';
import {
  fetchMerchantStatisticsOverview,
  type MerchantStatisticsOverview,
} from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    weekTotal: '18,420',
    weekTrend: '较上周提升 12%',
    summaryData: [
      { label: '订单数', value: '186' },
      { label: '访客', value: '2,340' },
      { label: '支付转化', value: '7.9%' },
    ],
    chartData: [] as any[],
    rankings: [] as any[],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    this.loadStatistics();
  },

  async loadStatistics() {
    try {
      const overview: MerchantStatisticsOverview = await fetchMerchantStatisticsOverview('7d');
      this.setData({
        weekTotal: overview.payAmount || '0',
        weekTrend: `退款率 ${overview.refundRate || '0'}%`,
        summaryData: [
          { label: '订单数', value: String(overview.orderCount || '0') },
          { label: '访客', value: String(overview.visitorCount || '0') },
          { label: '支付转化', value: overview.conversionRate || '0%' },
        ],
      });
      if (overview.trend && overview.trend.length) {
        const maxAmount = Math.max(...overview.trend.map(t => Number(t.payAmount) || 0), 1);
        const chart = overview.trend.map((t, index) => ({
          name: t.date.slice(-2).replace(/^0/, '') || t.date,
          height: Math.max(12, Math.round((Number(t.payAmount) || 0) / maxAmount * 100)) + '%',
          value: `${Math.round((Number(t.payAmount) || 0) / 1000)}k`,
          accent: index % 2 === 1,
        }));
        this.setData({ chartData: chart });
      }
      if (overview.topProducts && overview.topProducts.length) {
        const ranks = overview.topProducts.map((p, i) => ({
          id: p.productId, index: i + 1, thumb: p.coverUrl || '/assets/goods/g2.svg',
          title: p.title, desc: `成交 ${p.orderCount} 件`, value: '¥' + (p.payAmount || '0'),
        }));
        this.setData({ rankings: ranks });
      }
    } catch (e: any) {
      wx.showToast({ title: e.message || '统计加载失败', icon: 'none' });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },
});
