import { iconPaths } from '../../../config/icons';
import { fetchAddresses, type AppAddress } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

Component({
  data: {
    addresses: [] as AppAddress[],
    icons: iconPaths,
    pageStyle: '',
    mode: '', // 'select' or ''
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  pageLifetimes: {
    show() {
      void this.bootstrapPage();
      void this.loadAddresses(true);
    },
  },
  methods: {
    async bootstrapPage() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      this.setData({
        mode: options.mode || '',
      });
    },
    async loadAddresses(silent = false) {
      if (!silent) {
        wx.showLoading({ title: '加载中…' });
      }

      try {
        const addresses = await fetchAddresses();
        this.setData({
          addresses: addresses || [],
        });
      } catch {
        if (!silent) {
          wx.showToast({ title: '获取地址列表失败', icon: 'none' });
        }
      } finally {
        if (!silent) {
          wx.hideLoading();
        }
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    handleAddressTap(e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number }) || {};
      if (index === undefined) {
        return;
      }

      const address = this.data.addresses[index];
      if (!address) {
        return;
      }

      if (this.data.mode === 'select') {
        // Return address to Checkout
        try {
          const eventChannel = this.getOpenerEventChannel();
          if (eventChannel && typeof eventChannel.emit === 'function') {
            eventChannel.emit('selectAddress', address);
          }
        } catch {
          // Ignore event channel errors
        }

        // Set global variable as backup
        try {
          const app = getApp<any>();
          if (app) {
            app.globalData = app.globalData || {};
            app.globalData.selectedAddress = address;
          }
        } catch {
          // Ignore global variable errors
        }

        wx.navigateBack();
        return;
      }

      // Default to edit address
      this.navToEditDetails(address.id);
    },
    navToEdit(e: WechatMiniprogram.BaseEvent) {
      const { id } = (e.currentTarget.dataset as { id?: number | string }) || {};
      if (id === undefined) {
        return;
      }

      this.navToEditDetails(Number(id));
    },
    navToEditDetails(addressId: number) {
      wx.navigateTo({
        url: `/pages/address/edit/edit?addressId=${addressId}`,
      });
    },
    navToCreate() {
      wx.navigateTo({
        url: '/pages/address/edit/edit',
      });
    },
  },
});
