import { iconPaths } from '../../../config/icons';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchPickupPoints, type PickupPoint } from '../../../services/leader';

Component({
  data: {
    loading: true,
    pageStyle: '',
    icons: iconPaths,
    keyword: '',
    pickupPoints: [] as PickupPoint[],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    location: {
      latitude: 0,
      longitude: 0,
    },
    locationEnabled: false,
    selectMode: false,
    selectedId: 0,
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
      
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1] as any;
      const selectMode = currentPage?.options?.select === '1';
      const selectedId = Number(currentPage?.options?.selectedId || 0);
      
      this.setData({
        selectMode: !!selectMode,
        selectedId,
      });

      this.getLocation();
    },
  },
  methods: {
    getLocation() {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.setData({
            location: {
              latitude: res.latitude,
              longitude: res.longitude,
            },
            locationEnabled: true,
          });
          this.loadPickupPoints(true);
        },
        fail: () => {
          this.setData({
            locationEnabled: false,
          });
          this.loadPickupPoints(true);
        }
      });
    },
    onSearchInput(e: WechatMiniprogram.Input) {
      this.setData({
        keyword: e.detail.value,
      });
    },
    onSearch() {
      this.loadPickupPoints(true);
    },
    async loadPickupPoints(refresh = false) {
      if (!refresh && !this.data.hasMore) return;

      const page = refresh ? 1 : this.data.page;
      this.setData({ loading: refresh });

      try {
        const data = await fetchPickupPoints({
          page,
          pageSize: this.data.pageSize,
          keyword: this.data.keyword || undefined,
          latitude: this.data.locationEnabled ? this.data.location.latitude : undefined,
          longitude: this.data.locationEnabled ? this.data.location.longitude : undefined,
        });

        const list = (data?.items || []).map((item: PickupPoint) => ({
          ...item,
          isSelected: item.id === this.data.selectedId,
        }));

        const newList = refresh ? list : [...this.data.pickupPoints, ...list];
        const total = data?.total || 0;
        const hasMore = newList.length < total;

        this.setData({
          pickupPoints: newList,
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
        this.loadPickupPoints(false);
      }
    },
    onPullDownRefresh() {
      this.getLocation();
    },
    goDetail(e: WechatMiniprogram.BaseEvent) {
      const id = (e.currentTarget.dataset as { id: number }).id;
      if (this.data.selectMode) {
        this.selectPickupPoint(e);
        return;
      }
      wx.navigateTo({
        url: `/pages/leader/pickup-detail/pickup-detail?id=${id}`,
      });
    },
    selectPickupPoint(e: WechatMiniprogram.BaseEvent) {
      const id = (e.currentTarget.dataset as { id: number }).id;
      const item = this.data.pickupPoints.find(p => p.id === id);
      if (!item) return;

      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2] as any;
      if (prevPage && typeof prevPage.onPickupPointSelected === 'function') {
        prevPage.onPickupPointSelected(item);
      }
      
      wx.navigateBack({ delta: 1 });
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
