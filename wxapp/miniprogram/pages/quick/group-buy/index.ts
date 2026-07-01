import { iconPaths } from '../../../config/icons';
import { fetchGroupBuyNearby, joinGroupBuy, type GroupBuyItem } from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type ProductView = {
  productId: string; skuId?: number; title: string; subtitle: string;
  groupPrice: string; originPrice: string; coverUrl: string; imageClass: string; needed: number;
};

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

function mapProduct(item: GroupBuyItem, index: number): ProductView {
  return {
    productId: String(item.productId),
    skuId: item.skuId ?? undefined,
    title: item.title,
    subtitle: item.roughArea || '',
    groupPrice: item.groupPrice,
    originPrice: item.originPrice,
    coverUrl: item.coverUrl || '',
    imageClass: item.coverUrl ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    needed: item.needed - item.memberCount,
  };
}

function readPageTitle() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options?.title ? decodeURIComponent(current.options.title) : '可拼团商品';
}

Component({
  data: {
    pageTitle: '可拼团商品',
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
      } finally { this.setData({ loading: false }); }
    },

    async joinGroup(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/group-buy/index')) return;
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

    goBack() { navigateBackOrHome(); },
  },
});
