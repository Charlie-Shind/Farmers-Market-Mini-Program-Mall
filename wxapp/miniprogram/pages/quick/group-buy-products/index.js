"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const quick_1 = require("../../../services/quick");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

let _countdownTimer = null;

function pad(n) { return String(n).padStart(2, '0'); }

function formatCountdown(expireAt) {
  const diff = new Date(expireAt).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function buildMembers(memberCount, needed) {
  const members = [];
  members.push({ role: '团长', avatar: '' });
  for (let i = 1; i < memberCount; i++) members.push({ role: '团员', avatar: '' });
  const remain = Math.max(needed - memberCount, 0);
  for (let i = 0; i < remain; i++) members.push({ role: '待邀请', avatar: '' });
  return members.slice(0, 3);
}

function mapMoreGroup(item, index) {
  return {
    id: `p${item.productId}`,
    productId: String(item.productId),
    skuId: item.skuId != null ? item.skuId : undefined,
    title: item.title,
    subtitle: item.subtitle || item.originPlace || '新鲜直达',
    groupPrice: item.groupPrice,
    originPrice: item.originPrice,
    coverUrl: item.coverUrl || '',
    imageClass: item.coverUrl ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    needed: item.needed,
  };
}

function readPageTitle() {
  var _a;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  return ((_a = current === null || current === void 0 ? void 0 : current.options) === null || _a === void 0 ? void 0 : _a.title) ? decodeURIComponent(current.options.title) : '拼团专区';
}

Component({
  data: {
    pageTitle: '拼团专区',
    pageStyle: '',
    icons: icons_1.iconPaths,
    cartBadge: '',
    loading: false,
    hasLoaded: false,
    expireAt: '',
    product: null,
    group: null,
    members: [],
    moreGroups: [],
    showInviteSheet: false,
    inviteCodeInput: '',
  },

  lifetimes: {
    attached() {
      if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/quick/group-buy-products/index')) return;
      this.setData({ pageTitle: readPageTitle(), pageStyle: (0, page_layout_1.buildPageTopStyle)(0) });
      void this.loadData();
      void this.syncCartBadge();
    },
    detached() { this._clearTimer(); },
  },

  pageLifetimes: {
    show() {
      void this.syncCartBadge();
      this._startTimer();
    },
    hide() { this._clearTimer(); },
  },

  methods: {
    noop() {},

    _clearTimer() {
      if (_countdownTimer != null) { clearInterval(_countdownTimer); _countdownTimer = null; }
    },

    _startTimer() {
      this._clearTimer();
      const expireAt = this.data.expireAt;
      if (!expireAt) return;
      const tick = () => {
        const leftTime = formatCountdown(expireAt);
        const current = this.data.group;
        if (current) this.setData({ 'group.leftTime': leftTime });
      };
      tick();
      _countdownTimer = setInterval(tick, 1000);
    },

    async syncCartBadge() {
      try {
        const count = await (0, app_1.fetchCartItemCount)();
        this.setData({ cartBadge: count > 0 ? String(count) : '' });
      } catch { this.setData({ cartBadge: '' }); }
    },

    async loadData() {
      this.setData({ loading: true });
      try {
        const [productResult, groupResult] = await Promise.all([
          (0, quick_1.fetchGroupBuyProducts)({ pageSize: 10 }),
          (0, quick_1.fetchGroupBuyNearby)({ limit: 5 }).catch(function() { return { groups: [] }; }),
        ]);

        const products = productResult.items || [];
        const groups = groupResult.groups || [];

        if (products.length > 0) {
          const first = products[0];
          const activeGroup = groups[0];
          this.setData({
            product: {
              productId: String(first.productId),
              skuId: first.skuId != null ? first.skuId : undefined,
              title: first.title,
              subtitle: first.subtitle || first.originPlace || '新鲜直达',
              groupPrice: first.groupPrice,
              originPrice: first.originPrice,
              coverUrl: first.coverUrl || '',
              imageClass: first.coverUrl ? '' : IMAGE_CLASSES[0],
            },
            moreGroups: products.slice(1).map(function(p, i) { return mapMoreGroup(p, i + 1); }),
            hasLoaded: true,
          });
          if (activeGroup) {
            this.setData({
              expireAt: activeGroup.expireAt,
              group: { current: activeGroup.memberCount, total: activeGroup.needed, leftTime: formatCountdown(activeGroup.expireAt) },
              members: buildMembers(activeGroup.memberCount, activeGroup.needed),
            });
            this._startTimer();
          } else {
            this.setData({
              expireAt: '',
              group: null,
              members: [],
            });
          }
        } else {
          this.setData({ hasLoaded: false, product: null, group: null });
        }
      } catch {
        this.setData({ hasLoaded: false, product: null, group: null });
      } finally { this.setData({ loading: false }); }
    },

    openInviteSheet() { this.setData({ showInviteSheet: true, inviteCodeInput: '' }); },
    closeInviteSheet() { this.setData({ showInviteSheet: false, inviteCodeInput: '' }); },

    onInviteCodeInput(e) {
      this.setData({ inviteCodeInput: String(e.detail.value || '').toUpperCase().slice(0, 6) });
    },

    async confirmInviteCode() {
      const code = this.data.inviteCodeInput.trim().toUpperCase();
      if (!code || code.length < 6) { wx.showToast({ title: '请输入 6 位邀请码', icon: 'none' }); return; }
      try {
        const result = await (0, quick_1.fetchGroupBuyNearby)({ inviteCode: code });
        const group = result.groups && result.groups[0];
        if (!group) { wx.showToast({ title: '未找到该邀请码的拼团', icon: 'none' }); return; }
        this.setData({ showInviteSheet: false, inviteCodeInput: '' });
        wx.showToast({ title: '已找到对应拼团', icon: 'success' });
        wx.navigateTo({ url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${group.groupId}&productId=${group.productId}&skuId=${group.skuId || 0}` });
      } catch { wx.showToast({ title: '查找失败', icon: 'none' }); }
    },

    async joinGroup(e) {
      if (!(0, auth_route_1.ensureCustomerAccess)('/pages/quick/group-buy-products/index')) return;
      const { productId, skuId } = e.currentTarget.dataset || {};
      if (!productId) return;
      try {
        wx.showLoading({ title: '发起拼团…' });
        const res = await (0, quick_1.joinGroupBuy)({ productId: Number(productId), skuId: skuId ? Number(skuId) : undefined });
        const gid = Number((res && res.groupId) || (res && res.groupBuyId) || 0);
        if (!gid) throw new Error('拼团创建失败');
        wx.navigateTo({ url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${gid}&productId=${productId}&skuId=${res.skuId || 0}` });
      } catch (err) { wx.showToast({ title: (err && err.message) || '拼团发起失败', icon: 'none' }); }
      finally { wx.hideLoading(); }
    },

    loadMore() {
      wx.navigateTo({ url: '/pages/quick/group-buy/index' });
    },

    goBack() { (0, auth_route_1.navigateBackOrHome)(); },

    openProductDetail(e) {
      const { productId } = e.currentTarget.dataset || {};
      if (!productId) return;
      wx.navigateTo({ url: `/pages/product/detail/detail?productId=${productId}` });
    },

    onRule() { wx.showToast({ title: '拼团规则：满员成团享优惠', icon: 'none' }); },
    onInvite() { wx.showToast({ title: '分享给好友一起拼团', icon: 'none' }); },
    onMyGroups() { wx.showToast({ title: '我的拼团记录', icon: 'none' }); },
  },
});
