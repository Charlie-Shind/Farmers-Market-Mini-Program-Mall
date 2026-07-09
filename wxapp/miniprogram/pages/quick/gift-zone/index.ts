import { iconPaths } from '../../../config/icons';
import { addToCart, fetchCartItemCount } from '../../../services/app';
import { fetchGiftZoneItems, type QuickZoneProduct } from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../utils/auth-route';

type GiftFilterKey = 'ALL' | 'FRUIT' | 'GRAIN' | 'MIXED' | 'TONIC';

type GiftProductView = {
  id: string;
  skuId?: number;
  title: string;
  subtitle: string;
  price: string;
  coverUrl: string;
  imageClass: string;
  tags: string[];
  filterKey: GiftFilterKey;
};

type TabsOption = { key: GiftFilterKey; label: string };

const TABS: TabsOption[] = [
  { key: 'ALL', label: '全部礼盒' },
  { key: 'FRUIT', label: '水果礼盒' },
  { key: 'GRAIN', label: '粮油礼盒' },
  { key: 'MIXED', label: '杂粮礼盒' },
  { key: 'TONIC', label: '滋补礼盒' },
];

const IMAGE_CLASSES = ['img-gift', 'img-rice', 'img-orange', 'img-egg', 'img-meat', 'img-tomato'];

function readPageTitle() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options?.title ? decodeURIComponent(current.options.title) : '礼盒专区';
}

function classifyGift(item: QuickZoneProduct): GiftFilterKey {
  const text = `${item.title} ${item.subtitle || ''} ${item.categoryName || ''}`.replace(/\s+/g, '');
  if (/(果|橙|柑|橘|莓|桃|梨|瓜|荔|芒|蕉|葡|樱|柿)/.test(text)) return 'FRUIT';
  if (/(米|面|油|粮|花生|芝麻|麦|稻)/.test(text)) return 'GRAIN';
  if (/(杂粮|豆|干货|菌菇|坚果|干贝|山货|木耳|香菇|笋|枣|杞)/.test(text)) return 'MIXED';
  if (/(滋补|海参|燕窝|阿胶|保健|药食|参|茸|虫草)/.test(text)) return 'TONIC';
  // fallback: 按类目名再匹配一次
  const cat = item.categoryName || '';
  if (/(水果|果|鲜果)/.test(cat)) return 'FRUIT';
  if (/(粮油|米面|油)/.test(cat)) return 'GRAIN';
  if (/(加工品|干货|杂粮)/.test(cat)) return 'MIXED';
  if (/(肉禽|滋补|保健)/.test(cat)) return 'TONIC';
  return 'MIXED';
}

function buildTags(item: QuickZoneProduct): string[] {
  const tags: string[] = [];
  if (item.originPlace) tags.push(item.originPlace + '直发');
  if (item.isPreSale) tags.push('预售');
  if (item.badge) tags.push(item.badge);
  tags.push('礼盒包装');
  tags.push('送礼佳品');
  return tags.slice(0, 4);
}

function mapProduct(item: QuickZoneProduct, index: number): GiftProductView {
  const hasCover = !!item.coverUrl;
  return {
    id: String(item.productId),
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle || '精选好物，礼盒包装',
    price: item.minPrice,
    coverUrl: item.coverUrl || '',
    imageClass: hasCover ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    tags: buildTags(item),
    filterKey: classifyGift(item),
  };
}

function filterProducts(products: GiftProductView[], filterKey: GiftFilterKey): GiftProductView[] {
  if (filterKey === 'ALL') return products;
  return products.filter((item) => item.filterKey === filterKey);
}

Component({
  data: {
    pageTitle: '礼盒专区',
    tabs: TABS,
    activeFilter: 'ALL' as GiftFilterKey,
    allProducts: [] as GiftProductView[],
    products: [] as GiftProductView[],
    mainGift: null as GiftProductView | null,
    secondGift: null as GiftProductView | null,
    moreGifts: [] as GiftProductView[],
    loading: false,
    cartBadge: '',
    icons: iconPaths,
    pageStyle: '',
    heroImageUrl: '/assets/images/gift/gift-hero.jpg',
  },

  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/gift-zone/index')) {
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
        const result = await fetchGiftZoneItems({ pageSize: 20 });
        const mapped = (result.items || []).map((item, index) => mapProduct(item, index));
        const filtered = filterProducts(mapped, this.data.activeFilter);

        const mainGift = filtered.length > 0 ? filtered[0] : null;
        const secondGift = filtered.length > 1 ? filtered[1] : null;
        const moreGifts = filtered;

        this.setData({
          allProducts: mapped,
          products: filtered,
          mainGift,
          secondGift,
          moreGifts,
        });
      } catch {
        this.setData({
          allProducts: [], products: [],
          mainGift: null, secondGift: null,
          moreGifts: [],
        });
      } finally {
        this.setData({ loading: false });
      }
    },

    setFilter(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: GiftFilterKey }) || {};
      if (!key) return;
      const filtered = filterProducts(this.data.allProducts, key);
      const mainGift = filtered.length > 0 ? filtered[0] : null;
      const secondGift = filtered.length > 1 ? filtered[1] : null;
      const moreGifts = filtered;

      this.setData({
        activeFilter: key,
        products: filtered,
        mainGift,
        secondGift,
        moreGifts,
      });
    },

    async addToCart(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/quick/gift-zone/index')) return;
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

    onShare() {},

    onGoodsImgError(e: WechatMiniprogram.BaseEvent) {
      const i = (e.currentTarget.dataset as { i?: string }).i;
      if (i === 'main' && this.data.mainGift) {
        this.setData({ 'mainGift.coverUrl': '', 'mainGift.imageClass': IMAGE_CLASSES[0] });
      } else if (i === 'second' && this.data.secondGift) {
        this.setData({ 'secondGift.coverUrl': '', 'secondGift.imageClass': IMAGE_CLASSES[1] });
      }
    },
  },
});
