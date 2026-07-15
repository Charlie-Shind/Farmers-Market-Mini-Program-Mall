import { iconPaths } from '../../../config/icons';
import { addToCart, fetchHomeHotProducts, fetchProducts } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { buildProfileLoginUrl, navigateBackOrHome } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';

type TopicProductView = {
  id: string;
  skuId?: number;
  title: string;
  desc: string;
  price: string;
  imageClass: string;
  imageStyle: string;
  tags: string[];
  saleCount: string;
};

const TOPIC_FILTERS = ['精选', '秒杀', '拼团', '礼盒'];

function readPageOptions() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  return current?.options || {};
}

function formatSaleCount(value?: number) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function buildTopicTags(product: { isHot?: boolean; originPlace?: string; isPreSale?: boolean; title: string }, index: number) {
  const tags: string[] = [];

  if (product.isHot) {
    tags.push('热销');
  }

  if (product.isPreSale) {
    tags.push('预售');
  }

  if (product.originPlace) {
    tags.push(product.originPlace);
  }

  if (!tags.length) {
    tags.push(index % 2 === 0 ? '精选' : '限时');
  }

  return tags.slice(0, 2);
}

function buildTopicView(product: {
  id: number;
  skuId?: number;
  title: string;
  subtitle?: string;
  originPlace?: string;
  minPrice?: string;
  coverUrl?: string;
  saleCount?: number;
  isHot?: boolean;
  isPreSale?: boolean;
}, index: number): TopicProductView {
  return {
    id: String(product.id),
    skuId: product.skuId,
    title: product.title,
    desc: product.subtitle || product.originPlace || '活动专题精选商品',
    price: product.minPrice || '0.00',
    imageClass: ['img-orange', 'img-tomato', 'img-egg', 'img-rice', 'img-meat', 'img-gift'][index % 6],
    imageStyle: product.coverUrl
      ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
      : '',
    tags: buildTopicTags(product, index),
    saleCount: formatSaleCount(product.saleCount),
  };
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    pageTitle: '活动专题',
    pageDesc: '源头好货限时补贴，产地直采、冷链直发、售后无忧。',
    filters: TOPIC_FILTERS,
    activeFilter: TOPIC_FILTERS[0],
    loading: false,
    allProducts: [] as TopicProductView[],
    products: [] as TopicProductView[],
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
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

      this.setData({
        pageTitle: options.title ? decodeURIComponent(options.title) : '活动专题',
        pageDesc: options.title ? '平台官方活动专题聚合页' : '源头好货限时补贴，产地直采、冷链直发、售后无忧。',
      });

      await this.loadTopicData();
    },
    goBack() {
      navigateBackOrHome();
    },
    ensureAccess() {
      if (getAuthTokenType() === 'access') {
        return true;
      }

      wx.navigateTo({
        url: buildProfileLoginUrl('/pages/activity/topic/topic'),
      });
      return false;
    },
    async loadTopicData() {
      this.setData({ loading: true });

      try {
        const [pageResult, hotProducts] = await Promise.all([
          fetchProducts('', 12),
          fetchHomeHotProducts().catch(() => []),
        ]);

        const pageProducts = pageResult.items || [];
        const merged = pageProducts.length ? pageProducts : hotProducts;
        const items = merged.map((product, index) => buildTopicView(product, index));

        this.setData({
          allProducts: items,
        });
        this.applyFilter(this.data.activeFilter, items);
      } catch {
        this.setData({
          allProducts: [],
          products: [],
        });
      } finally {
        this.setData({ loading: false });
      }
    },
    applyFilter(filter: string, source?: TopicProductView[]) {
      const all = source || this.data.allProducts;
      const filtered = (() => {
        if (filter === '精选') {
          return all;
        }

        if (filter === '秒杀') {
          return all.filter((item: TopicProductView, index: number) => index < 6 || Number(item.saleCount.replace(/,/g, '')) > 100);
        }

        if (filter === '拼团') {
          return all.filter((item: TopicProductView, index: number) => index % 2 === 0 || item.tags.includes('热销'));
        }

        if (filter === '礼盒') {
          return all.filter((item: TopicProductView) => item.title.includes('礼盒') || item.tags.includes('礼盒'));
        }

        return all;
      })();

      this.setData({
        activeFilter: filter,
        products: filtered,
      });
    },
    changeFilter(e: WechatMiniprogram.BaseEvent) {
      const { filter } = (e.currentTarget.dataset as { filter?: string }) || {};
      if (!filter) {
        return;
      }

      this.applyFilter(filter);
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { productId } = (e.currentTarget.dataset as { productId?: string | number }) || {};
      if (!productId) {
        return;
      }

      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${productId}`,
      });
    },
    openProductList() {
      wx.navigateTo({
        url: `/pages/product/list/list?title=${encodeURIComponent(this.data.pageTitle)}`,
      });
    },
    async quickAdd(e: WechatMiniprogram.BaseEvent) {
      const { skuId, productId } = (e.currentTarget.dataset as { skuId?: string | number; productId?: string | number }) || {};

      if (!this.ensureAccess()) {
        return;
      }

      if (!skuId) {
        wx.navigateTo({
          url: `/pages/product/detail/detail?productId=${productId}`,
        });
        return;
      }

      try {
        wx.showLoading({ title: '加入中…' });
        await addToCart(Number(skuId), 1);
        wx.showToast({ title: '已加入购物车', icon: 'success' });
      } catch {
        wx.showToast({ title: '加入失败，请稍后再试', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },
  },
});
