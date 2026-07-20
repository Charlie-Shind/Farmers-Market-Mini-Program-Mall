import { iconPaths } from '../../../config/icons';
import { fetchCartItemCount, fetchMe } from '../../../services/app';
import {
  fetchGroupBuyProducts,
  fetchGroupBuyNearby,
  fetchMyGroupBuys,
  joinGroupBuy,
  isAlreadyJoinedGroupError,
  navigateToJoinedGroupProgress,
  buildGroupBuyCheckoutUrl,
  type GroupBuyProduct,
  type GroupBuyItem,
  type MyGroupBuyItem,
} from '../../../services/quick';
import { loadProfileDraft } from '../../../services/profile';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

function isHttpAvatar(url?: string | null): boolean {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function normalizeAvatarUrl(url?: string | null): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (isHttpAvatar(value) || value.startsWith('/')) return value;
  return '';
}

async function resolveCurrentUserAvatar(): Promise<string> {
  const draft = loadProfileDraft();
  const draftAvatar = normalizeAvatarUrl(draft.avatarUrl);
  try {
    const me = await fetchMe();
    const serverAvatar =
      normalizeAvatarUrl(me.profile?.avatarUrl) || normalizeAvatarUrl(me.user?.avatarUrl);
    return draftAvatar || serverAvatar || '';
  } catch {
    return draftAvatar || '';
  }
}

type ProductView = {
  productId: string;
  skuId?: number;
  title: string;
  subtitle: string;
  groupPrice: string;
  originPrice: string;
  coverUrl: string;
  imageClass: string;
  needed: number;
  needText: string;
  badge: string;
  categoryKeys: string[];
};

type NearbyView = {
  groupId: number;
  productId: string;
  skuId?: number;
  title: string;
  coverUrl: string;
  groupPrice: string;
  remain: number;
  area: string;
};

type MyOngoingMember = {
  key: string;
  label: string;
  filled: boolean;
  avatarUrl: string;
  isMine: boolean;
};

type MyOngoingView = {
  groupId: number;
  productId: string;
  title: string;
  needed: number;
  memberCount: number;
  progressText: string;
  remainText: string;
  expireAt: string;
  members: MyOngoingMember[];
  inviteCode: string;
};

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

const CATEGORY_TABS = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '热销' },
  { key: 'veg', label: '果蔬' },
  { key: 'meat', label: '肉禽' },
  { key: 'seafood', label: '海鲜' },
  { key: 'grain', label: '粮油' },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  veg: ['菜', '果', '蔬', '瓜', '菌', '莓', '笋', '芹', '葱', '椒', '萝卜', '白菜', '苹果', '橙', '梨'],
  meat: ['肉', '禽', '鸡', '鸭', '牛', '羊', '猪', '排骨', '蛋'],
  seafood: ['鱼', '虾', '蟹', '贝', '海', '带鱼', '黄花', '鱿鱼', '鲍'],
  grain: ['米', '面', '油', '粮', '豆', '粉', '酱', '醋', '茶'],
};

let _tickerTimer: ReturnType<typeof setInterval> | null = null;
let _mineTimer: ReturnType<typeof setInterval> | null = null;

function readPageTitle() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options?.title ? decodeURIComponent(current.options.title) : '拼好货';
}

function resolveCategories(text: string): string[] {
  const keys: string[] = [];
  Object.keys(CATEGORY_KEYWORDS).forEach((key) => {
    if (CATEGORY_KEYWORDS[key].some((kw) => text.includes(kw))) keys.push(key);
  });
  return keys.length ? keys : ['hot'];
}

function formatRemain(expireAt: string): string {
  const end = new Date(expireAt).getTime();
  if (!Number.isFinite(end)) return '00:00:00';
  const diff = Math.max(0, end - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function mapMyOngoing(item: MyGroupBuyItem, myAvatarUrl = ''): MyOngoingView | null {
  if (item.status !== 'OPEN') return null;
  const needed = Math.max(Number(item.needed || 2), 1);
  const memberCount = Math.max(Number(item.memberCount || 0), 0);
  const slots = Math.min(needed, 5);
  const groupMembers = Array.isArray(item.members)
    ? [...item.members].sort((a, b) => Number(b.isInitiator) - Number(a.isInitiator))
    : [];
  const fallbackMine = normalizeAvatarUrl(myAvatarUrl);
  const defaultAvatar = String(iconPaths.defaultAvatar || '');
  const members: MyOngoingMember[] = [];
  for (let i = 0; i < slots; i++) {
    const member = groupMembers[i];
    const filled = Boolean(member) || i < memberCount;
    const isMine = Boolean(member?.isMine);
    let avatarUrl = normalizeAvatarUrl(member?.avatarUrl);
    if (!avatarUrl && isMine && fallbackMine) {
      avatarUrl = fallbackMine;
    }
    if (!avatarUrl && filled) {
      avatarUrl = defaultAvatar;
    }
    members.push({
      key: `${item.groupId}-${i}`,
      label: i === 0 ? '团长' : filled ? `团员${i}` : '待邀请',
      filled,
      avatarUrl,
      isMine,
    });
  }
  return {
    groupId: item.groupId,
    productId: String(item.productId),
    title: item.title,
    needed,
    memberCount,
    progressText: `${memberCount}/${needed}人`,
    remainText: formatRemain(item.expireAt),
    expireAt: item.expireAt,
    members,
    inviteCode: item.inviteCode || '',
  };
}

function mapProduct(item: GroupBuyProduct, index: number): ProductView {
  const text = `${item.title} ${item.subtitle || ''} ${item.originPlace || ''}`;
  const categoryKeys = resolveCategories(text);
  return {
    productId: String(item.productId),
    skuId: item.skuId ?? undefined,
    title: item.title,
    subtitle: item.subtitle || item.originPlace || item.merchant?.storeName || '产地直发 新鲜到家',
    groupPrice: item.groupPrice,
    originPrice: item.originPrice,
    coverUrl: item.coverUrl || '',
    imageClass: item.coverUrl ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    needed: item.needed || 2,
    needText: `满${item.needed || 2}人成团`,
    badge: index < 3 ? '爆款' : categoryKeys.includes('hot') && index < 6 ? '热拼' : '',
    categoryKeys: ['all', 'hot', ...categoryKeys],
  };
}

// 只展示还未满员的团；满员的团后端会很快转为 COMPLETED，这里做兜底过滤避免出现"差0人"
function mapNearby(item: GroupBuyItem): NearbyView | null {
  const remain = Math.max((item.needed || 2) - (item.memberCount || 0), 0);
  if (remain <= 0) {
    return null;
  }
  return {
    groupId: item.groupId,
    productId: String(item.productId),
    skuId: item.skuId ?? undefined,
    title: item.title,
    coverUrl: item.coverUrl || '',
    groupPrice: item.groupPrice,
    remain,
    area: item.roughArea || '附近邻里',
  };
}

function filterProducts(list: ProductView[], key: string): ProductView[] {
  if (key === 'all') return list;
  if (key === 'hot') return list.slice().sort((a, b) => Number(a.groupPrice) - Number(b.groupPrice));
  return list.filter((item) => item.categoryKeys.includes(key));
}

Component({
  data: {
    pageTitle: '拼好货',
    pageStyle: '',
    icons: iconPaths,
    cartBadge: '',
    loading: false,
    categoryTabs: CATEGORY_TABS,
    activeCategory: 'all',
    products: [] as ProductView[],
    displayProducts: [] as ProductView[],
    nearbyGroups: [] as NearbyView[],
    myOngoingGroups: [] as MyOngoingView[],
    tickerLines: [] as string[],
    tickerText: '',
    showInviteSheet: false,
    inviteCodeInput: '',
    shareGroupId: 0,
    shareInviteCode: '',
    shareTitle: '',
    scrollIntoView: '',
  },

  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/group-buy-products/index')) return;
      this.setData({ pageTitle: readPageTitle(), pageStyle: buildPageTopStyle(0) });
      void this.loadData();
      void this.syncCartBadge();
    },
    detached() {
      this._clearTicker();
      this._clearMineTimer();
    },
  },

  pageLifetimes: {
    show() {
      void this.syncCartBadge();
      this._startTicker();
      void this.loadMyOngoingGroups();
    },
    hide() {
      this._clearTicker();
      this._clearMineTimer();
    },
  },

  methods: {
    noop() {},

    prepareShare(e: WechatMiniprogram.BaseEvent) {
      const { groupId, inviteCode, title } = (e.currentTarget.dataset as {
        groupId?: string | number;
        inviteCode?: string;
        title?: string;
      }) || {};
      this.setData({
        shareGroupId: Number(groupId || 0),
        shareInviteCode: String(inviteCode || ''),
        shareTitle: String(title || ''),
      });
    },

    onShareAppMessage() {
      const groupId = this.data.shareGroupId;
      const inviteCode = this.data.shareInviteCode;
      const title = this.data.shareTitle || '来和我一起拼团更优惠';
      const query = inviteCode
        ? `inviteCode=${encodeURIComponent(inviteCode)}`
        : groupId
          ? `groupId=${groupId}`
          : '';
      return {
        title,
        path: `/pages/quick/group-buy/index?${query}`,
      };
    },

    _clearTicker() {
      if (_tickerTimer != null) {
        clearInterval(_tickerTimer);
        _tickerTimer = null;
      }
    },

    _clearMineTimer() {
      if (_mineTimer != null) {
        clearInterval(_mineTimer);
        _mineTimer = null;
      }
    },

    _startTicker() {
      this._clearTicker();
      const lines = this.data.tickerLines;
      if (!lines.length) return;
      let idx = 0;
      this.setData({ tickerText: lines[0] });
      _tickerTimer = setInterval(() => {
        idx = (idx + 1) % lines.length;
        this.setData({ tickerText: lines[idx] });
      }, 2800);
    },

    _startMineTimer() {
      this._clearMineTimer();
      if (!this.data.myOngoingGroups.length) return;
      _mineTimer = setInterval(() => {
        const next = (this.data.myOngoingGroups || []).map((item) => ({
          ...item,
          remainText: formatRemain(item.expireAt),
        }));
        this.setData({ myOngoingGroups: next });
      }, 1000);
    },

    async syncCartBadge() {
      try {
        const count = await fetchCartItemCount();
        this.setData({ cartBadge: count > 0 ? String(count) : '' });
      } catch {
        this.setData({ cartBadge: '' });
      }
    },

    async loadMyOngoingGroups() {
      try {
        const [result, myAvatarUrl] = await Promise.all([
          fetchMyGroupBuys(),
          resolveCurrentUserAvatar(),
        ]);
        const myOngoingGroups = (result.items || [])
          .map((item) => mapMyOngoing(item, myAvatarUrl))
          .filter((g): g is MyOngoingView => g != null);
        this.setData({ myOngoingGroups });
        this._startMineTimer();
      } catch {
        this.setData({ myOngoingGroups: [] });
        this._clearMineTimer();
      }
    },

    async loadData() {
      this.setData({ loading: true });
      try {
        const [productResult, groupResult] = await Promise.all([
          fetchGroupBuyProducts({ pageSize: 40 }),
          fetchGroupBuyNearby({ limit: 12 }).catch(() => ({ groups: [] as GroupBuyItem[] })),
        ]);

        const products = (productResult.items || []).map((item, i) => mapProduct(item, i));
        const nearbyGroups = (groupResult.groups || [])
          .map(mapNearby)
          .filter((g): g is NearbyView => g != null);
        const tickerLines = nearbyGroups.length
          ? nearbyGroups.map((g) => `${g.area}有人正在拼「${g.title}」，还差 ${g.remain} 人`)
          : products.slice(0, 5).map((p) => `邻里热拼「${p.title}」· ${p.needText}`);

        this.setData({
          products,
          displayProducts: filterProducts(products, this.data.activeCategory),
          nearbyGroups,
          tickerLines,
          tickerText: tickerLines[0] || '',
        });
        this._startTicker();
        void this.loadMyOngoingGroups();
      } catch {
        this.setData({ products: [], displayProducts: [], nearbyGroups: [], tickerLines: [], tickerText: '' });
      } finally {
        this.setData({ loading: false });
      }
    },

    selectCategory(e: WechatMiniprogram.BaseEvent) {
      const key = String((e.currentTarget.dataset as { key?: string }).key || 'all');
      this.setData({
        activeCategory: key,
        displayProducts: filterProducts(this.data.products, key),
      });
    },

    scrollToProducts() {
      if (!this.data.displayProducts.length) {
        wx.showToast({ title: '暂无可拼商品', icon: 'none' });
        return;
      }
      this.setData({ scrollIntoView: 'phf-products' });
      setTimeout(() => {
        this.setData({ scrollIntoView: '' });
      }, 400);
    },

    openInviteSheet() {
      this.setData({ showInviteSheet: true, inviteCodeInput: '' });
    },
    closeInviteSheet() {
      this.setData({ showInviteSheet: false, inviteCodeInput: '' });
    },

    onInviteCodeInput(e: WechatMiniprogram.Input) {
      this.setData({ inviteCodeInput: String(e.detail.value ?? '').toUpperCase().slice(0, 6) });
    },

    async confirmInviteCode() {
      const code = this.data.inviteCodeInput.trim().toUpperCase();
      if (!code || code.length < 6) {
        wx.showToast({ title: '请输入 6 位邀请码', icon: 'none' });
        return;
      }
      try {
        const result = await fetchGroupBuyNearby({ inviteCode: code });
        const group = (result.groups || [])[0];
        if (!group) {
          wx.showToast({ title: '未找到该邀请码的拼团', icon: 'none' });
          return;
        }
        this.setData({ showInviteSheet: false, inviteCodeInput: '' });
        wx.showToast({ title: '已找到对应拼团', icon: 'success' });
        wx.navigateTo({
          url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${group.groupId}&productId=${group.productId}&skuId=${group.skuId || 0}`,
        });
      } catch {
        wx.showToast({ title: '查找失败', icon: 'none' });
      }
    },

    async joinGroup(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/group-buy-products/index')) return;
      const { productId, skuId } = (e.currentTarget.dataset as { productId?: string; skuId?: string }) || {};
      if (!productId) return;
      try {
        wx.showLoading({ title: '发起拼团…' });
        const res = await joinGroupBuy({
          productId: Number(productId),
          skuId: skuId ? Number(skuId) : undefined,
        });
        wx.navigateTo({
          url: buildGroupBuyCheckoutUrl({
            productId,
            skuId: res.skuId || skuId || 0,
            groupId: res.groupId,
          }),
        });
      } catch (err: any) {
        wx.showToast({ title: err?.message || '拼团发起失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    async joinExistingGroup(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/group-buy-products/index')) return;
      const { productId, skuId, groupId } = (e.currentTarget.dataset as {
        productId?: string;
        skuId?: string;
        groupId?: string;
      }) || {};
      if (!productId) return;
      try {
        wx.showLoading({ title: '加入拼团…' });
        const res = await joinGroupBuy({
          productId: Number(productId),
          skuId: skuId ? Number(skuId) : undefined,
          groupId: groupId ? Number(groupId) : undefined,
        });
        if (res.alreadyJoined) {
          await navigateToJoinedGroupProgress({ groupId: res.groupId || groupId, orderNo: res.orderNo });
          return;
        }
        const gid = Number((res as any).groupId || (res as any).groupBuyId || groupId || 0);
        if (!gid) throw new Error('加入失败');
        wx.navigateTo({
          url: buildGroupBuyCheckoutUrl({
            productId,
            skuId: res.skuId || skuId || 0,
            groupId: gid,
          }),
        });
      } catch (err: any) {
        if (isAlreadyJoinedGroupError(err)) {
          await navigateToJoinedGroupProgress({ groupId });
          return;
        }
        wx.showToast({ title: err?.message || '加入失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    loadMore() {
      wx.navigateTo({ url: '/pages/quick/group-buy/index?title=附近拼单' });
    },

    goBack() {
      navigateBackOrHome();
    },

    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: string }) || {};
      if (!productId) return;
      wx.navigateTo({ url: `/pages/product/detail/detail?productId=${productId}` });
    },

    onRule() {
      wx.showToast({ title: '满员成团享拼团价，超时未成团自动退款', icon: 'none' });
    },
    onMyGroups() {
      wx.navigateTo({ url: '/pages/quick/group-buy/mine/mine' });
    },
  },
});
