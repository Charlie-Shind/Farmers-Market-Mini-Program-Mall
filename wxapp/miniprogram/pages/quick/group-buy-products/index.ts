import { iconPaths } from '../../../config/icons';
import { fetchCartItemCount } from '../../../services/app';
import { fetchGroupBuyProducts, fetchGroupBuyNearby, joinGroupBuy, type GroupBuyProduct, type GroupBuyItem } from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type MemberView = { role: string; avatar: string };
type MoreGroupView = {
  id: string; productId: string; skuId?: number; title: string; subtitle: string;
  groupPrice: string; originPrice: string; coverUrl: string; imageClass: string;
  needed: number;
};

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

function pad(n: number): string { return String(n).padStart(2, '0'); }

function formatCountdown(expireAt: string): string {
  const diff = new Date(expireAt).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function buildMembers(memberCount: number, needed: number): MemberView[] {
  const members: MemberView[] = [];
  members.push({ role: '团长', avatar: '' });
  for (let i = 1; i < memberCount; i++) members.push({ role: '团员', avatar: '' });
  const remain = Math.max(needed - memberCount, 0);
  for (let i = 0; i < remain; i++) members.push({ role: '待邀请', avatar: '' });
  return members.slice(0, 3);
}

function mapMoreGroup(item: GroupBuyProduct, index: number): MoreGroupView {
  return {
    id: `p${item.productId}`,
    productId: String(item.productId),
    skuId: item.skuId ?? undefined,
    title: item.title,
    subtitle: item.subtitle || item.originPlace || '新鲜直达',
    groupPrice: item.groupPrice,
    originPrice: item.originPrice,
    coverUrl: item.coverUrl || '',
    imageClass: item.coverUrl ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    needed: item.needed,
  };
}

let _countdownTimer: ReturnType<typeof setInterval> | null = null;

function readPageTitle() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options?.title ? decodeURIComponent(current.options.title) : '拼团专区';
}

Component({
  data: {
    pageTitle: '拼团专区',
    pageStyle: '',
    icons: iconPaths,
    cartBadge: '',
    loading: false,
    hasLoaded: false,
    expireAt: '',
    product: null as {
      productId: string; skuId?: number; title: string; subtitle: string;
      groupPrice: string; originPrice: string; coverUrl: string; imageClass: string;
    } | null,
    group: null as { current: number; total: number; leftTime: string } | null,
    members: [] as MemberView[],
    moreGroups: [] as MoreGroupView[],
    showInviteSheet: false,
    inviteCodeInput: '',
  },

  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/group-buy-products/index')) return;
      this.setData({ pageTitle: readPageTitle(), pageStyle: buildPageTopStyle(0) });
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
        const count = await fetchCartItemCount();
        this.setData({ cartBadge: count > 0 ? String(count) : '' });
      } catch { this.setData({ cartBadge: '' }); }
    },

    async loadData() {
      this.setData({ loading: true });
      try {
        const [productResult, groupResult] = await Promise.all([
          fetchGroupBuyProducts({ pageSize: 10 }),
          fetchGroupBuyNearby({ limit: 5 }).catch(() => ({ groups: [] })),
        ]);

        const products = productResult.items || [];
        const groups = groupResult.groups || [];

        // 第一个可拼团商品作为主推
        if (products.length > 0) {
          const first = products[0];
          const activeGroup = products[0];
          this.setData({
            product: {
              productId: String(first.productId), skuId: first.skuId ?? undefined, title: first.title,
              subtitle: first.subtitle || first.originPlace || '新鲜直达',
              groupPrice: first.groupPrice, originPrice: first.originPrice,
              coverUrl: first.coverUrl || '',
              imageClass: first.coverUrl ? '' : IMAGE_CLASSES[0],
            },
            moreGroups: products.slice(1).map((p, i) => mapMoreGroup(p, i + 1)),
            hasMore: products.length > 5,
            hasLoaded: true,
            ...(activeGroup ? {
              expireAt: activeGroup.expireAt,
              group: { current: activeGroup.memberCount, total: activeGroup.needed, leftTime: formatCountdown(activeGroup.expireAt) },
              members: buildMembers(activeGroup.memberCount, activeGroup.needed),
            } : {
              expireAt: '',
              group: null,
              members: [],
            }),
          });
          this._startTimer();
        } else {
          this.setData({ hasLoaded: false, product: null, group: null });
        }
      } catch {
        this.setData({ hasLoaded: false, product: null, group: null });
      } finally { this.setData({ loading: false }); }
    },

    openInviteSheet() { this.setData({ showInviteSheet: true, inviteCodeInput: '' }); },
    closeInviteSheet() { this.setData({ showInviteSheet: false, inviteCodeInput: '' }); },

    onInviteCodeInput(e: WechatMiniprogram.Input) {
      this.setData({ inviteCodeInput: String(e.detail.value ?? '').toUpperCase().slice(0, 6) });
    },

    async confirmInviteCode() {
      const code = this.data.inviteCodeInput.trim().toUpperCase();
      if (!code || code.length < 6) { wx.showToast({ title: '请输入 6 位邀请码', icon: 'none' }); return; }
      try {
        const result = await fetchGroupBuyNearby({ inviteCode: code });
        const group = result.products?.[0];
        if (!group) { wx.showToast({ title: '未找到该邀请码的拼团', icon: 'none' }); return; }
        this.setData({ showInviteSheet: false, inviteCodeInput: '' });
        wx.showToast({ title: '已找到对应拼团', icon: 'success' });
        wx.navigateTo({ url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${group.groupId}&productId=${group.productId}&skuId=${group.skuId || 0}` });
      } catch { wx.showToast({ title: '查找失败', icon: 'none' }); }
    },

    async joinGroup(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/group-buy-products/index')) return;
      const { productId, skuId } = (e.currentTarget.dataset as { productId?: string; skuId?: string }) || {};
      if (!productId) return;
      try {
        wx.showLoading({ title: '发起拼团…' });
        const res = await joinGroupBuy({ productId: Number(productId), skuId: skuId ? Number(skuId) : undefined });
        const gid = Number((res as any).groupId || (res as any).groupBuyId || 0);
        if (!gid) throw new Error('拼团创建失败');
        wx.navigateTo({ url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${gid}&productId=${productId}&skuId=${res.skuId || 0}` });
      } catch (err: any) { wx.showToast({ title: err?.message || '拼团发起失败', icon: 'none' }); }
      finally { wx.hideLoading(); }
    },

    loadMore() {
      wx.navigateTo({ url: '/pages/quick/group-buy/index' });
    },

    goBack() { navigateBackOrHome(); },

    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: string }) || {};
      if (!productId) return;
      wx.navigateTo({ url: `/pages/product/detail/detail?productId=${productId}` });
    },

    onRule() { wx.showToast({ title: '拼团规则：满员成团享优惠', icon: 'none' }); },
    onInvite() { wx.showToast({ title: '分享给好友一起拼团', icon: 'none' }); },
    onMyGroups() { wx.showToast({ title: '我的拼团记录', icon: 'none' }); },
  },
});
