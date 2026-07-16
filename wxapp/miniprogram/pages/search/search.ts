import { iconPaths } from '../../config/icons';
import { fetchCartItemCount, fetchProducts, type AppProduct } from '../../services/app';
import {
  addSearchHistory,
  clearSearchHistory,
  loadSearchHistory,
  removeSearchHistory,
} from '../../services/search-history';
import { buildPageTopStyle } from '../../utils/page-layout';
import { navigateBackOrHome } from '../../utils/auth-route';

type SearchProductView = {
  id: string;
  title: string;
  desc: string;
  subtitle: string;
  price: string;
  priceNum: string;
  imageClass: string;
  imageStyle: string;
  categoryId: string;
  tags: string[];
};

const SEARCH_PAGE_SIZE = 24;
const SEARCH_IMAGE_CLASSES = ['orange-img', 'egg-img', 'tomato-img', 'rice-img', 'oil-img', 'date-img'];
const HOT_KEYWORDS = ['有机蔬菜', '新鲜水果', '土鸡蛋', '五常大米', '山茶油', '预售专区', '团购好物', '产地直发'];

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let searchRequestSeq = 0;

function readPageOptions(): Record<string, string> {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
      }
    | undefined;

  return current?.options || {};
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s·,，.。/\\|_\-()（）【】\[\]:：]+/g, '');
}

function includesInOrder(source: string, query: string) {
  let cursor = 0;

  for (const char of query) {
    const index = source.indexOf(char, cursor);
    if (index < 0) {
      return false;
    }
    cursor = index + char.length;
  }

  return true;
}

function scoreProduct(product: AppProduct, keyword: string, index: number) {
  const query = normalizeSearchText(keyword);
  if (!query) {
    return index;
  }

  const fields = [
    { value: product.title, base: 0 },
    { value: product.subtitle, base: 300 },
    { value: product.detailDesc, base: 500 },
    { value: product.originPlace, base: 600 },
    { value: product.merchantName, base: 700 },
    { value: (product.skuNames || []).join(' '), base: 800 },
  ];

  let best = Number.POSITIVE_INFINITY;

  for (const field of fields) {
    const normalizedField = normalizeSearchText(field.value || '');
    if (!normalizedField) {
      continue;
    }

    if (normalizedField === query) {
      best = Math.min(best, field.base);
      continue;
    }

    const exactIndex = normalizedField.indexOf(query);
    if (exactIndex >= 0) {
      best = Math.min(best, field.base + exactIndex);
      continue;
    }

    if (includesInOrder(normalizedField, query)) {
      best = Math.min(best, field.base + 100 + query.length);
    }
  }

  if (Number.isFinite(best)) {
    return best + index / 100;
  }

  return 1000 + index;
}

function buildResultTags(product: AppProduct) {
  const tags = new Set<string>();

  if (product.isPreSale) {
    tags.add('预售');
  }

  if (product.isHot) {
    tags.add('热销');
  }

  if (product.originPlace) {
    tags.add(product.originPlace);
  }

  if (tags.size === 0) {
    tags.add('全站匹配');
  }

  return [...tags].slice(0, 2);
}

function mapProductToView(product: AppProduct, index: number): SearchProductView {
  const subtitle = product.subtitle || product.detailDesc || product.originPlace || '全站商品';
  const priceNum = product.minPrice || '0.00';

  return {
    id: String(product.id),
    title: product.title,
    desc: subtitle,
    subtitle,
    price: priceNum,
    priceNum,
    imageClass: SEARCH_IMAGE_CLASSES[index % SEARCH_IMAGE_CLASSES.length],
    imageStyle: product.coverUrl
      ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
      : '',
    categoryId: product.categoryId ? String(product.categoryId) : '',
    tags: buildResultTags(product),
  };
}

Component({
  data: {
    searchText: '',
    activeKeyword: '',
    loading: false,
    loadingMore: false,
    results: [] as SearchProductView[],
    total: 0,
    resultNote: '',
    page: 1,
    pageSize: SEARCH_PAGE_SIZE,
    noMore: false,
    focusSearch: true,
    cartBadge: '',
    icons: iconPaths,
    pageStyle: '',
    searchHistory: [] as string[],
    hotKeywords: HOT_KEYWORDS,
  },
  lifetimes: {
    attached() {
      const options = readPageOptions();
      const initialKeyword = options.keyword ? decodeURIComponent(options.keyword) : '';

      this.setData({
        pageStyle: buildPageTopStyle(0),
        searchText: initialKeyword,
        focusSearch: true,
        searchHistory: loadSearchHistory(),
      });

      if (initialKeyword.trim()) {
        void this.runSearch(initialKeyword.trim(), true, true);
      }
    },
    detached() {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }
    },
  },
  pageLifetimes: {
    show() {
      this.setData({
        searchHistory: loadSearchHistory(),
      });
      void this.syncCartBadge();
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
    resetSearchState() {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }

      searchRequestSeq += 1;
      this.setData({
        activeKeyword: '',
        results: [],
        total: 0,
        resultNote: '',
        loading: false,
        loadingMore: false,
        page: 1,
        noMore: false,
      });
    },
    persistHistory(keyword: string) {
      const history = addSearchHistory(keyword);
      this.setData({ searchHistory: history });
    },
    async runSearch(keyword: string, reset = true, persistHistory = false) {
      const nextKeyword = keyword.trim();
      if (!nextKeyword) {
        this.resetSearchState();
        return;
      }

      if (persistHistory) {
        this.persistHistory(nextKeyword);
      }

      this.setData({
        searchText: nextKeyword,
      });

      const requestId = ++searchRequestSeq;
      const nextPage = reset ? 1 : this.data.page;
      this.setData({
        activeKeyword: nextKeyword,
        loading: reset,
        loadingMore: !reset,
        resultNote: '',
      });

      try {
        const response = await fetchProducts(nextKeyword, {
          page: nextPage,
          pageSize: SEARCH_PAGE_SIZE,
        });
        if (requestId !== searchRequestSeq) {
          return;
        }

        const sortedItems = (response.items ?? [])
          .map((item, index) => ({
            item,
            index,
            score: scoreProduct(item, nextKeyword, index),
          }))
          .sort((left, right) => left.score - right.score || left.index - right.index)
          .map(({ item, index }) => mapProductToView(item, index));

        const mergedItems = reset ? sortedItems : [...this.data.results, ...sortedItems];
        const serverPageSize = Number((response as any).pageSize) || SEARCH_PAGE_SIZE;
        const totalNum = Number(response.total);
        const noMore =
          sortedItems.length === 0 ||
          sortedItems.length < serverPageSize ||
          (Number.isFinite(totalNum) && totalNum >= 0 && mergedItems.length >= totalNum);
        const total = Number.isFinite(totalNum) ? totalNum : mergedItems.length;

        this.setData({
          results: mergedItems,
          total,
          page: nextPage + 1,
          noMore,
          resultNote: noMore
            ? `共 ${mergedItems.length} 件匹配结果`
            : `已加载 ${mergedItems.length}/${total} 件`,
          loading: false,
          loadingMore: false,
        });
      } catch {
        if (requestId !== searchRequestSeq) {
          return;
        }

        this.setData({
          results: [],
          total: 0,
          resultNote: '',
          loading: false,
          loadingMore: false,
          noMore: true,
        });
      }
    },
    onSearchInput(e: WechatMiniprogram.Input) {
      const value = String(e.detail.value ?? '');
      this.setData({
        searchText: value,
      });

      const keyword = value.trim();
      if (!keyword) {
        this.resetSearchState();
        return;
      }

      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      searchDebounceTimer = setTimeout(() => {
        searchDebounceTimer = null;
        void this.runSearch(keyword, true, false);
      }, 240);
    },
    submitSearch(e?: WechatMiniprogram.BaseEvent) {
      const keywordFromEvent = (e?.currentTarget.dataset as { keyword?: string })?.keyword;
      const keyword = (keywordFromEvent || this.data.searchText || '').trim();

      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }

      if (!keyword) {
        this.clearSearch();
        return;
      }

      void this.runSearch(keyword, true, true);
    },
    clearSearch() {
      this.setData({
        searchText: '',
        focusSearch: false,
      });
      this.resetSearchState();
      wx.nextTick(() => {
        this.setData({
          focusSearch: true,
        });
      });
    },
    tapHistoryKeyword(e: WechatMiniprogram.BaseEvent) {
      const keyword = String((e.currentTarget.dataset as { keyword?: string }).keyword || '').trim();
      if (!keyword) {
        return;
      }

      void this.runSearch(keyword, true, true);
    },
    tapHotKeyword(e: WechatMiniprogram.BaseEvent) {
      const keyword = String((e.currentTarget.dataset as { keyword?: string }).keyword || '').trim();
      if (!keyword) {
        return;
      }

      void this.runSearch(keyword, true, true);
    },
    removeHistoryItem(e: WechatMiniprogram.BaseEvent) {
      const keyword = String((e.currentTarget.dataset as { keyword?: string }).keyword || '').trim();
      if (!keyword) {
        return;
      }

      const history = removeSearchHistory(keyword);
      this.setData({ searchHistory: history });
    },
    clearSearchHistory() {
      if (!this.data.searchHistory.length) {
        return;
      }

      wx.showModal({
        title: '清空搜索历史',
        content: '确定清空全部搜索记录吗？',
        success: (res) => {
          if (!res.confirm) {
            return;
          }

          const history = clearSearchHistory();
          this.setData({ searchHistory: history });
          wx.showToast({ title: '已清空', icon: 'success' });
        },
      });
    },
    loadMore() {
      if (!this.data.activeKeyword || this.data.loading || this.data.loadingMore || this.data.noMore) {
        return;
      }

      void this.runSearch(this.data.activeKeyword, false, false);
    },
    onAddToCart() {
      wx.showToast({ title: '已加入购物车', icon: 'success' });
    },
    goBack() {
      navigateBackOrHome();
    },
  },
});
