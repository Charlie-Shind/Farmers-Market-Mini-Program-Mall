import { iconPaths } from '../../../config/icons';
import { getAuthUserRole, getAuthTokenType, getAvailableRoles } from '../../../services/token';
import { clearUserLocalState, switchRole } from '../../../services/auth';
import { buildPageTopStyle } from '../../../utils/page-layout';

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    userRole: '',
    isLoggedIn: false,
    canSwitchToMerchant: false,
    appVersion: '1.0.0',
  },

  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });

      try {
        const version = wx.getAccountInfoSync?.()?.miniProgram?.version;
        if (version) {
          this.setData({ appVersion: version });
        }
      } catch {
        // Keep the fallback version when the API is unavailable (e.g. dev tools).
      }
    },
  },

  pageLifetimes: {
    show() {
      const tokenType = getAuthTokenType();
      const userRole = getAuthUserRole();
      this.setData({
        userRole: userRole || '',
        isLoggedIn: tokenType === 'access',
        canSwitchToMerchant: getAvailableRoles().includes('MERCHANT'),
      });
    },
  },

  methods: {
    goBack() {
      wx.navigateBack({
        delta: 1,
      });
    },

    goToEdit() {
      wx.navigateTo({
        url: '/pages/profile/edit/edit',
      });
    },

    goToApply() {
      wx.navigateTo({
        url: '/pages/profile/apply/apply',
      });
    },

    openPlaceholder(e: WechatMiniprogram.BaseEvent) {
      const { label } = (e.currentTarget.dataset as { label?: string }) || {};
      wx.showToast({ title: label ? `${label}功能开发中` : '功能开发中', icon: 'none' });
    },

    handleSwitchToMerchant() {
      wx.showModal({
        title: '切换角色',
        content: '确定要切换到商户端吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '切换中' });
              await switchRole('MERCHANT');
              wx.hideLoading();
              wx.showToast({ title: '切换成功', icon: 'success' });
              setTimeout(() => {
                wx.reLaunch({ url: '/pages/merchant/dashboard/dashboard' });
              }, 800);
            } catch (error) {
              wx.hideLoading();
              wx.showToast({ title: '切换失败', icon: 'none' });
            }
          }
        },
      });
    },

    handleLogout() {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            clearUserLocalState();
            wx.showToast({
              title: '已退出登录',
              icon: 'success',
            });
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index',
              });
            }, 800);
          }
        },
      });
    },
  },
});
