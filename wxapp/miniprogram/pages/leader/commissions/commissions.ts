import { iconPaths } from '../../../config/icons';
import { buildPageHeaderStyle } from '../../../utils/page-layout';
import { buildLoginUrl } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import {
  fetchLeaderCommissions,
  type CommissionRecord,
} from '../../../services/leader';

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

Component({
  data: {
    loading: true,
    pageStyle: '',
    icons: iconPaths,
    tabs: [
      { key: 'all', label: '全部', active: true },
      { key: 'SETTLED', label: '已结算', active: false },
      { key: 'PENDING', label: '待结算', active: false },
    ],
    activeTab: 'all',
    commissions: [] as CommissionRecord[],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    summary: {
      totalAmount: '0.00',
      pendingAmount: '0.00',
      settledAmount: '0.00',
    },
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageHeaderStyle(8),
      });
      this.loadCommissions(true);
    },
  },
  methods: {
    ensureAccess() {
      const authKind = getAuthTokenType();
      if (authKind === 'access') {
        return true;
      }
      wx.navigateTo({
        url: buildLoginUrl('/pages/leader/commissions/commissions'),
      });
      return false;
    },
    switchTab(e: WechatMiniprogram.BaseEvent) {
      const key = (e.currentTarget.dataset as { key: string }).key;
      const tabs = this.data.tabs.map(tab => ({ ...tab, active: tab.key === key }));
      this.setData({
        tabs,
        activeTab: key,
        commissions: [],
        page: 1,
        hasMore: true,
      });
      this.loadCommissions(true);
    },
    async loadCommissions(refresh = false) {
      if (!this.ensureAccess()) return;
      
      if (!refresh && !this.data.hasMore) return;

      const page = refresh ? 1 : this.data.page;
      this.setData({ loading: refresh });

      try {
        let status: string | undefined;
        if (this.data.activeTab !== 'all') {
          status = this.data.activeTab;
        }

        const data = await fetchLeaderCommissions({
          page,
          pageSize: this.data.pageSize,
          status,
        });

        const list = (data?.items || []).map((item: CommissionRecord) => ({
          ...item,
          timeText: formatDateTime(item.createdAt),
          isIncome: Number(item.amount) > 0,
        }));

        const newList = refresh ? list : [...this.data.commissions, ...list];
        const total = data?.total || 0;
        const hasMore = newList.length < total;

        let totalAmount = 0;
        let pendingAmount = 0;
        let settledAmount = 0;
        newList.forEach((item: CommissionRecord) => {
          const amount = Number(item.amount) || 0;
          totalAmount += amount;
          if (item.status === 'SETTLED') {
            settledAmount += amount;
          } else {
            pendingAmount += amount;
          }
        });

        this.setData({
          commissions: newList,
          total,
          page: page + 1,
          hasMore,
          summary: {
            totalAmount: totalAmount.toFixed(2),
            pendingAmount: pendingAmount.toFixed(2),
            settledAmount: settledAmount.toFixed(2),
          },
          loading: false,
        });
      } catch (e: any) {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },
    onReachBottom() {
      if (this.data.hasMore && !this.data.loading) {
        this.loadCommissions(false);
      }
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
