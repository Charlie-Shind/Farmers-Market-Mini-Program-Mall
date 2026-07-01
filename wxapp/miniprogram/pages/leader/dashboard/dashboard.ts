import { iconPaths } from '../../../config/icons';
import { buildPageHeaderStyle } from '../../../utils/page-layout';
import { buildLoginUrl } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import { fetchLeaderDashboard, fetchMyPickupPoint, type LeaderDashboard } from '../../../services/leader';

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function buildTrendChart(trend: Array<{ date: string; orders: number; commission: string }>) {
  if (!trend || !trend.length) return [];
  
  const values = trend.map(item => Number(item.commission) || 0);
  const maxValue = Math.max(...values, 1);
  
  return trend.map((item, index) => ({
    name: formatDateTime(item.date),
    value: Number(item.commission) >= 100 ? `${(Number(item.commission) / 100).toFixed(0)}` : item.commission,
    orders: item.orders,
    height: `${Math.max(12, Math.round(((Number(item.commission) || 0) / maxValue) * 100))}%`,
  }));
}

Component({
  data: {
    loading: true,
    pageStyle: '',
    icons: iconPaths,
    overview: {
      totalOrders: 0,
      totalCommission: '0.00',
      todayOrders: 0,
      todayCommission: '0.00',
      pendingPickup: 0,
      availableWithdraw: '0.00',
    },
    metrics: [] as Array<{ label: string; value: string; icon: string; color: string }>,
    quickActions: [
      { key: 'orders', label: '待提货', icon: 'package', color: '#2c4a39', url: '/pages/leader/orders/orders?status=pending' },
      { key: 'commissions', label: '佣金明细', icon: 'wallet', color: '#d8a978', url: '/pages/leader/commissions/commissions' },
      { key: 'pickup', label: '自提点', icon: 'location', color: '#5b8def', url: '' },
      { key: 'allOrders', label: '全部订单', icon: 'menu', color: '#8b5cf6', url: '/pages/leader/orders/orders' },
    ],
    chartTabs: [
      { name: '佣金', active: true },
      { name: '订单', active: false },
    ],
    activeChartTab: 0,
    trend: [] as any[],
    recentOrders: [] as any[],
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageHeaderStyle(8),
      });
      this.loadData();
    },
  },
  pageLifetimes: {
    show() {
      if (!this.ensureAccess()) {
        return;
      }
      this.loadData();
    },
  },
  methods: {
    ensureAccess() {
      const authKind = getAuthTokenType();
      if (authKind === 'access') {
        return true;
      }
      wx.navigateTo({
        url: buildLoginUrl('/pages/leader/dashboard/dashboard'),
      });
      return false;
    },
    async loadData() {
      this.setData({ loading: true });
      try {
        const data = await fetchLeaderDashboard();
        if (!data) {
          this.setData({ loading: false });
          return;
        }

        const metrics = [
          { label: '累计订单', value: String(data.overview?.totalOrders || 0), icon: 'cart', color: '#2c4a39' },
          { label: '累计佣金', value: data.overview?.totalCommission || '0.00', icon: 'wallet', color: '#d8a978' },
          { label: '今日订单', value: String(data.overview?.todayOrders || 0), icon: 'discover', color: '#5b8def' },
          { label: '今日佣金', value: data.overview?.todayCommission || '0.00', icon: 'points', color: '#f59e0b' },
          { label: '待提货', value: String(data.overview?.pendingPickup || 0), icon: 'package', color: '#ef4444' },
          { label: '可提现', value: data.overview?.availableWithdraw || '0.00', icon: 'wallet', color: '#10b981' },
        ];

        const trendData = buildTrendChart(data.trend || []);
        const recentOrders = (data.recentOrders || []).map(item => ({
          ...item,
          timeText: formatDateTime(item.createdAt),
        }));

        this.setData({
          overview: data.overview || this.data.overview,
          metrics,
          trend: trendData,
          recentOrders,
          loading: false,
        });
      } catch (e: any) {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },
    onChartTabTap(e: any) {
      const index = Number(e.currentTarget.dataset.index);
      const chartTabs = (this.data.chartTabs as any[]).map((item, idx) => ({ ...item, active: idx === index }));
      this.setData({
        chartTabs,
        activeChartTab: index,
      });
    },
    goPage(e: any) {
      const key = e.currentTarget.dataset.key;
      if (key === 'pickup') {
        this.goPickupEntry();
        return;
      }
      const url = e.currentTarget.dataset.url;
      if (url) {
        wx.navigateTo({ url });
      }
    },
    async goPickupEntry() {
      try {
        const point = await fetchMyPickupPoint();
        if (point?.id) {
          wx.navigateTo({
            url: `/pages/leader/pickup-detail/pickup-detail?id=${point.id}&from=leader`,
          });
          return;
        }
      } catch {
        // fall through to setup page
      }
      wx.navigateTo({
        url: '/pages/leader/pickup-edit/pickup-edit',
      });
    },
    goOrders(e: any) {
      const status = e.currentTarget.dataset.status || '';
      wx.navigateTo({
        url: `/pages/leader/orders/orders?status=${status}`,
      });
    },
    goCommissions() {
      wx.navigateTo({ url: '/pages/leader/commissions/commissions' });
    },
    goPickupPoint() {
      this.goPickupEntry();
    },
    goBack() {
      wx.navigateBack({ delta: 1 });
    },
    showToast(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') {
      this.setData({
        toastMessage: message,
        toastType: type,
        toastVisible: true,
      });
    },
    hideToast() {
      this.setData({
        toastVisible: false,
      });
    },
  },
});
