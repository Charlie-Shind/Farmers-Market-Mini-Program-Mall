import { iconPaths } from '../../config/icons';
import {
  fetchAddresses,
  fetchCartItemCount,
  fetchFavorites,
  fetchMe,
  fetchOrders,
  fetchPointsLogs,
  fetchUnreadMessageCount,
  fetchUserCoupons,
} from '../../services/app';
import { buildProfileLoginUrl } from '../../utils/auth-route';
import {
  getAuthTokenType,
  getAuthUserRole,
  setToken,
  setGuestMode,
} from '../../services/token';
import { refreshToken, clearUserLocalState } from '../../services/auth';
import { maskPhone } from '../../utils/util';
import { merchantHomeRoute } from '../../config/merchant';
import { loadProfileDraft } from '../../services/profile';
import { fetchLeaderApplication } from '../../services/leader';
import { buildPageTopStyle } from '../../utils/page-layout';

type ToastType = 'info' | 'success' | 'warning' | 'danger';

type ProfileOrderEntry = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  badge?: string;
};

type ProfileServiceEntry = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
};

type ProfileState = {
  user: {
    name: string;
    phone: string;
    avatarSrc: string;
  };
  stats: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  orders: ProfileOrderEntry[];
  services: ProfileServiceEntry[];
};

type AddressPreview = {
  id: number;
  title: string;
  desc: string;
  tag: string;
};

type CouponPreview = {
  id: number;
  name: string;
  desc: string;
  tag: string;
};

type PointPreview = {
  id: number;
  title: string;
  desc: string;
  points: number;
  createdAt: string;
};

function formatDateTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

Component({
  data: {
    profile: {
      user: {
        name: '加载中',
        phone: '正在获取真实数据',
        avatarSrc: iconPaths.defaultAvatar as string,
      },
      stats: [
        { key: 'points', label: '积分', value: '--' },
        { key: 'coupon', label: '优惠券', value: '--' },
        { key: 'favorite', label: '收藏', value: '--' },
      ],
      orders: [
        { key: 'pay', label: '待付款', icon: 'wallet', iconColor: '#d97b2a' },
        { key: 'ship', label: '待发货', icon: 'truck', iconColor: '#2c4a39' },
        { key: 'receive', label: '待收货', icon: 'delivering', iconColor: '#3d7a57' },
        { key: 'comment', label: '待评价', icon: 'star', iconColor: '#b8864d' },
        { key: 'refund', label: '售后/退款', icon: 'refund', iconColor: '#c04f42' },
      ] as ProfileOrderEntry[],
      services: [
        { key: 'address', label: '地址管理', icon: 'map', iconColor: '#2c4a39' },
        { key: 'coupon', label: '卡券包', icon: 'coupon', iconColor: '#d97b2a' },
        { key: 'points', label: '我的积分', icon: 'points', iconColor: '#3d7a57' },
        { key: 'favorite', label: '我的收藏', icon: 'favorite', iconColor: '#c04f42' },
        { key: 'history', label: '浏览记录', icon: 'history', iconColor: '#5a6b62' },
        { key: 'follow', label: '我的关注', icon: 'follow', iconColor: '#b8864d' },
        { key: 'help', label: '联系客服', icon: 'support', iconColor: '#2c4a39' },
        { key: 'feedback', label: '意见反馈', icon: 'feedback', iconColor: '#4d6b58' },
      ] as ProfileServiceEntry[],
    } as ProfileState,
    cardAssets: {
      leaderBg: '/assets/profile/leader-bg.jpg',
      traceBg: '/assets/profile/trace-bg.jpg',
    },
    authKind: '',
    icons: iconPaths,
    redirecting: false,
    addresses: [] as Array<{
      id: number;
      receiverName: string;
      receiverMobile: string;
      province: string;
      city: string;
      district: string;
      detailAddress: string;
      isDefault: boolean;
    }>,
    coupons: [] as Array<{
      couponId: number;
      name: string;
      discountAmount: string;
      thresholdAmount: string;
      received: boolean;
    }>,
    pointLogs: [] as Array<{
      id: number;
      changeType: string;
      points: number;
      sourceType: string;
      sourceNo: string;
      remark: string;
      createdAt: string;
    }>,
    addressPreview: [] as AddressPreview[],
    couponPreview: [] as CouponPreview[],
    pointPreview: [] as PointPreview[],
    favoriteCount: 0,
    orderSummary: {
      total: 0,
      pay: 0,
      ship: 0,
      receive: 0,
      comment: 0,
      refund: 0,
    },
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as ToastType,
    cartBadge: '',
    messageBadge: '',
    userRole: '',
    leaderStatus: 'NOT_APPLIED',
    isApprovedLeader: false,
    activeSheet: '',
    sheetTitle: '',
    pageStyle: '',
  },
  lifetimes: {
    attached() {
      this.syncPageLayout();
      this.syncAuthState();
      if (this.data.authKind === 'access') {
        this.loadProfileData();
      }
    },
  },
  pageLifetimes: {
    show() {
      this.syncPageLayout();
      this.syncAuthState();

      if (this.data.authKind === 'access') {
        // 静默刷新 Token，确保 role 始终是最新的（如商户审核刚通过）
        this.silentRefreshRole();
        this.loadProfileData();
        this.loadLeaderEntryState();
        this.syncCartBadge();
        this.syncMessageBadge();
      } else {
        this.setData({
          cartBadge: '',
          messageBadge: '',
          redirecting: false,
        });
      }

      const tabBar = (this as any).getTabBar?.();
      if (tabBar) {
        tabBar.setData({
          active: 'profile',
        });
        if (typeof tabBar.syncFromRoute === 'function') {
          tabBar.syncFromRoute();
        }
      }
    },
  },
  methods: {
    syncPageLayout() {
      this.setData({
        pageStyle: buildPageTopStyle(0, 16),
      });
    },
    ensureAccess() {
      if (this.data.authKind === 'access') {
        if (this.data.redirecting) {
          this.setData({
            redirecting: false,
          });
        }

        return true;
      }

      if (this.data.redirecting) {
        return false;
      }

      this.setData({
        redirecting: true,
      });

      this.goLogin('/pages/profile/home/home');
      return false;
    },
    async syncCartBadge() {
      try {
        const count = await fetchCartItemCount();
        this.setData({
          cartBadge: count > 0 ? String(count) : '',
        });
      } catch {
        this.setData({
          cartBadge: '',
        });
      }
    },
    async syncMessageBadge() {
      try {
        const res = await fetchUnreadMessageCount();
        const count = Number(res.unreadCount || 0);
        this.setData({
          messageBadge: count > 99 ? '99+' : count > 0 ? String(count) : '',
        });
      } catch {
        this.setData({
          messageBadge: '',
        });
      }
    },
    syncAuthState() {
      const authKind = getAuthTokenType();
      const userRole = getAuthUserRole();
      this.setData({
        authKind,
        userRole,
      });
      if (authKind !== 'access') {
        this.setData({
          'profile.user.name': '点击登录',
          'profile.user.phone': '登录后查看更多',
          'profile.user.avatarSrc': iconPaths.defaultAvatar,
        });
      }
    },
    async silentRefreshRole() {
      // 仅在 access 会话时尝试静默刷新，以同步后端最新角色
      if (getAuthTokenType() !== 'access') {
        return;
      }
      try {
        const session = await refreshToken();
        if (session && session.user?.role) {
          // refreshToken 内部已调用 setToken，这里额外写入以确保 globalData 同步
          setToken(
            session.accessToken,
            session.tokenType === 'guest' ? 'guest' : 'access',
            session.user.role,
          );
          // 重新同步页面状态（角色可能已从 USER 升级到 MERCHANT）
          this.syncAuthState();
        }
      } catch {
        // 静默刷新失败不影响主流程
      }
    },
    async loadLeaderEntryState() {
      try {
        const application = await fetchLeaderApplication();
        const status = application?.status || 'NOT_APPLIED';
        this.setData({
          leaderStatus: status,
          isApprovedLeader: status === 'APPROVED',
        });
      } catch {
        this.setData({
          leaderStatus: 'NOT_APPLIED',
          isApprovedLeader: false,
        });
      }
    },
    async loadProfileData() {
      try {
        const [me, ordersPage, addresses, userCoupons, pointLogs, favorites] = await Promise.all([
          fetchMe(),
          fetchOrders({ page: 1, pageSize: 50 }),
          fetchAddresses(),
          fetchUserCoupons(),
          fetchPointsLogs(),
          fetchFavorites({ page: 1, pageSize: 20 }),
        ]);

        const user = me.user;
        const profile = me.profile;
        const orderItems = ordersPage.items ?? [];

        const addressPreview = (addresses ?? []).slice(0, 2).map((item) => ({
          id: item.id,
          title: `${item.receiverName} ${maskPhone(item.receiverMobile) || item.receiverMobile}`,
          desc: `${item.province}${item.city}${item.district}${item.detailAddress}`,
          tag: item.isDefault ? '默认地址' : '收货地址',
        }));

        const couponPreview = (userCoupons ?? []).slice(0, 3).map((item) => ({
          id: item.userCouponId,
          couponId: item.couponId,
          name: item.name,
          desc: `满${item.thresholdAmount}减${item.discountAmount}`,
          tag: item.status === 'USED' ? '已使用' : item.status === 'EXPIRED' ? '已过期' : '已拥有',
          received: item.status === 'RECEIVED',
          status: item.status,
        }));

        const pointPreview = (pointLogs ?? []).slice(0, 3).map((item) => ({
          id: item.id,
          title: item.changeType,
          desc: `${item.sourceType}${item.sourceNo ? ` · ${item.sourceNo}` : ''}${item.remark ? ` · ${item.remark}` : ''}`,
          points: item.points,
          createdAt: formatDateTime(item.createdAt),
        }));

        const orderSummary = {
          total: ordersPage.total ?? orderItems.length,
          pay: orderItems.filter((item) => Number(item.payStatus) === 0).length,
          ship: orderItems.filter((item) => Number(item.payStatus) === 1 && Number(item.deliveryStatus) === 0).length,
          receive: orderItems.filter((item) => Number(item.payStatus) === 1 && Number(item.deliveryStatus) === 1).length,
          comment: orderItems.filter((item) => Number(item.payStatus) === 1 && Number(item.deliveryStatus) === 2).length,
          refund: orderItems.filter((item) => String(item.status) === 'REFUNDING' || String(item.status) === '售后中').length,
        };

        // Check local draft for newly uploaded avatar (instant refresh)
        const draft = loadProfileDraft();
        const isHttp = (url?: string) => url ? /^(https?:)?\/\//.test(url) : false;
        const cachedAvatar = isHttp(draft?.avatarUrl) ? draft.avatarUrl : '';
        const serverAvatar = isHttp(profile?.avatarUrl)
          ? profile?.avatarUrl
          : isHttp(user.avatarUrl)
            ? user.avatarUrl
            : '';

        const usableCoupons = (userCoupons ?? []).filter((item) => item.status === 'RECEIVED').length;
        const orderBadgeMap: Record<string, number> = {
          pay: orderSummary.pay,
          ship: orderSummary.ship,
          receive: orderSummary.receive,
          comment: orderSummary.comment,
          refund: orderSummary.refund,
        };
        const orderShortcuts = (this.data.profile.orders as ProfileOrderEntry[]).map((item) => {
          const count = orderBadgeMap[item.key] ?? 0;
          return {
            ...item,
            badge: count > 99 ? '99+' : count > 0 ? String(count) : '',
          };
        });

        this.setData({
          profile: {
            user: {
              name: profile?.nickname || user.nickname || '我的资料',
              phone: maskPhone(profile?.mobile || user.mobile) || '登录后查看手机号',
              avatarSrc: cachedAvatar || serverAvatar || iconPaths.defaultAvatar,
            },
            stats: [
              { key: 'points', label: '积分', value: String(pointLogs.length ?? 0) },
              { key: 'coupon', label: '优惠券', value: String(usableCoupons) },
              { key: 'favorite', label: '收藏', value: String(favorites.total ?? favorites.items.length ?? 0) },
            ],
            orders: orderShortcuts,
            services: this.data.profile.services,
          },
          addresses,
          coupons: (userCoupons ?? []).map(item => ({ ...item, received: item.status === 'RECEIVED', tag: item.status === 'USED' ? '已使用' : item.status === 'EXPIRED' ? '已过期' : '可使用' })),
          pointLogs,
          addressPreview,
          couponPreview,
          pointPreview,
          favoriteCount: favorites.total ?? favorites.items.length ?? 0,
          orderSummary,
        });
      } catch {
        // Keep the existing shell when the backend is temporarily unavailable.
      }
    },
    setToast(message: string, type: ToastType = 'info') {
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
    handleProfileAvatarError() {
      if (this.data.profile.user.avatarSrc === iconPaths.defaultAvatar) {
        return;
      }

      this.setData({
        'profile.user.avatarSrc': iconPaths.defaultAvatar,
      });
    },
    goLogin(redirectPath = '/pages/profile/home/home') {
      wx.navigateTo({
        url: buildProfileLoginUrl(redirectPath),
      });
    },
    openUserCenter() {
      if (!this.ensureAccess()) {
        return;
      }

      wx.navigateTo({
        url: '/pages/profile/home/home',
      });
    },
    openAssetEntry(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: string }) || {};
      if (!this.ensureAccess()) {
        return;
      }

      if (key === 'coupon') {
        wx.navigateTo({ url: '/pages/profile/coupons/coupons' });
        return;
      }

      if (key === 'favorite') {
        wx.navigateTo({ url: '/pages/favorite/list/list' });
        return;
      }

      if (key === 'points') {
        wx.navigateTo({ url: '/pages/marketing/points/exchange' });
        return;
      }

      this.openUserCenter();
    },
    handleHeaderAction(e: WechatMiniprogram.BaseEvent) {
      (e as any).stopPropagation?.();
      const { action } = (e.currentTarget.dataset as { action?: string }) || {};

      if (action === 'scan') {
        wx.showToast({ title: '扫码功能开发中', icon: 'none' });
        return;
      }

      if (!this.ensureAccess()) {
        return;
      }

      if (action === 'profile') {
        this.openUserCenter();
        return;
      }

      if (action === 'settings') {
        wx.navigateTo({
          url: '/pages/profile/settings/settings',
        });
        return;
      }

      if (action === 'message') {
        wx.navigateTo({
          url: '/pages/message/message',
        });
      }
    },
    openProtectedSection(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: string; label?: string }) || {};

      if (!this.ensureAccess()) {
        return;
      }

      const go = (url: string) => {
        wx.navigateTo({
          url,
          fail: (err) => {
            wx.showToast({
              title: err?.errMsg?.includes('is not found')
                ? '页面未注册，请重新编译'
                : '打开失败，请稍后重试',
              icon: 'none',
            });
          },
        });
      };

      if (key === 'address') {
        go('/pages/address/list/list');
        return;
      }

      if (key === 'favorite' || key === 'follow') {
        go('/pages/favorite/list/list');
        return;
      }

      if (key === 'history') {
        go('/pages/logs/logs');
        return;
      }

      if (key === 'help') {
        wx.showModal({
          title: '未开放',
          content: '联系客服功能暂未开放',
          showCancel: false,
        });
        return;
      }

      if (key === 'feedback') {
        go('/pages/profile/feedback/feedback');
        return;
      }

      if (['orders', 'pay', 'ship', 'receive', 'comment', 'refund'].includes(key || '')) {
        const orderType = key === 'orders' ? 'all' : key;
        go(`/pages/order/list/list?type=${orderType}`);
        return;
      }

      if (key === 'coupon') {
        go('/pages/profile/coupons/coupons');
        return;
      }

      if (key === 'points') {
        go('/pages/marketing/points/exchange');
        return;
      }

      go('/pages/profile/home/home');
    },
    closeSheet() {
      this.setData({
        activeSheet: '',
      });
    },
    preventBubble() {
      // Prevent event bubbling to overlay
    },
    preventTouchMove() {
      // Prevent scrolling of body underneath drawer
    },
    async goToApply() {
      try {
        const { fetchMerchantEntryStatus } = await import('../../services/app');
        const status = await fetchMerchantEntryStatus();
        if (!status?.enabled) {
          wx.showToast({ title: '请先完成手机号绑定后再申请入驻', icon: 'none' });
          return;
        }
      } catch { /* 请求失败放行，不阻塞用户 */ }
      wx.navigateTo({
        url: '/pages/profile/apply/apply',
      });
    },
    goToMerchantDashboard() {
      wx.reLaunch({
        url: merchantHomeRoute,
      });
    },
    goLeaderApply() {
      if (!this.ensureAccess()) {
        return;
      }
      if (this.data.isApprovedLeader || this.data.userRole === 'LEADER') {
        this.goLeaderDashboard();
        return;
      }
      wx.navigateTo({
        url: '/pages/leader/apply/apply',
      });
    },
    goLeaderDashboard() {
      if (!this.ensureAccess()) {
        return;
      }
      wx.navigateTo({
        url: '/pages/leader/dashboard/dashboard',
      });
    },
    handleLogout() {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            clearUserLocalState();
            setGuestMode();
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
