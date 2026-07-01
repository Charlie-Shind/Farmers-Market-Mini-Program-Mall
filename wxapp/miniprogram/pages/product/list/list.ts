import { iconPaths } from '../../../config/icons';
import { fetchProducts, type AppProduct } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type ProductListItem = {
  id: string;
  title: string;
  desc: string;
  price: string;
  imageClass: string;
  imageStyle: string;
  tags: string[];
  saleCount: string;
  categoryId: string;
  originPlace: string;
  isPreSale: boolean;
  productNature: string;
};

type ProductFilter = {
  label: string;
  value: string;
};

const PRODUCT_IMAGE_CLASSES = ['orange-img', 'egg-img', 'tomato-img', 'rice-img', 'oil-img', 'date-img'];
const PRODUCT_PAGE_SIZE = 24;
const PRODUCT_FILTERS: ProductFilter[] = [
  { label: '全部', value: '' },
  { label: '有机认证', value: 'organic' },
  { label: '产地筛选', value: 'origin' },
  { label: '现货商品', value: 'instock' },
  { label: '预售商品', value: 'presale' },
];

function readPageOptions() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options || {};
}

function normalizeTitle(value?: string) {
  return value ? decodeURIComponent(String(value)) : '';
}

function formatSaleCount(value?: number) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function buildTags(product: AppProduct) {
  const tags = new Set<string>();

  if (product.productNature && /有机|认证/i.test(product.productNature)) {
    tags.add('有机认证');
  }

  if (product.isPreSale) {
    tags.add('预售');
  }

  if (product.isHot) {
    tags.add('热销');
  }

  if (product.originPlace) {
    tags.add(product.originPlace);
  }

  if (!tags.size) {
    tags.add('现货');
  }

  return [...tags].slice(0, 2);
}

function mapProduct(product: AppProduct, index: number): ProductListItem {
  return {
    id: String(product.id),
    title: product.title,
    desc: product.subtitle || product.originPlace || '平台商品',
    price: `¥${product.minPrice || '0.00'}`,
    imageClass: PRODUCT_IMAGE_CLASSES[index % PRODUCT_IMAGE_CLASSES.length],
    imageStyle: product.coverUrl
      ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
      : '',
    tags: buildTags(product),
    saleCount: formatSaleCount(product.saleCount),
    categoryId: product.categoryId ? String(product.categoryId) : '',
    originPlace: product.originPlace || '',
    isPreSale: Boolean(product.isPreSale),
    productNature: product.productNature || '',
  };
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    pageTitle: '商品列表',
    pageDesc: '平台商品统一列表页',
    filters: PRODUCT_FILTERS,
    activeFilter: '',
    keyword: '',
    categoryId: '',
    scene: '' as '' | 'recommend' | 'hot' | 'gift' | 'origin' | 'flashSale' | 'groupBuy',
    loading: false,
    loadingMore: false,
    products: [] as ProductListItem[],
    allProducts: [] as ProductListItem[],
    page: 1,
    pageSize: PRODUCT_PAGE_SIZE,
    noMore: false,
    originPlaces: [] as string[],
    selectedOrigin: '',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
      });
    },
  },
  pageLifetimes: {
    show() {
      void this.bootstrapPage();
    },
  },
  methods: {
    async bootstrapPage() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const options = readPageOptions();
      const rawScene = (options.scene || '').toLowerCase();
      const sceneMap: Record<string, '' | 'recommend' | 'hot' | 'gift' | 'origin' | 'flashSale' | 'groupBuy'> = {
        recommend: 'recommend',
        hot: 'hot',
        gift: 'gift',
        origin: 'origin',
        flashsale: 'flashSale',
        groupbuy: 'groupBuy',
      };
      const scene = sceneMap[rawScene] ?? '';
      const sceneValue = scene as
        | ''
        | 'recommend'
        | 'hot'
        | 'gift'
        | 'origin'
        | 'flashSale'
        | 'groupBuy';

      const rawTitle = normalizeTitle(options.title || '');
      const keyword = sceneValue ? '' : normalizeTitle(options.keyword || options.title || '');
      const categoryId = options.categoryId ? String(options.categoryId) : '';

      this.setData({
        pageTitle: sceneValue ? `${rawTitle || this.getSceneTitle(sceneValue)} 商品列表` : `${keyword || rawTitle || '商品'} 列表`,
        pageDesc: sceneValue ? this.getSceneDesc(sceneValue) : categoryId ? `分类编号：${categoryId}` : '平台商品统一列表页',
        keyword,
        categoryId,
        scene: sceneValue,
        selectedOrigin: '',
        activeFilter: '',
        page: 1,
        noMore: false,
      });

      await this.loadProducts();
    },
    getSceneTitle(scene: string) {
      const map: Record<string, string> = {
        recommend: '智能推荐',
        hot: '热销榜单',
        gift: '礼盒专区',
        origin: '产地直供',
        flashSale: '秒杀专区',
        groupBuy: '拼团专区',
      };
      return map[scene] || '商品';
    },
    getSceneDesc(scene: string) {
      const map: Record<string, string> = {
        recommend: '根据你的浏览偏好智能推荐',
        hot: '基于真实销量排序的热销榜单',
        gift: '送礼优选，按销量排序',
        origin: '产地直采，品质保障',
        flashSale: '限时秒杀中',
        groupBuy: '附近拼团',
      };
      return map[scene] || '';
    },
    goBack() {
      navigateBackOrHome();
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: number | string }) || {};
      if (!productId) {
        return;
      }

      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${Number(productId)}`,
      });
    },
    changeFilter(e: WechatMiniprogram.BaseEvent) {
      const { filter } = (e.currentTarget.dataset as { filter?: string }) || {};
      if (filter == null) {
        return;
      }

      this.setData({
        activeFilter: filter,
        selectedOrigin: filter === 'origin' ? this.data.selectedOrigin : '',
      });
      this.applyFilter(filter, this.data.allProducts);
    },
    selectOrigin(e: WechatMiniprogram.BaseEvent) {
      const { origin } = (e.currentTarget.dataset as { origin?: string }) || {};
      this.setData({
        selectedOrigin: origin || '',
      });
      this.applyFilter(this.data.activeFilter, this.data.allProducts);
    },
    applyFilter(filter: string, source: ProductListItem[]) {
      let filtered = [...source];

      if (filter === 'organic') {
        filtered = filtered.filter((item) => /有机|认证/i.test(`${item.productNature}${item.title}${item.desc}`));
      } else if (filter === 'origin') {
        if (this.data.selectedOrigin) {
          filtered = filtered.filter((item) => item.originPlace === this.data.selectedOrigin);
        } else {
          filtered = filtered.filter((item) => Boolean(item.originPlace));
        }
      } else if (filter === 'instock') {
        filtered = filtered.filter((item) => !item.isPreSale);
      } else if (filter === 'presale') {
        filtered = filtered.filter((item) => item.isPreSale);
      }

      this.setData({ products: filtered });
    },
    async loadProducts(reset = true) {
      if (this.data.loading || this.data.loadingMore) {
        return;
      }

      const page = reset ? 1 : this.data.page;
      this.setData({ [reset ? 'loading' : 'loadingMore']: true } as any);

      try {
        const scene = this.data.scene;
        const query: {
          page: number;
          pageSize: number;
          categoryId?: number;
          isHot?: boolean;
        } = {
          page,
          pageSize: PRODUCT_PAGE_SIZE,
          categoryId: this.data.categoryId ? Number(this.data.categoryId) : undefined,
        };

        if (scene === 'hot') {
          query.isHot = true;
        }

        const result = scene === 'hot'
          ? await fetchProducts('', query)
          : await fetchProducts(this.data.keyword, query);

        const items = result.items || [];
        const mapped = items.map((item, index) => mapProduct(item, index));
        const merged = reset ? mapped : [...this.data.allProducts, ...mapped];
        const originPlaces = Array.from(new Set(merged.map((item) => item.originPlace).filter(Boolean)));
        const noMore = merged.length >= (result.total ?? merged.length) || mapped.length < PRODUCT_PAGE_SIZE;
        this.setData({
          allProducts: merged,
          originPlaces,
          page: page + 1,
          noMore,
        });
        this.applyFilter(this.data.activeFilter, merged);
      } catch {
        this.setData({
          allProducts: [],
          products: [],
          originPlaces: [],
          noMore: true,
        });
      } finally {
        this.setData({ loading: false, loadingMore: false });
      }
    },
    loadMore() {
      if (this.data.noMore || this.data.loading || this.data.loadingMore) {
        return;
      }

      void this.loadProducts(false);
    },
  },
});
