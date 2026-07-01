import { iconPaths } from '../../../config/icons';
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

Component({
  data: {
    addressId: 0,
    receiverName: '',
    receiverMobile: '',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    isDefault: false,
    regionValue: [] as string[],
    icons: iconPaths,
    pageStyle: '',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
      });
    },
  },
  pageLifetimes: {
    show() {
      void this.bootstrapPage();
    },
  },
  methods: {
    async bootstrapPage() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      const addressId = options.addressId ? Number(options.addressId) : 0;

      if (addressId > 0 && addressId !== this.data.addressId) {
        this.setData({
          addressId,
        });
        await this.loadAddressDetails(addressId);
        return;
      }

      if (addressId <= 0 && this.data.addressId !== 0) {
        this.setData({
          addressId: 0,
          receiverName: '',
          receiverMobile: '',
          province: '',
          city: '',
          district: '',
          detailAddress: '',
          isDefault: false,
          regionValue: [],
        });
      }
    },
    async loadAddressDetails(addressId: number) {
      wx.showLoading({ title: '加载中…' });

      try {
        const list = await fetchAddresses();
        const address = list.find((item) => item.id === addressId);

        if (!address) {
          wx.showToast({ title: '地址不存在或已被删除', icon: 'none' });
          setTimeout(() => this.goBack(), 1500);
          return;
        }

        this.setData({
          receiverName: address.receiverName,
          receiverMobile: address.receiverMobile,
          province: address.province,
          city: address.city,
          district: address.district,
          detailAddress: address.detailAddress,
          isDefault: address.isDefault,
          regionValue: [address.province, address.city, address.district],
        });
      } catch {
        wx.showToast({ title: '获取地址详情失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    onNameInput(e: WechatMiniprogram.Input) {
      this.setData({
        receiverName: String(e.detail.value ?? ''),
      });
    },
    onMobileInput(e: WechatMiniprogram.Input) {
      this.setData({
        receiverMobile: String(e.detail.value ?? ''),
      });
    },
    onRegionChange(e: WechatMiniprogram.CustomEvent & { detail?: { value?: string[] } }) {
      const value = e.detail?.value || [];
      this.setData({
        province: value[0] || '',
        city: value[1] || '',
        district: value[2] || '',
        regionValue: value,
      });
    },
    onDetailInput(e: WechatMiniprogram.Input) {
      this.setData({
        detailAddress: String(e.detail.value ?? ''),
      });
    },
    onDefaultChange(e: WechatMiniprogram.CustomEvent & { detail?: { value?: boolean } }) {
      this.setData({
        isDefault: e.detail?.value === true,
      });
    },
    async submitSave() {
      const name = this.data.receiverName.trim();
      const mobile = this.data.receiverMobile.trim();
      const { province, city, district } = this.data;
      const detail = this.data.detailAddress.trim();

      if (!name) {
        wx.showToast({ title: '请输入收货人姓名', icon: 'none' });
        return;
      }

      if (!mobile) {
        wx.showToast({ title: '请输入手机号', icon: 'none' });
        return;
      }

      // Basic mobile phone validation
      if (!/^\d{11}$/.test(mobile)) {
        wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' });
        return;
      }

      if (!province || !city || !district) {
        wx.showToast({ title: '请选择所在地区', icon: 'none' });
        return;
      }

      if (!detail) {
        wx.showToast({ title: '请填写详细地址', icon: 'none' });
        return;
      }

      const payload = {
        receiverName: name,
        receiverMobile: mobile,
        province,
        city,
        district,
        detailAddress: detail,
        isDefault: this.data.isDefault,
      };

      wx.showLoading({ title: '正在保存…' });

      try {
        if (this.data.addressId > 0) {
          await updateAddress(this.data.addressId, payload);
          wx.showToast({ title: '保存成功', icon: 'success' });
        } else {
          await createAddress(payload);
          wx.showToast({ title: '添加成功', icon: 'success' });
        }

        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
      } catch (err: any) {
        wx.showToast({ title: err.message || '保存失败，请稍后重试', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },
    submitDelete() {
      wx.showModal({
        title: '提示',
        content: '确定要删除这个收货地址吗？',
        cancelText: '取消',
        confirmText: '删除',
        confirmColor: '#e54938',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '正在删除…' });
            try {
              await deleteAddress(this.data.addressId);
              wx.showToast({ title: '删除成功', icon: 'success' });
              setTimeout(() => {
                wx.navigateBack();
              }, 1200);
            } catch {
              wx.showToast({ title: '删除失败，请重试', icon: 'none' });
            } finally {
              wx.hideLoading();
            }
          }
        },
      });
    },
  },
});
