import { iconPaths } from '../../../config/icons';
import { fetchAssetsSummary, fetchMe, fetchUserCoupons, type AppUserCoupon } from '../../../services/app';
import { fetchMerchantProfile, fetchMerchantProducts, type MerchantProduct } from '../../../services/merchant';
import { loadProfileDraft, normalizeProfileDraft, saveProfileDraft } from '../../../services/profile';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { buildProfileLoginUrl, navigateBackOrHome } from '../../../utils/auth-route';
import { maskPhone } from '../../../utils/util';
import {
  getAuthTokenType,
  getAuthUserRole,
  isMerchantSession,
} from '../../../services/token';

type ProfileMetric = {
  key: string;
  label: string;
  value: string;
};

Component({
  data: {
    loading: false,
    loadingText: '正在加载个人资料',
    pageStyle: '',
    icons: iconPaths,
    authKind: '',
    primaryActionTitle: '编辑个人资料',
    primaryActionLabel: '去编辑',
    redirecting: false,
    profile: {
      avatarUrl: iconPaths.defaultAvatar as string,
      displayName: '加载中',
      subtitle: '正在获取个人资料',
      roleBadge: '未登录',
      roleBadgeClass: 'role-badge--guest',
      trustTags: [] as string[],
    },
    bioText: '',
    baseInfo: [] as Array<{ label: string; value: string }>,
    metrics: [] as ProfileMetric[],
    activeTab: 'main', // 'main' | 'info'
    merchantProducts: [] as MerchantProduct[],
    userCoupons: [] as AppUserCoupon[],
    scrollTop: 0,
  },
  lifetimes: {
    attached() {
      this.syncAuthState();
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });

      if (!this.ensureAccess()) {
        return;
      }

      this.loadProfile();
    },
  },
  pageLifetimes: {
    show() {
      this.syncAuthState();
      if (!this.ensureAccess()) {
        return;
      }

      this.loadProfile();
    },
  },
  methods: {
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

      this.goLogin();
      return false;
    },
    syncAuthState() {
      const authKind = getAuthTokenType();
      const isAccess = authKind === 'access';
      this.setData({
        authKind,
        loadingText: '正在加载个人资料',
        primaryActionTitle: isAccess ? '编辑个人资料' : '登录后查看完整资料',
        primaryActionLabel: isAccess ? '去编辑' : '去登录',
      });
    },
    async loadProfile() {
      this.syncAuthState();
      this.setData({ loading: true });

      try {
        const [me, merchantProfile, assetsSummary] = await Promise.all([
          fetchMe(),
          isMerchantSession() ? fetchMerchantProfile().catch(() => null) : Promise.resolve(null),
          fetchAssetsSummary().catch(() => null),
        ]);

        const draft = loadProfileDraft();
        const role = me.user.role || getAuthUserRole();
        const isMerchant = Boolean(merchantProfile);
        const isAccess = this.data.authKind === 'access';
        const profileName = me.profile?.nickname || me.user.nickname || '';
        const profileMobile = me.profile?.mobile || me.user.mobile || '';
        const profileAvatarUrl = me.profile?.avatarUrl || me.user.avatarUrl || '';
        const serverAvatarUrl = merchantProfile?.storeLogo || profileAvatarUrl || '';
        const normalizedDraft = normalizeProfileDraft(draft, {
          displayName: merchantProfile?.storeName || profileName || '',
          identityType: isMerchant
            ? '商户 / 农户'
            : role === 'GUEST'
              ? '游客'
              : 'C端普通用户',
          contactName: merchantProfile?.contactName || profileName || '',
          contactMobile: merchantProfile?.contactMobile || profileMobile || '',
          region: isMerchant ? '湾源县 · 东山社区' : '湾源县 · 个人中心',
          bio: isMerchant
            ? '本地果蔬合作社负责人，主营湾源脐橙、自然成熟番茄和时令蔬菜。支持产地直采、同城配送和冷链发货。'
            : '正在浏览湾源农仓商品，关注产地直采和家庭采买。',
          avatarUrl: serverAvatarUrl || iconPaths.defaultAvatar,
        });
        const isHttp = (url?: string) => url ? /^(https?:)?\/\//.test(url) : false;
        const cachedAvatar = isHttp(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '';
        const resolvedServerAvatar = isHttp(serverAvatarUrl) ? serverAvatarUrl : '';
        const avatarUrl = cachedAvatar || resolvedServerAvatar || iconPaths.defaultAvatar;
        const displayName = normalizedDraft.displayName;
        const contactName = normalizedDraft.contactName;
        const contactMobile = normalizedDraft.contactMobile;
        const region = normalizedDraft.region;
        const bio = normalizedDraft.bio;
        const bioText = role === 'GUEST' ? '当前资料仅保留基础信息，登录后可继续完善。' : bio;

        saveProfileDraft({
          ...normalizedDraft,
          avatarUrl: isHttp(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '',
        });

        const trustTags = isMerchant
          ? ['已实名', '资质已认证', merchantProfile?.status === 'APPROVED' ? '营业中' : '待审核']
          : role === 'GUEST'
            ? ['资料待完善', '可继续登录']
            : ['资料可编辑', '账户已验证'];

        const metrics: ProfileMetric[] = isMerchant
          ? [
              { key: 'product', label: '商品数', value: String(merchantProfile?.productCount ?? 0) },
              { key: 'order', label: '订单数', value: String(merchantProfile?.orderCount ?? 0) },
              { key: 'wallet', label: '可提现', value: `¥${merchantProfile?.availableAmount ?? '0.00'}` },
            ]
          : (() => {
              const summary = assetsSummary;
              const orderTotal = summary
                ? summary.orders.pendingPay +
                  summary.orders.pendingShip +
                  summary.orders.pendingReceive +
                  summary.orders.pendingReview +
                  summary.orders.refunding +
                  summary.orders.totalCompleted
                : 0;
              return [
                { key: 'order', label: '订单数', value: String(orderTotal) },
                { key: 'coupon', label: '卡券数', value: String(summary?.coupons.unused ?? 0) },
                { key: 'points', label: '积分', value: String(summary?.points.balance ?? 0) },
              ];
            })();

        const subtitle = isMerchant
          ? `专注本地产地直供 · ${merchantProfile?.productCount ?? 0} 个商品 · ${merchantProfile?.orderCount ?? 0} 笔订单`
          : role === 'GUEST'
            ? '当前资料未完整同步，登录后可查看完整信息'
            : '资料已同步，可继续编辑';

        const baseInfo = [
          { label: '身份类型', value: normalizedDraft.identityType },
          { label: '联系人', value: contactName },
          { label: '手机号', value: maskPhone(contactMobile) || contactMobile },
          { label: '所在地区', value: region },
        ];

        let merchantProducts: MerchantProduct[] = [];
        let userCoupons: AppUserCoupon[] = [];

        if (isAccess) {
          if (isMerchant) {
            const productPage = await fetchMerchantProducts({ page: 1, pageSize: 20 }).catch(() => null);
            merchantProducts = productPage?.items ?? [];
          } else {
            userCoupons = await fetchUserCoupons().catch(() => []);
          }
        }

        this.setData({
          profile: {
            avatarUrl,
            displayName,
            subtitle,
            roleBadge: isMerchant ? '商户' : role === 'GUEST' ? '游客' : isAccess ? '用户' : '未登录',
            roleBadgeClass: isMerchant
              ? 'role-badge--merchant'
              : role === 'GUEST'
                ? 'role-badge--guest'
                : 'role-badge--user',
            trustTags,
          },
          bioText,
          baseInfo,
          metrics,
          merchantProducts,
          userCoupons,
        });
      } catch {
        // Keep the shell when data loading fails.
      } finally {
        this.setData({ loading: false });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    goLogin(redirectPath = '/pages/profile/home/home') {
      wx.navigateTo({
        url: buildProfileLoginUrl(redirectPath),
      });
    },
    goEdit() {
      if (!this.ensureAccess()) {
        return;
      }

      wx.navigateTo({
        url: '/pages/profile/edit/edit',
      });
    },
    handlePrimaryAction() {
      if (this.data.authKind === 'access') {
        this.goEdit();
        return;
      }

      this.goLogin();
    },
    onMetricTap(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: string }) || {};
      if (!key) return;

      if (key === 'points') {
        wx.navigateTo({ url: '/pages/marketing/points/exchange' });
        return;
      }

      if (key === 'coupon') {
        wx.navigateTo({ url: '/pages/profile/coupons/coupons' });
        return;
      }

      if (key === 'order') {
        wx.navigateTo({ url: '/pages/order/list/list' });
      }
    },
    switchTab(e: WechatMiniprogram.BaseEvent) {
      const { tab } = (e.currentTarget.dataset as { tab?: string }) || {};
      if (!tab || tab === this.data.activeTab) {
        return;
      }

      this.setData({ activeTab: tab });
      // 不同 Tab 的内容高度差异很大，切换后 scroll-view 的原生滚动位置不会自动回到顶部，
      // 若之前滚动过会导致内容较短的 Tab 底部出现"看不见但能滑动"的空白区域，这里强制归零一次。
      this.resetProfileScroll();
    },
    resetProfileScroll() {
      this.setData({ scrollTop: 1 }, () => {
        this.setData({ scrollTop: 0 });
      });
    },
    handleProfileAvatarError() {
      if (this.data.profile.avatarUrl === iconPaths.defaultAvatar) {
        return;
      }

      this.setData({
        'profile.avatarUrl': iconPaths.defaultAvatar,
      });
    },
  },
});
