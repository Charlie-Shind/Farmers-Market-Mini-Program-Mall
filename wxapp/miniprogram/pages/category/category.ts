import { iconPaths } from '../../config/icons';
import {
  fetchCartItemCount,
  fetchCategories,
  fetchCategoryTags,
  fetchHomeHotProducts,
  fetchProducts,
  type AppCategory,
  type AppCategoryTag,
  type AppProduct,
} from '../../services/app';
import { buildPageTopStyle } from '../../utils/page-layout';
import { navigateBackOrHome } from '../../utils/auth-route';

type CategoryRecommendationItem = {
  id: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  price: string;
  originalPrice: string;
  salesCount: number;
  isHot: boolean;
  isPreSale: boolean;
  merchantId: number;
  storeName: string;
  originPlace: string;
  productNature?: string;
};

type CategorySectionView = {
  id: string;
  name: string;
  keyword: string;
  categoryId: number | null;
  products: CategoryProductView[];
};

type CategoryProductView = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  saleCountLabel: string;
  imageStyle: string;
  tags: string[];
  originPlace: string;
  isPreSale: boolean;
  productNature: string;
  priceValue: number;
  saleCountValue: number;
};

type SortMode = 'comprehensive' | 'sales' | 'priceAsc' | 'priceDesc';
type FilterMode = '' | 'organic' | 'origin' | 'instock' | 'presale';
type FilterFlags = Record<Exclude<FilterMode, ''>, boolean>;

type FilterNavItem = {
  key: string;
  label: string;
};

type FilterPanelSection = {
  key: string;
  title: string;
  chips: FilterPanelChip[];
};

type FilterPanelChip = {
  value: string;
  label: string;
  subLabel?: string;
};

function readPrice(value?: string) {
  const parsed = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value?: string) {
  const price = readPrice(value);
  return `¥${price.toFixed(2)}`;
}

function formatSaleCount(value?: number) {
  return `${Number(value || 0).toLocaleString('zh-CN')}件`;
}

function buildTags(product: AppProduct) {
  const tags = new Set<string>();

  if (product.productNature && /有机|认证/i.test(product.productNature)) {
    tags.add('有机');
  }

  if (product.originPlace) {
    tags.add(product.originPlace);
  }

  if (product.isPreSale) {
    tags.add('预售');
  }

  if (tags.size === 0) {
    tags.add(product.isHot ? '热销' : '现货');
  }

  return [...tags].slice(0, 2);
}

function mapProduct(product: AppProduct): CategoryProductView {
  return {
    id: String(product.id),
    title: product.title,
    subtitle: product.subtitle || product.originPlace || '源头直供商品',
    price: formatPrice(product.minPrice),
    saleCountLabel: formatSaleCount(product.saleCount),
    imageStyle: product.coverUrl
      ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
      : '',
    tags: buildTags(product),
    originPlace: product.originPlace || '',
    isPreSale: Boolean(product.isPreSale),
    productNature: product.productNature || '',
    priceValue: readPrice(product.minPrice),
    saleCountValue: Number(product.saleCount || 0),
  };
}

function filterProducts(source: CategoryProductView[], filters: FilterFlags, selectedOrigin: string) {
  let result = [...source];

  if (filters.organic) {
    result = result.filter((item) => /有机|认证/i.test(`${item.productNature}${item.title}${item.subtitle}`));
  }

  if (filters.origin) {
    result = selectedOrigin
      ? result.filter((item) => item.originPlace === selectedOrigin)
      : result.filter((item) => Boolean(item.originPlace));
  }

  if (filters.instock) {
    result = result.filter((item) => !item.isPreSale);
  }

  if (filters.presale) {
    result = result.filter((item) => item.isPreSale);
  }

  return result;
}

function sortProducts(source: CategoryProductView[], sortMode: SortMode) {
  const result = [...source];

  if (sortMode === 'sales') {
    return result.sort((left, right) => right.saleCountValue - left.saleCountValue);
  }

  if (sortMode === 'priceAsc') {
    return result.sort((left, right) => left.priceValue - right.priceValue);
  }

  if (sortMode === 'priceDesc') {
    return result.sort((left, right) => right.priceValue - left.priceValue);
  }

  return result;
}

function buildSections(categoryTags: AppCategoryTag[]): CategorySectionView[] {
  return categoryTags.map((tag) => ({
    id: String(tag.id),
    name: tag.name,
    keyword: tag.name,
    categoryId: tag.id,
    products: [],
  }));
}

function createVisibleSections(
  sections: CategorySectionView[],
  filters: FilterFlags,
  selectedOrigin: string,
  sortMode: SortMode,
) {
  return sections.map((section) => {
    const products = sortProducts(
      filterProducts(section.products, filters, selectedOrigin),
      sortMode,
    );

    return {
      ...section,
      products,
    };
  });
}

function createEmptyFilterFlags(): FilterFlags {
  return {
    organic: false,
    origin: false,
    instock: false,
    presale: false,
  };
}

function buildFilterPanelSections(navKey: string, originPlaces: string[]): FilterPanelSection[] {
  const makeChip = (value: string, label?: string, subLabel?: string): FilterPanelChip => ({
    value,
    label: label || value,
    subLabel,
  });

  const originChips = originPlaces.length
    ? [makeChip('全部'), ...originPlaces.slice(0, 8).map((place) => makeChip(place))]
    : [makeChip('全部')];

  const panelMap: Record<string, FilterPanelSection[]> = {
    category: [
      {
        key: 'category',
        title: '分类筛选',
        chips: [makeChip('全部'), makeChip('有机')],
      },
    ],
    logistics: [
      {
        key: 'logistics',
        title: '物流类型',
        chips: [makeChip('全部'), makeChip('现货'), makeChip('预售')],
      },
    ],
    origin: [
      {
        key: 'origin',
        title: '发货地',
        chips: originChips,
      },
    ],
  };

  return panelMap[navKey] || panelMap.category;
}

function buildLocalFallbackProducts(section: CategorySectionView): CategoryProductView[] {
  const localItems: CategoryRecommendationItem[] = [
    {
      id: Number(section.id) * 100 + 1,
      title: `${section.name}精选一号`,
      subtitle: '源头直供 · 品质甄选',
      coverUrl: '/assets/category/orange.jpg',
      price: '39.90',
      originalPrice: '49.90',
      salesCount: 1280,
      isHot: true,
      isPreSale: false,
      merchantId: 0,
      storeName: '平台自营',
      originPlace: '源头直采',
      productNature: '现货',
    },
    {
      id: Number(section.id) * 100 + 2,
      title: `${section.name}推荐二号`,
      subtitle: '产地直采 · 鲜活到家',
      coverUrl: '/assets/category/fruit-1.jpg',
      price: '58.00',
      originalPrice: '69.00',
      salesCount: 960,
      isHot: false,
      isPreSale: false,
      merchantId: 0,
      storeName: '平台自营',
      originPlace: '产地直供',
      productNature: '认证',
    },
    {
      id: Number(section.id) * 100 + 3,
      title: `${section.name}热卖三号`,
      subtitle: '限量发售 · 买手严选',
      coverUrl: '/assets/category/egg.jpg',
      price: '88.00',
      originalPrice: '99.00',
      salesCount: 730,
      isHot: true,
      isPreSale: false,
      merchantId: 0,
      storeName: '平台自营',
      originPlace: '平台仓',
      productNature: '有机',
    },
  ];

  return localItems.map((item) =>
    mapProduct({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      coverUrl: item.coverUrl,
      minPrice: item.price,
      maxPrice: item.originalPrice,
      saleCount: item.salesCount,
      isHot: item.isHot,
      isPreSale: item.isPreSale,
      originPlace: item.originPlace,
      productNature: item.productNature,
      categoryId: Number(section.id),
    } as AppProduct),
  );
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    cartBadge: '',
    sections: [] as CategorySectionView[],
    sectionsSource: [] as CategorySectionView[],
    activeSectionIndex: 0,
    activeSectionName: '',
    activeSectionId: '',
    scrollTargetId: '',
    sortMode: 'comprehensive' as SortMode,
    activeFilters: createEmptyFilterFlags(),
    selectedOrigin: '',
    originPlaces: [] as string[],
    products: [] as CategoryProductView[],
    loadingProducts: false,
    showFilterSheet: false,
    filterNavItems: [
      { key: 'category', label: '分类' },
      { key: 'logistics', label: '物流' },
      { key: 'origin', label: '发货地' },
    ] as FilterNavItem[],
    activeFilterNavIndex: 0,
    activeFilterPanelSections: [] as FilterPanelSection[],
    filterSelections: {} as Record<string, string>,
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });

      void this.loadSections();
      void this.syncCartBadge();
    },
  },
  pageLifetimes: {
    show() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
      void this.syncCartBadge();

      const tabBar = (this as any).getTabBar?.();
      if (tabBar) {
        tabBar.setData({ active: 'category' });
        if (typeof tabBar.syncFromRoute === 'function') {
          tabBar.syncFromRoute();
        }
      }
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
    async loadSections() {
      let sections: CategorySectionView[] = [];

      try {
        const categoryTags = await fetchCategoryTags();
        sections = buildSections(categoryTags);
      } catch {
        sections = buildSections([]);
      }

      const loadedSections: CategorySectionView[] = [];
      this.setData({ loadingProducts: true });

      try {
        const nextSections = await Promise.all(
          sections.map(async (section) => ({
            ...section,
            products: await this.loadSectionProducts(section),
          })),
        );
        loadedSections.push(...nextSections);
      } finally {
        this.setData({ loadingProducts: false });
      }

      const visibleSections = createVisibleSections(
        loadedSections,
        this.data.activeFilters,
        this.data.selectedOrigin,
        this.data.sortMode,
      );

      this.setData(
        {
          sectionsSource: loadedSections,
          sections: visibleSections,
        },
        () => {
          this.syncActiveSectionByIndex(0);
        },
      );
    },
    async loadSectionProducts(section: CategorySectionView) {
      if (section.categoryId == null) {
        return [];
      }

      try {
        const response = await fetchProducts('', { page: 1, pageSize: 24, categoryId: section.categoryId });
        return (response.items || []).map(mapProduct);
      } catch {
        return [];
      }
    },
    syncActiveSectionByIndex(index: number) {
      const section = this.data.sections[index];
      if (!section) {
        return;
      }

      const originPlaces = Array.from(new Set(section.products.map((item) => item.originPlace).filter(Boolean)));
      this.setData({
        activeSectionIndex: index,
        activeSectionName: section.name,
        activeSectionId: section.id,
        products: section.products,
        originPlaces,
      });
    },
    openSearch() {
      wx.navigateTo({ url: '/pages/search/search' });
    },
    goBack() {
      navigateBackOrHome();
    },
    switchSection(e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number | string }) || {};
      const nextIndex = Number(index);
      if (!Number.isFinite(nextIndex)) {
        return;
      }
      const section = this.data.sections[nextIndex];
      if (!section) {
        return;
      }

      this.setData({
        scrollTargetId: '',
      });
      setTimeout(() => {
        this.setData({
          scrollTargetId: `cate-${section.id}`,
        });
      }, 0);
      this.syncActiveSectionByIndex(nextIndex);
    },
    openProduct(e: WechatMiniprogram.BaseEvent) {
      const { id } = (e.currentTarget.dataset as { id?: string }) || {};
      if (!id) {
        return;
      }

      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${id}`,
      });
    },
    toggleSort(e: WechatMiniprogram.BaseEvent) {
      const { sort } = (e.currentTarget.dataset as { sort?: SortMode }) || {};
      if (!sort) {
        return;
      }

      let nextSort: SortMode = sort;
      if (sort === 'priceAsc' && this.data.sortMode === 'priceAsc') {
        nextSort = 'priceDesc';
      } else if (sort === 'priceAsc' && this.data.sortMode === 'priceDesc') {
        nextSort = 'priceAsc';
      }

      this.setData({ sortMode: nextSort });
      this.applyView();
    },
    openFilterSheet() {
      const navKey = this.data.filterNavItems[0]?.key || 'logistics';
      this.setData({
        showFilterSheet: true,
        activeFilterNavIndex: 0,
        activeFilterPanelSections: buildFilterPanelSections(navKey, this.data.originPlaces),
      });
    },
    closeFilterSheet() {
      this.setData({
        showFilterSheet: false,
      });
    },
    stopBubble() {
      // Prevent sheet close
    },
    switchFilterNav(e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number | string }) || {};
      const nextIndex = Number(index);
      if (!Number.isFinite(nextIndex)) {
        return;
      }

      const navKey = this.data.filterNavItems[nextIndex]?.key || 'logistics';
      this.setData({
        activeFilterNavIndex: nextIndex,
        activeFilterPanelSections: buildFilterPanelSections(navKey, this.data.originPlaces),
      });
    },
    toggleFilterChip(e: WechatMiniprogram.BaseEvent) {
      const { section, chip } = (e.currentTarget.dataset as { section?: string; chip?: string }) || {};
      if (!section || !chip) {
        return;
      }

      const nextSelections = {
        ...this.data.filterSelections,
        [section]: chip,
      };

      if (section === 'origin') {
        this.setData({
          selectedOrigin: chip === '全部' ? '' : chip,
          activeFilters: {
            ...this.data.activeFilters,
            origin: chip !== '全部',
          },
          filterSelections: nextSelections,
        });
        this.applyView();
        return;
      }

      const nextFilters = { ...this.data.activeFilters };

      if (section === 'category') {
        nextFilters.organic = chip === '有机';
      }

      if (section === 'logistics') {
        if (chip === '全部') {
          nextFilters.instock = false;
          nextFilters.presale = false;
        } else if (chip === '现货') {
          nextFilters.instock = true;
          nextFilters.presale = false;
        } else if (chip === '预售') {
          nextFilters.instock = false;
          nextFilters.presale = true;
        }
      }

      this.setData({
        activeFilters: nextFilters,
        filterSelections: nextSelections,
      });
      this.applyView();
    },
    resetFilter() {
      const navKey = this.data.filterNavItems[this.data.activeFilterNavIndex]?.key || 'logistics';
      this.setData({
        activeFilters: createEmptyFilterFlags(),
        selectedOrigin: '',
        filterSelections: {},
        activeFilterPanelSections: buildFilterPanelSections(navKey, this.data.originPlaces),
      });
      this.applyView();
    },
    applyView() {
      const visibleSections = createVisibleSections(
        this.data.sectionsSource,
        this.data.activeFilters,
        this.data.selectedOrigin,
        this.data.sortMode,
      );
      const nextIndex = Math.min(this.data.activeSectionIndex, Math.max(visibleSections.length - 1, 0));
      const nextSection = visibleSections[nextIndex];

      this.setData({
        sections: visibleSections,
        activeSectionIndex: nextIndex,
        activeSectionName: nextSection?.name || '',
        activeSectionId: nextSection?.id || '',
        products: nextSection?.products || [],
        originPlaces: Array.from(new Set((nextSection?.products || []).map((item) => item.originPlace).filter(Boolean))),
      });
    },
  },
});
