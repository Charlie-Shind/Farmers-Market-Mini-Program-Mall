"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const quick_1 = require("../../../services/quick");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

function mapProduct(item, index) {
  return {
    productId: String(item.productId),
    skuId: item.skuId != null ? item.skuId : undefined,
    title: item.title,
    subtitle: item.subtitle || item.originPlace || '',
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
  return ((_a = current === null || current === void 0 ? void 0 : current.options) === null || _a === void 0 ? void 0 : _a.title) ? decodeURIComponent(current.options.title) : '可拼团商品';
}

Component({
  data: {
    pageTitle: '可拼团商品',
    pageStyle: '',
    icons: icons_1.iconPaths,
    loading: false,
    products: [],
  },

  lifetimes: {
    attached() {
      if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/quick/group-buy/index')) return;
      this.setData({ pageTitle: readPageTitle(), pageStyle: (0, page_layout_1.buildPageTopStyle)(0) });
      void this.loadData();
    },
  },

  methods: {
    async loadData() {
      this.setData({ loading: true });
      try {
        const result = await (0, quick_1.fetchGroupBuyProducts)({ pageSize: 50 });
        this.setData({ products: (result.items || []).map(function(item, i) { return mapProduct(item, i); }) });
      } catch {
        this.setData({ products: [] });
      } finally { this.setData({ loading: false }); }
    },

    async joinGroup(e) {
      if (!(0, auth_route_1.ensureCustomerAccess)('/pages/quick/group-buy/index')) return;
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

    goBack() { (0, auth_route_1.navigateBackOrHome)(); },
  },
});
