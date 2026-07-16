import { iconPaths } from '../../../config/icons';
import {
  fetchGroupBuyDetail,
  fetchGroupBuyNearby,
  joinGroupBuy,
  isAlreadyJoinedGroupError,
  navigateToJoinedGroupProgress,
  type GroupBuyItem,
} from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type ProductView = {
  groupId: number;
  productId: string;
  skuId?: number;
  title: string;
  area: string;
  groupPrice: string;
  originPrice: string;
  coverUrl: string;
  imageClass: string;
  needed: number;
  memberCount: number;
  remain: number;
  percent: number;
};

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

function mapProduct(item: GroupBuyItem, index: number): ProductView {
  const needed = item.needed || 2;
  const memberCount = item.memberCount || 0;
  const remain = Math.max(needed - memberCount, 0);
  return {
    groupId: item.groupId,
    productId: String(item.productId),
    skuId: item.skuId ?? undefined,
    title: item.title,
    area: item.roughArea || '附近邻里',
    groupPrice: item.groupPrice,
    originPrice: item.originPrice,
    coverUrl: item.coverUrl || '',
    imageClass: item.coverUrl ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    needed,
    memberCount,
    remain,
    percent: Math.min(100, Math.round((memberCount / needed) * 100)),
  };
}

function readPageOptions() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options ?? {};
}

function readPageTitle() {
  const options = readPageOptions();
  return options.title ? decodeURIComponent(options.title) : '附近拼单';
}

Component({
  data: {
    pageTitle: '附近拼单',
    pageStyle: '',
    icons: iconPaths,
    loading: false,
    products: [] as ProductView[],
  },

  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/group-buy/index')) return;
      this.setData({ pageTitle: readPageTitle(), pageStyle: buildPageTopStyle(0) });
      void this.loadData();
      void this.consumeShareLink();
    },
  },

  methods: {
    async loadData() {
      this.setData({ loading: true });
      try {
        const result = await fetchGroupBuyNearby({ limit: 50 });
        this.setData({ products: (result.groups || []).map((item, i) => mapProduct(item, i)) });
      } catch {
        this.setData({ products: [] });
      } finally {
        this.setData({ loading: false });
      }
    },

    /**
     * 分享参团链接落地：读取 URL 上的 groupId / inviteCode，
     * 查到具体的团后弹窗提示是否直接参团，而不是只丢进普通列表让用户自己找。
     */
    async consumeShareLink() {
      const options = readPageOptions();
      const groupId = options.groupId ? Number(options.groupId) : undefined;
      const inviteCode = options.inviteCode ? decodeURIComponent(options.inviteCode) : undefined;
      if (!groupId && !inviteCode) return;

      try {
        const group = await fetchGroupBuyDetail({ groupId, inviteCode });
        if (group.status !== 'OPEN') {
          wx.showToast({ title: group.status === 'COMPLETED' ? '该团已成团' : '该团已失败，看看其他拼单吧', icon: 'none' });
          return;
        }
        const remain = Math.max(group.needed - group.memberCount, 0);
        if (remain <= 0) {
          wx.showToast({ title: '该团已满员', icon: 'none' });
          return;
        }
        wx.showModal({
          title: '拼团邀请',
          content: `《${group.title}》还差 ${remain} 人成团，¥${group.groupPrice} 一起拼！`,
          confirmText: '去参团',
          success: (res) => {
            if (res.confirm) {
              void this.joinGroupById(group.groupId, group.productId, group.skuId);
            }
          },
        });
      } catch {
        wx.showToast({ title: '该拼团邀请已失效', icon: 'none' });
      }
    },

    async joinGroupById(groupId: number, productId: number, skuId?: number) {
      if (!ensureCustomerAccess('/pages/quick/group-buy/index')) return;
      try {
        wx.showLoading({ title: '加入拼团…' });
        const res = await joinGroupBuy({ productId, skuId, groupId });
        if (res.alreadyJoined) {
          await navigateToJoinedGroupProgress({ groupId: res.groupId || groupId, orderNo: res.orderNo });
          return;
        }
        wx.navigateTo({
          url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${groupId}&productId=${productId}&skuId=${res.skuId || skuId || 0}`,
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

    async joinGroup(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/group-buy/index')) return;
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
        if (!gid) throw new Error('拼团加入失败');
        wx.navigateTo({
          url: `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${gid}&productId=${productId}&skuId=${res.skuId || skuId || 0}`,
        });
      } catch (err: any) {
        if (isAlreadyJoinedGroupError(err)) {
          await navigateToJoinedGroupProgress({ groupId });
          return;
        }
        wx.showToast({ title: err?.message || '拼团加入失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    goBack() {
      navigateBackOrHome();
    },
  },
});
