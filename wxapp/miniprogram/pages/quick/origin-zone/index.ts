import { iconPaths } from '../../../config/icons';
import { addToCart, fetchCartItemCount } from '../../../services/app';
import { fetchOriginZoneItems, type QuickZoneProduct } from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type OriginFilterKey = 'ALL' | 'FRUIT' | 'VEG' | 'GRAIN' | 'MEAT' | 'PROCESSED';

type TabOption = { key: OriginFilterKey; label: string; matchName: string };

type QuickZoneProductView = {
  id: string;
  skuId?: number;
  title: string;
  subtitle: string;
  price: string;
  originPrice: string;
  saleCount: number;
  badge: string;
  imageClass: string;
  imageStyle: string;
  coverUrl: string;
  originPlace: string;
  categoryName: string;
  categoryId: number;
};

type PhotoView = { url: string; fallbackClass: string };

const TABS: TabOption[] = [
  { key: 'ALL', label: '全部', matchName: '' },
  { key: 'FRUIT', label: '水果', matchName: '水果' },
  { key: 'VEG', label: '蔬菜', matchName: '蔬菜' },
  { key: 'GRAIN', label: '粮油', matchName: '粮油' },
  { key: 'MEAT', label: '肉禽', matchName: '肉禽' },
  { key: 'PROCESSED', label: '加工品', matchName: '加工品' },
];

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-egg', 'img-tomato', 'img-meat', 'img-gift'];

function buildPhotos(products: QuickZoneProductView[]): PhotoView[] {
  const fallbacks = ['photo-item--fallback-0', 'photo-item--fallback-1', 'photo-item--fallback-2'];
  return Array.from({ length: 3 }, (_, i) => {
    const p = products[i];
    return {
      url: p?.coverUrl || '',
      fallbackClass: p?.coverUrl ? '' : fallbacks[i],
    };
  });
}

function readPageTitle() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options?.title ? decodeURIComponent(current.options.title) : '产地直供';
}

function mapProduct(item: QuickZoneProduct, index: number): QuickZoneProductView {
  const hasCover = !!item.coverUrl;
  return {
    id: String(item.productId),
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle || (item.originPlace ? `${item.originPlace} 直发` : '原产地新鲜直送'),
    price: item.minPrice,
    originPrice: item.originPrice || '',
    saleCount: item.saleCount ?? 0,
    badge: item.badge || (index < 2 ? '直供' : '源头'),
    imageClass: hasCover ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    imageStyle: '',
    coverUrl: item.coverUrl || '',
    originPlace: item.originPlace || '',
    categoryName: item.categoryName || '',
    categoryId: item.categoryId || 0,
  };
}

function filterProducts(products: QuickZoneProductView[], filterKey: OriginFilterKey): QuickZoneProductView[] {
  if (filterKey === 'ALL') return products;
  const tab = TABS.find((t) => t.key === filterKey);
  if (!tab) return products;
  return products.filter((item) => item.categoryName === tab.matchName);
}

Component({
  data: {
    pageTitle: '产地直供',
    tabs: TABS,
    activeFilter: 'ALL' as OriginFilterKey,
    allProducts: [] as QuickZoneProductView[],
    products: [] as QuickZoneProductView[],
    loading: false,
    cartBadge: '',
    icons: iconPaths,
    pageStyle: '',
    heroImageUrl: '/assets/images/origin/hero.jpg',
    heroPlace: '江西赣州 · 赣南脐橙产区',
    photos: [] as PhotoView[],
  },

  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/origin-zone/index')) {
        return;
      }
      this.setData({
        pageTitle: readPageTitle(),
        pageStyle: buildPageTopStyle(0),
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
        const count = await fetchCartItemCount();
        this.setData({ cartBadge: count > 0 ? String(count) : '' });
      } catch {
        this.setData({ cartBadge: '' });
      }
    },

    async loadProducts() {
      this.setData({ loading: true });
      try {
        const result = await fetchOriginZoneItems({ pageSize: 30 });
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

    setFilter(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: OriginFilterKey }) || {};
      if (!key) return;
      this.setData({
        activeFilter: key,
        products: filterProducts(this.data.allProducts, key),
      });
    },

    async addToCart(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/origin-zone/index')) return;
      const { skuId } = (e.currentTarget.dataset as { skuId?: string | number }) || {};
      if (!skuId) return;
      try {
        const result = await addToCart(Number(skuId));
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.setData({ cartBadge: result.cartCount > 0 ? String(result.cartCount) : '' });
      } catch {
        wx.showToast({ title: '加入购物车失败', icon: 'none' });
      }
    },

    goBack() {
      navigateBackOrHome();
    },

    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { id } = (e.currentTarget.dataset as { id?: string }) || {};
      if (!id) return;
      wx.navigateTo({ url: `/pages/product/detail/detail?productId=${id}` });
    },

    onPhotoMore() {},

    onHeroError() {
      this.setData({ heroImageUrl: '' });
    },

    onPhotoError(e: WechatMiniprogram.BaseEvent) {
      const i = Number((e.currentTarget.dataset as { i?: number }).i);
      if (Number.isNaN(i)) return;
      const fallbacks = ['photo-item--fallback-0', 'photo-item--fallback-1', 'photo-item--fallback-2'];
      this.setData({
        [`photos[${i}].url`]: '',
        [`photos[${i}].fallbackClass`]: fallbacks[i] || '',
      });
    },

    onGoodsImgError(e: WechatMiniprogram.BaseEvent) {
      const i = Number((e.currentTarget.dataset as { i?: number }).i);
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
