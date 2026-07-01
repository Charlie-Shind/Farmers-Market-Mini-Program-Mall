import { buildPageTopStyle } from '../../../utils/page-layout';
import {
  fetchMerchantSecurity,
  updateMerchantSecurity,
  type MerchantSecurity,
} from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loginProtect: true,
    withdrawConfirm: true,
    lastLoginAt: '',
    deviceManageEnabled: false,
    operationLogEnabled: false,
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    this.loadSecuritySettings();
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  async loadSecuritySettings() {
    const settings: MerchantSecurity | null = await fetchMerchantSecurity();
    if (settings) {
      this.setData({
        loginProtect: settings.loginProtect ?? true,
        withdrawConfirm: settings.withdrawConfirm ?? true,
        lastLoginAt: settings.lastLoginAt || '',
        deviceManageEnabled: false,
        operationLogEnabled: false,
      });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/shop/shop' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  async onLoginProtectChange(e: any) {
    const val = e.detail.value;
    this.setData({ loginProtect: val });
    try { await updateMerchantSecurity({ loginProtect: val }); } catch { /* 静默 */ }
  },

  async onWithdrawConfirmChange(e: any) {
    const val = e.detail.value;
    this.setData({ withdrawConfirm: val });
    try { await updateMerchantSecurity({ withdrawConfirm: val }); } catch { /* 静默 */ }
  },

  onTapDeviceManage() {
    wx.showToast({ title: '设备管理暂未开放', icon: 'none' });
  },

  onTapOperationLog() {
    wx.showToast({ title: '操作日志暂未开放', icon: 'none' });
  },
});
