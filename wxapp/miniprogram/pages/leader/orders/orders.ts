import { iconPaths } from '../../../config/icons';
import { buildPageHeaderStyle } from '../../../utils/page-layout';
import { buildLoginUrl } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import {
  fetchLeaderOrders,
  confirmPickup,
  type LeaderOrder,
} from '../../../services/leader';

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

Component({
  data: {
    loading: true,
    pageStyle: '',
    icons: iconPaths,
    tabs: [
      { key: 'all', label: '全部', active: true },
      { key: 'pending', label: '待提货', active: false },
      { key: 'picked', label: '已提货', active: false },
    ],
    activeTab: 'all',
    orders: [] as LeaderOrder[],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageHeaderStyle(8),
      });
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1] as any;
      const status = currentPage?.options?.status || '';
      if (status === 'pending') {
        this.switchTab({ currentTarget: { dataset: { key: 'pending' } } } as any);
      } else {
        this.loadOrders(true);
      }
    },
  },
  methods: {
    ensureAccess() {
      const authKind = getAuthTokenType();
      if (authKind === 'access') {
        return true;
      }
      wx.navigateTo({
        url: buildLoginUrl('/pages/leader/orders/orders'),
      });
      return false;
    },
    switchTab(e: WechatMiniprogram.BaseEvent) {
      const key = (e.currentTarget.dataset as { key: string }).key;
      const tabs = this.data.tabs.map(tab => ({ ...tab, active: tab.key === key }));
      this.setData({
        tabs,
        activeTab: key,
        orders: [],
        page: 1,
        hasMore: true,
      });
      this.loadOrders(true);
    },
    async loadOrders(refresh = false) {
      if (!this.ensureAccess()) return;
      
      if (!refresh && !this.data.hasMore) return;

      const page = refresh ? 1 : this.data.page;
      this.setData({ loading: refresh });

      try {
        let pickupStatus: string | undefined;
        if (this.data.activeTab === 'pending') {
          pickupStatus = 'PENDING';
        } else if (this.data.activeTab === 'picked') {
          pickupStatus = 'PICKED_UP';
        }

        const data = await fetchLeaderOrders({
          page,
          pageSize: this.data.pageSize,
          pickupStatus,
        });

        const orderList = (data?.items || []).map((item: LeaderOrder) => ({
          ...item,
          timeText: formatDateTime(item.createdAt),
          canPickup: item.pickupStatus === 'PENDING',
        }));

        const newOrders = refresh ? orderList : [...this.data.orders, ...orderList];
        const total = data?.total || 0;
        const hasMore = newOrders.length < total;

        this.setData({
          orders: newOrders,
          total,
          page: page + 1,
          hasMore,
          loading: false,
        });
      } catch (e: any) {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },
    onReachBottom() {
      if (this.data.hasMore && !this.data.loading) {
        this.loadOrders(false);
      }
    },
    onPullDownRefresh() {
      this.loadOrders(true).then(() => {
        wx.stopPullDownRefresh();
      });
    },
    async handleConfirmPickup(e: WechatMiniprogram.BaseEvent) {
      const orderNo = (e.currentTarget.dataset as { orderNo: string }).orderNo;
      if (!orderNo) return;

      wx.showModal({
        title: '确认提货',
        content: '请确认用户已到店提货？',
        success: async (res) => {
          if (!res.confirm) return;

          try {
            await confirmPickup(orderNo);
            this.showToast('确认提货成功', 'success');
            this.loadOrders(true);
          } catch (err: any) {
            this.showToast(err.message || '操作失败', 'danger');
          }
        }
      });
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
