import { iconPaths } from '../../../config/icons';
import { getAuthUserRole, getAuthTokenType } from '../../../services/token';
import { clearUserLocalState } from '../../../services/auth';
import { buildPageTopStyle } from '../../../utils/page-layout';

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    userRole: '',
    isLoggedIn: false,
  },

  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(),
      });
    },
  },

  pageLifetimes: {
    show() {
      const tokenType = getAuthTokenType();
      const userRole = getAuthUserRole();
      this.setData({
        userRole: userRole || '',
        isLoggedIn: tokenType === 'access',
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
