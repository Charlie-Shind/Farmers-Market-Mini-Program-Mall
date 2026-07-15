import { iconPaths } from '../../../config/icons';
import {
  addToCart as addToCartApi,
  fetchCartItemCount,
  fetchCategoryRecommendations,
  fetchProducts,
  fetchHomeBanners,
  fetchProductDetail,
  type AppProduct,
  type AppProductDetail,
} from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type BoardProductView = {
  id: string;
  skuId?: number;
  title: string;
  subtitle: string;
  price: string;
  badge: string;
  imageClass: string;
  imageStyle: string;
  isPreSale: boolean;
  originPlace: string;
  productNature?: string;
  deliveryType?: number;
  groupBuyConfig?: AppProductDetail['groupBuyConfig'];
};

type ProductCardSource = Omit<AppProduct, 'originPlace'> & {
  originPlace?: string;
  price?: string;
  originalPrice?: string;
  salesCount?: number;
  skuId?: number;
};

async function readPageOptions(): Promise<Record<string, string>> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
      }
    | undefined;

  return current?.options || {};
}

function mapRecommendProduct(
  item: ProductCardSource,
  index: number,
): BoardProductView {
  const groupBuyConfig = (item as AppProductDetail).groupBuyConfig ?? null;
  return {
    id: String(item.id),
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle || '本周热卖',
    price: item.price || '0.00',
    badge: groupBuyConfig?.enabled ? '拼团' : item.isHot ? '热卖' : '推荐',
    imageClass: ['img-orange', 'img-tomato', 'img-egg', 'img-rice', 'img-meat', 'img-gift'][index % 6],
    imageStyle: item.coverUrl
      ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
      : '',
    isPreSale: !!item.isPreSale,
    originPlace: item.originPlace || '',
    productNature: item.productNature || '',
    deliveryType: item.deliveryType,
    groupBuyConfig,
  };
}

function mapBackendProduct(
  item: ProductCardSource,
  index: number,
): BoardProductView {
  const groupBuyConfig = (item as AppProductDetail).groupBuyConfig ?? null;
  return {
    id: String(item.id),
    skuId: item.skuId,
    title: item.title,
    subtitle: item.subtitle || item.originPlace || '产地直供',
    price: item.minPrice || '0.00',
    badge: groupBuyConfig?.enabled ? '拼团' : item.isHot ? '热卖' : '现货',
    imageClass: ['img-orange', 'img-tomato', 'img-egg', 'img-rice', 'img-meat', 'img-gift'][index % 6],
    imageStyle: item.coverUrl
      ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
      : '',
    isPreSale: !!item.isPreSale,
    originPlace: item.originPlace || '',
    productNature: item.productNature || '',
    deliveryType: item.deliveryType,
    groupBuyConfig,
  };
}

function isOrganicProduct(item: BoardProductView) {
  const text = `${item.title}${item.subtitle}${item.productNature || ''}`;
  return /有机|认证|organic/i.test(text);
}

function isPreSaleProduct(item: BoardProductView) {
  return Boolean(item.isPreSale || Number(item.deliveryType ?? 1) === 2);
}


Component({
  data: {
    categoryKey: 'fruit',
    categoryName: '时令果蔬',
    categoryId: '',
    products: [] as BoardProductView[],
    bannerInfo: null as { title: string; imageUrl: string } | null,
    loading: false,
    cartBadge: '',
    icons: iconPaths,
    pageStyle: '',
    showSpecSheet: false,
    activeSpecProduct: null as any,

    // 筛选标签相关
    filterOptions: [
      { label: '全部', value: '' },
      { label: '有机认证', value: 'organic' },
      { label: '产地筛选', value: 'origin' },
      { label: '现货商品', value: 'instock' },
      { label: '预售商品', value: 'presale' },
    ],
    activeFilter: '',
    selectedOrigin: '',
    originPlaces: [] as string[],
    allProducts: [] as BoardProductView[],
  },

  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });

      void this.syncCartBadge();
    },
  },
  pageLifetimes: {
    show() {
      void this.syncCartBadge();
      void this.loadBoardState();
    },
  },
  methods: {
    async syncCartBadge() {
      try {
        const count = await fetchCartItemCount();
        this.setData({
          cartBadge: count > 0 ? String(count) : '',
        });
      } catch {
        this.setData({
          cartBadge: '',
        });
      }
    },
    async loadBoardState() {
      const options = await readPageOptions();
      const routeCategoryId = options.categoryId ? String(options.categoryId) : '';
      const routeCategoryName = options.categoryName ? decodeURIComponent(options.categoryName) : '';
      const activeKey = options.cat ? String(options.cat) : '';
      const numericCategoryId = Number(routeCategoryId);

      if (!routeCategoryId || !Number.isFinite(numericCategoryId) || numericCategoryId <= 0) {
        wx.showToast({ title: '分类未找到', icon: 'none' });
        setTimeout(() => navigateBackOrHome(), 1500);
        return;
      }

      const bannerId = options.bannerId ? Number(options.bannerId) : null;
      let bannerInfo = null;
      if (bannerId != null && bannerId > 0) {
        try {
          const banners = await fetchHomeBanners().catch(() => []);
          const found = banners.find((b) => b.id === bannerId);
          if (found) {
            bannerInfo = {
              title: found.title,
              imageUrl: found.imageUrl,
            };
          }
        } catch (err) {
          console.error('Fetch banner failed:', err);
        }
      }

      this.setData({
        categoryKey: activeKey,
        categoryName: routeCategoryName || '全部分类',
        categoryId: routeCategoryId,
        bannerInfo,
        loading: true,
        activeFilter: '',
        selectedOrigin: '',
        originPlaces: [],
      });

      try {
        const resCatId = numericCategoryId;
        const recResponse = await fetchCategoryRecommendations(resCatId, { period: 'week', pageSize: 8 }).catch(() => null);
        const recItems = recResponse?.items ?? [];
        if (recItems.length) {
          const mappedItems = recItems.map((item, index) => mapRecommendProduct(item, index));
          const origins = Array.from(new Set(mappedItems.map((item) => item.originPlace).filter(Boolean))) as string[];
          this.setData({
            allProducts: mappedItems,
            originPlaces: origins,
          });
          this.applyFilter();
          return;
        }

        const response = await fetchProducts('', 8, resCatId);
        const items = response.items ?? [];

        if (items.length) {
          const mappedItems = items.map((item, index) => mapBackendProduct(item, index));
          const origins = Array.from(new Set(mappedItems.map((item) => item.originPlace).filter(Boolean))) as string[];
          this.setData({
            allProducts: mappedItems,
            originPlaces: origins,
          });
          this.applyFilter();
          return;
        }

        this.setData({
          allProducts: [],
          products: [],
          originPlaces: [],
        });
      } catch {
        this.setData({
          allProducts: [],
          products: [],
          originPlaces: [],
        });
      } finally {

        this.setData({
          loading: false,
        });
      }
    },
    async addToCart(e: WechatMiniprogram.BaseEvent & { detail?: { skuId?: number; product?: any } }) {
      const productId = e.detail?.product?.id || (e.currentTarget.dataset as { id?: number | string })?.id;
      if (!productId) {
        wx.showToast({ title: '商品不存在', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '加载中...', mask: true });
      try {
        const fullProduct = await fetchProductDetail(Number(productId));
        wx.hideLoading();

        if (fullProduct.skus && fullProduct.skus.length > 0) {
          this.setData({
            activeSpecProduct: fullProduct,
            showSpecSheet: true,
          });
        } else {
          wx.showToast({ title: '该商品暂无规格', icon: 'none' });
        }
      } catch (err: any) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '获取商品规格失败', icon: 'none' });
      }
    },
    onCloseSpecSheet() {
      this.setData({ showSpecSheet: false });
    },
    async onConfirmSpecSheet(e: WechatMiniprogram.BaseEvent & { detail?: { sku?: any; qty?: number } }) {
      const { sku, qty } = e.detail || {};
      if (!sku) {
        wx.showToast({ title: '请选择规格', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '添加中...', mask: true });
      try {
        const result = await addToCartApi(Number(sku.id), qty || 1);
        wx.hideLoading();
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.setData({
          showSpecSheet: false,
          cartBadge: result.cartCount > 0 ? String(result.cartCount) : '',
        });
      } catch (err: any) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '加入购物车失败', icon: 'none' });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { id } = (e.currentTarget.dataset as { id?: string }) || {};
      if (id) {
        wx.navigateTo({
          url: `/pages/product/detail/detail?productId=${id}`,
        });
      }
    },
    applyFilter() {
      const { allProducts, activeFilter, selectedOrigin } = this.data;
      let filtered = [...allProducts];

      if (activeFilter === 'organic') {
        filtered = filtered.filter((item) => isOrganicProduct(item));
      } else if (activeFilter === 'origin') {
        if (selectedOrigin) {
          filtered = filtered.filter(item => item.originPlace === selectedOrigin);
        } else {
          filtered = filtered.filter(item => !!item.originPlace);
        }
      } else if (activeFilter === 'instock') {
        filtered = filtered.filter((item) => !isPreSaleProduct(item));
      } else if (activeFilter === 'presale') {
        filtered = filtered.filter((item) => isPreSaleProduct(item));
      }

      this.setData({
        products: filtered
      });
    },
    onFilterChange(e: WechatMiniprogram.BaseEvent) {
      const { value } = e.currentTarget.dataset as { value: string };
      this.setData({
        activeFilter: value,
        selectedOrigin: value === 'origin' ? this.data.selectedOrigin : '',
      });
      this.applyFilter();
    },
    onSelectOrigin(e: WechatMiniprogram.BaseEvent) {
      const { origin } = e.currentTarget.dataset as { origin: string };
      this.setData({
        selectedOrigin: origin
      });
      this.applyFilter();
    }
  },
});
