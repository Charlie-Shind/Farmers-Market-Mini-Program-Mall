import { iconPaths } from '../../../config/icons';
import { fetchProducts, type AppProduct } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type SceneKey = '' | 'recommend' | 'hot' | 'new' | 'gift' | 'origin' | 'flashSale' | 'groupBuy';
type SceneTone = 'default' | 'recommend' | 'hot' | 'new';

type ProductListItem = {
  id: string;
  title: string;
  desc: string;
  price: string;
  imageClass: string;
  imageStyle: string;
  tags: string[];
  saleCount: string;
  saleCountRaw: number;
  categoryId: string;
  originPlace: string;
  isPreSale: boolean;
  productNature: string;
  createdAt: number;
  isNew: boolean;
  rankNo: string;
  rankTone: 'gold' | 'silver' | 'bronze' | 'normal';
};

type ProductFilter = {
  label: string;
  value: string;
  icon?: string;
  iconColor?: string;
};

const PRODUCT_IMAGE_CLASSES = ['orange-img', 'egg-img', 'tomato-img', 'rice-img', 'oil-img', 'date-img'];
const PRODUCT_PAGE_SIZE = 24;

const DEFAULT_FILTERS: ProductFilter[] = [
  { label: '全部', value: '', icon: 'origin', iconColor: '#2c4a39' },
  { label: '有机认证', value: 'organic', icon: 'shield', iconColor: '#3f6f44' },
  { label: '产地筛选', value: 'origin', icon: 'origin', iconColor: '#2c4a39' },
  { label: '现货', value: 'instock', icon: 'truck', iconColor: '#c65f2d' },
  { label: '预售', value: 'presale', icon: 'flash', iconColor: '#c65f2d' },
];

const SCENE_FILTERS: Record<string, ProductFilter[]> = {
  hot: [
    { label: '全部热销', value: '', icon: 'star', iconColor: '#c65f2d' },
    { label: '有机认证', value: 'organic', icon: 'shield', iconColor: '#3f6f44' },
    { label: '现货速发', value: 'instock', icon: 'truck', iconColor: '#c65f2d' },
    { label: '预售好货', value: 'presale', icon: 'flash', iconColor: '#c65f2d' },
  ],
  recommend: [
    { label: '全部推荐', value: '', icon: 'gift', iconColor: '#2c4a39' },
    { label: '有机认证', value: 'organic', icon: 'shield', iconColor: '#3f6f44' },
    { label: '产地优选', value: 'origin', icon: 'origin', iconColor: '#2c4a39' },
    { label: '现货', value: 'instock', icon: 'truck', iconColor: '#c65f2d' },
  ],
  new: [
    { label: '全部上新', value: '', icon: 'flash', iconColor: '#d8a978' },
    { label: '现货新品', value: 'instock', icon: 'truck', iconColor: '#c65f2d' },
    { label: '预售新品', value: 'presale', icon: 'gift', iconColor: '#c65f2d' },
    { label: '有机认证', value: 'organic', icon: 'shield', iconColor: '#3f6f44' },
  ],
};

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
  if (product.productNature && /有机|认证/i.test(product.productNature)) tags.add('有机认证');
  if (product.isPreSale) tags.add('预售');
  if (product.isHot) tags.add('热销');
  if (product.originPlace) tags.add(product.originPlace);
  if (!tags.size) tags.add('现货');
  return [...tags].slice(0, 2);
}

function mapProduct(product: AppProduct, index: number): ProductListItem {
  const createdAt = product.createdAt ? new Date(product.createdAt).getTime() : 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const rank = index + 1;
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
    saleCountRaw: Number(product.saleCount || 0),
    categoryId: product.categoryId ? String(product.categoryId) : '',
    originPlace: product.originPlace || '',
    isPreSale: Boolean(product.isPreSale),
    productNature: product.productNature || '',
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt,
    isNew: createdAt > 0 && Date.now() - createdAt < sevenDays,
    rankNo: String(rank),
    rankTone: rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'normal',
  };
}

function withRank(list: ProductListItem[]): ProductListItem[] {
  return list.map((item, index) => {
    const rank = index + 1;
    return {
      ...item,
      rankNo: String(rank),
      rankTone: rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'normal',
    };
  });
}

function sortForScene(list: ProductListItem[], scene: SceneKey): ProductListItem[] {
  const next = [...list];
  if (scene === 'hot') {
    next.sort((a, b) => b.saleCountRaw - a.saleCountRaw || b.createdAt - a.createdAt);
  } else if (scene === 'new') {
    next.sort((a, b) => b.createdAt - a.createdAt || b.saleCountRaw - a.saleCountRaw);
  } else if (scene === 'recommend') {
    next.sort((a, b) => b.saleCountRaw - a.saleCountRaw || b.createdAt - a.createdAt);
  }
  return withRank(next);
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    pageTitle: '商品列表',
    pageDesc: '精选产地好货',
    pageEyebrow: '湾源农仓',
    navTheme: 'solid',
    sceneTone: 'default' as SceneTone,
    sceneIcon: 'origin',
    ctaLabel: '去看看',
    filters: DEFAULT_FILTERS,
    activeFilter: '',
    keyword: '',
    categoryId: '',
    scene: '' as SceneKey,
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
      this.setData({ pageStyle: buildPageTopStyle(0) });
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
      const sceneMap: Record<string, SceneKey> = {
        recommend: 'recommend',
        hot: 'hot',
        new: 'new',
        gift: 'gift',
        origin: 'origin',
        flashsale: 'flashSale',
        groupbuy: 'groupBuy',
      };
      const scene = sceneMap[rawScene] ?? '';
      const rawTitle = normalizeTitle(options.title || '');
      const keyword = scene ? '' : normalizeTitle(options.keyword || options.title || '');
      const categoryId = options.categoryId ? String(options.categoryId) : '';
      const loadKey = `${scene}|${keyword}|${categoryId}`;
      // 从商品详情返回时跳过重载，避免闪屏与重复请求
      if ((this as any)._loadedKey === loadKey) {
        return;
      }
      const meta = this.getSceneMeta(scene, rawTitle, keyword, categoryId);

      this.setData({
        pageTitle: meta.title,
        pageDesc: meta.desc,
        pageEyebrow: meta.eyebrow,
        sceneTone: meta.tone,
        sceneIcon: meta.icon,
        ctaLabel: meta.cta,
        filters: meta.filters,
        keyword,
        categoryId,
        scene,
        selectedOrigin: '',
        activeFilter: '',
        page: 1,
        noMore: false,
      });

      const ok = await this.loadProducts();
      if (ok) {
        (this as any)._loadedKey = loadKey;
      }
    },

    getSceneMeta(scene: SceneKey, rawTitle: string, keyword: string, categoryId: string) {
      if (scene === 'hot') {
        return {
          title: rawTitle || '热销榜单',
          desc: '按真实销量排序，甄选社区热门好货',
          eyebrow: '湾源热卖',
          tone: 'hot' as SceneTone,
          icon: 'star',
          cta: '去抢购',
          filters: SCENE_FILTERS.hot,
        };
      }
      if (scene === 'recommend') {
        return {
          title: rawTitle || '智能推荐',
          desc: '结合时令与偏好，为你精选值得一试的产地好物',
          eyebrow: '为你精选',
          tone: 'recommend' as SceneTone,
          icon: 'gift',
          cta: '去看看',
          filters: SCENE_FILTERS.recommend,
        };
      }
      if (scene === 'new') {
        return {
          title: rawTitle || '新品尝鲜',
          desc: '新鲜上架的产地新品，抢先尝鲜',
          eyebrow: '上新速递',
          tone: 'new' as SceneTone,
          icon: 'flash',
          cta: '尝鲜',
          filters: SCENE_FILTERS.new,
        };
      }
      return {
        title: keyword || rawTitle || '商品列表',
        desc: categoryId ? '按分类浏览平台好物' : '精选产地好货，一站购齐',
        eyebrow: '湾源农仓',
        tone: 'default' as SceneTone,
        icon: 'origin',
        cta: '去看看',
        filters: DEFAULT_FILTERS,
      };
    },

    goBack() {
      navigateBackOrHome();
    },

    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: number | string }) || {};
      if (!productId) return;
      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${Number(productId)}`,
      });
    },

    changeFilter(e: WechatMiniprogram.BaseEvent) {
      const { filter } = (e.currentTarget.dataset as { filter?: string }) || {};
      if (filter == null) return;
      this.setData({
        activeFilter: filter,
        selectedOrigin: filter === 'origin' ? this.data.selectedOrigin : '',
      });
      this.applyFilter(filter, this.data.allProducts);
    },

    selectOrigin(e: WechatMiniprogram.BaseEvent) {
      const { origin } = (e.currentTarget.dataset as { origin?: string }) || {};
      this.setData({ selectedOrigin: origin || '' });
      this.applyFilter(this.data.activeFilter, this.data.allProducts);
    },

    applyFilter(filter: string, source: ProductListItem[]) {
      let filtered = [...source];
      if (filter === 'organic') {
        filtered = filtered.filter((item) => /有机|认证/i.test(`${item.productNature}${item.title}${item.desc}`));
      } else if (filter === 'origin') {
        filtered = this.data.selectedOrigin
          ? filtered.filter((item) => item.originPlace === this.data.selectedOrigin)
          : filtered.filter((item) => Boolean(item.originPlace));
      } else if (filter === 'instock') {
        filtered = filtered.filter((item) => !item.isPreSale);
      } else if (filter === 'presale') {
        filtered = filtered.filter((item) => item.isPreSale);
      }
      this.setData({ products: sortForScene(filtered, this.data.scene) });
    },

    async loadProducts(reset = true): Promise<boolean> {
      if (this.data.loading || this.data.loadingMore) return false;

      const page = reset ? 1 : this.data.page;
      this.setData({ [reset ? 'loading' : 'loadingMore']: true } as any);

      try {
        const scene = this.data.scene;
        const query: {
          page: number;
          pageSize: number;
          categoryId?: number;
          isHot?: boolean;
          isPreSale?: boolean;
        } = {
          page,
          pageSize: PRODUCT_PAGE_SIZE,
          categoryId: this.data.categoryId ? Number(this.data.categoryId) : undefined,
        };

        if (scene === 'hot') query.isHot = true;

        const result = scene === 'hot'
          ? await fetchProducts('', query)
          : await fetchProducts(this.data.keyword, query);

        const items = result.items || [];
        const mapped = items.map((item, index) => mapProduct(item, index));
        const merged = sortForScene(reset ? mapped : [...this.data.allProducts, ...mapped], scene);
        const originPlaces = Array.from(new Set(merged.map((item) => item.originPlace).filter(Boolean)));
        const serverPageSize = Number((result as any).pageSize) || PRODUCT_PAGE_SIZE;
        const total = Number((result as any).total);
        const noMore =
          mapped.length === 0 ||
          mapped.length < serverPageSize ||
          (Number.isFinite(total) && total >= 0 && merged.length >= total);

        this.setData({
          allProducts: merged,
          originPlaces,
          page: page + 1,
          noMore,
        });
        this.applyFilter(this.data.activeFilter, merged);
        return true;
      } catch {
        this.setData({
          allProducts: [],
          products: [],
          originPlaces: [],
          noMore: true,
        });
        return false;
      } finally {
        this.setData({ loading: false, loadingMore: false });
      }
    },

    loadMore() {
      if (this.data.noMore || this.data.loading || this.data.loadingMore) return;
      void this.loadProducts(false);
    },
  },
});
