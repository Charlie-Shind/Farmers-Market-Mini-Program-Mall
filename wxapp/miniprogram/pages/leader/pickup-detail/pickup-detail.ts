import { iconPaths } from '../../../config/icons';
import { buildPageHeaderStyle } from '../../../utils/page-layout';
import { fetchPickupPointDetail, fetchMyPickupPoint, type PickupPointDetail } from '../../../services/leader';
import { getAuthUserRole } from '../../../services/token';

Component({
  data: {
    loading: true,
    pageStyle: '',
    icons: iconPaths,
    pointId: 0,
    fromLeader: false,
    isLeader: false,
    point: null as PickupPointDetail | null,
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
      const id = Number(currentPage?.options?.id || 0);
      const from = currentPage?.options?.from || '';

      this.setData({
        pointId: id,
        fromLeader: from === 'leader',
        isLeader: getAuthUserRole() === 'LEADER',
      });

      if (from === 'leader') {
        this.loadLeaderPoint();
      } else {
        this.loadPointDetail();
      }
    },
  },
  methods: {
    async loadPointDetail() {
      if (!this.data.pointId) {
        this.setData({ loading: false });
        return;
      }

      this.setData({ loading: true });
      try {
        const point = await fetchPickupPointDetail(this.data.pointId);
        this.setData({
          point,
          loading: false,
        });
      } catch (e: any) {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },
    async loadLeaderPoint() {
      this.setData({ loading: true });
      try {
        const targetId = this.data.pointId;
        if (targetId > 0) {
          const point = await fetchPickupPointDetail(targetId);
          this.setData({ point, loading: false });
          return;
        }

        const point = await fetchMyPickupPoint();
        this.setData({ point, loading: false });
      } catch (e: any) {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },
    openLocation() {
      const point = this.data.point;
      if (!point) return;

      wx.openLocation({
        latitude: point.latitude,
        longitude: point.longitude,
        name: point.storeName,
        address: point.storeAddress,
        scale: 18,
      });
    },
    callPhone() {
      const point = this.data.point;
      if (!point || !point.leaderPhone) return;

      wx.makePhoneCall({
        phoneNumber: point.leaderPhone,
      });
    },
    goEdit() {
      wx.navigateTo({
        url: '/pages/leader/pickup-edit/pickup-edit',
      });
    },
    goSetupPickup() {
      wx.navigateTo({
        url: '/pages/leader/pickup-edit/pickup-edit',
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
