"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const quick_1 = require("../../../services/quick");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");

const TABS = [
  { key: 'ALL', label: '全部', matchName: '' },
  { key: 'FRUIT', label: '水果', matchName: '水果' },
  { key: 'VEG', label: '蔬菜', matchName: '蔬菜' },
  { key: 'GRAIN', label: '粮油', matchName: '粮油' },
  { key: 'MEAT', label: '肉禽', matchName: '肉禽' },
  { key: 'PROCESSED', label: '加工品', matchName: '加工品' },
];

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-egg', 'img-tomato', 'img-meat', 'img-gift'];

function buildPhotos(products) {
  const FALLBACKS = ['photo-item--fallback-0', 'photo-item--fallback-1', 'photo-item--fallback-2'];
  const srcs = [];
  for (let i = 0; i < 3; i++) {
    const p = products[i];
    srcs.push({
      url: (p === null || p === void 0 ? void 0 : p.coverUrl) || '',
      fallbackClass: (p === null || p === void 0 ? void 0 : p.coverUrl) ? '' : FALLBACKS[i],
    });
  }
  return srcs;
}

function readPageTitle() {
  var _a;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  return ((_a = current === null || current === void 0 ? void 0 : current.options) === null || _a === void 0 ? void 0 : _a.title) ? decodeURIComponent(current.options.title) : '产地直供';
}

function mapProduct(item, index) {
  const hasCover = !!item.coverUrl;
  return {
    id: String(item.productId),
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle || (item.originPlace ? `${item.originPlace} 直发` : '原产地新鲜直送'),
    price: item.minPrice,
    originPrice: item.originPrice || '',
    saleCount: item.saleCount != null ? item.saleCount : 0,
    badge: item.badge || (index < 2 ? '直供' : '源头'),
    imageClass: hasCover ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    imageStyle: '',
    coverUrl: item.coverUrl || '',
    originPlace: item.originPlace || '',
    categoryName: item.categoryName || '',
    categoryId: item.categoryId || 0,
  };
}

function filterProducts(products, filterKey) {
  if (filterKey === 'ALL') return products;
  const tab = TABS.find((t) => t.key === filterKey);
  if (!tab) return products;
  return products.filter((item) => item.categoryName === tab.matchName);
}

Component({
  data: {
    pageTitle: '产地直供',
    tabs: TABS,
    activeFilter: 'ALL',
    allProducts: [],
    products: [],
    loading: false,
    cartBadge: '',
    icons: icons_1.iconPaths,
    pageStyle: '',
    heroImageUrl: '/assets/images/origin/hero.jpg',
    heroPlace: '江西赣州 · 赣南脐橙产区',
    photos: [],
  },

  lifetimes: {
    attached() {
      if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/quick/origin-zone/index')) {
        return;
      }
      this.setData({
        pageTitle: readPageTitle(),
        pageStyle: (0, page_layout_1.buildPageTopStyle)(0),
      });
      void this.loadProducts();
      void this.syncCartBadge();
    },
  },

  pageLifetimes: {
    show() {
      void this.syncCartBadge();
    },
  },

  methods: {
    async syncCartBadge() {
      try {
        const count = await (0, app_1.fetchCartItemCount)();
        this.setData({ cartBadge: count > 0 ? String(count) : '' });
      } catch {
        this.setData({ cartBadge: '' });
      }
    },

    async loadProducts() {
      this.setData({ loading: true });
      try {
        const result = await (0, quick_1.fetchOriginZoneItems)({ pageSize: 30 });
        const mapped = (result.items || []).map((item, index) => mapProduct(item, index));
        this.setData({
          allProducts: mapped,
          products: filterProducts(mapped, this.data.activeFilter),
          photos: buildPhotos(mapped),
        });
      } catch {
        this.setData({ allProducts: [], products: [], photos: [] });
      } finally {
        this.setData({ loading: false });
      }
    },

    setFilter(e) {
      const { key } = e.currentTarget.dataset || {};
      if (!key) return;
      this.setData({
        activeFilter: key,
        products: filterProducts(this.data.allProducts, key),
      });
    },

    async addToCart(e) {
      if (!(0, auth_route_1.ensureCustomerAccess)('/pages/quick/origin-zone/index')) return;
      const { skuId } = e.currentTarget.dataset || {};
      if (!skuId) return;
      try {
        const result = await (0, app_1.addToCart)(Number(skuId));
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.setData({ cartBadge: result.cartCount > 0 ? String(result.cartCount) : '' });
      } catch {
        wx.showToast({ title: '加入购物车失败', icon: 'none' });
      }
    },

    goBack() {
      (0, auth_route_1.navigateBackOrHome)();
    },

    openProductDetail(e) {
      const { id } = e.currentTarget.dataset || {};
      if (!id) return;
      wx.navigateTo({ url: `/pages/product/detail/detail?productId=${id}` });
    },

    onShare() {},

    onPhotoMore() {},

    onHeroError() {
      this.setData({ heroImageUrl: '' });
    },

    onPhotoError(e) {
      const i = Number((e.currentTarget.dataset || {}).i);
      if (Number.isNaN(i)) return;
      const photos = this.data.photos;
      if (photos[i]) {
        const fb = ['photo-item--fallback-0', 'photo-item--fallback-1', 'photo-item--fallback-2'];
        this.setData({
          [`photos[${i}].url`]: '',
          [`photos[${i}].fallbackClass`]: fb[i] || '',
        });
      }
    },

    onGoodsImgError(e) {
      const i = Number((e.currentTarget.dataset || {}).i);
      if (Number.isNaN(i)) return;
      const products = this.data.products;
      if (products[i]) {
        this.setData({
          [`products[${i}].coverUrl`]: '',
          [`products[${i}].imageClass`]: IMAGE_CLASSES[i % IMAGE_CLASSES.length],
        });
      }
    },
  },
});
