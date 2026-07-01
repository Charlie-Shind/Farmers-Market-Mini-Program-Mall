"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
const DEFAULT_ADDRESS_TEXT = '点击选择收货地址';
function formatAddressText(address) {
    if (!address) {
        return DEFAULT_ADDRESS_TEXT;
    }
    const region = [address.province, address.city, address.district]
        .filter(Boolean)
        .join(' ');
    const detail = address.detailAddress || '';
    const full = `${region} ${detail}`.trim();
    return full.length > 24 ? `${full.slice(0, 24)}…` : full;
}
const SECTION_PRESETS = [
    { name: '查干臻品系列', keyword: '查干臻品' },
    { name: '“岛上的”鹿鸣岛海参系列', keyword: '鹿鸣岛海参' },
    { name: '原装进口食品系列', keyword: '原装进口' },
    { name: '特色农产品系列', keyword: '特色农产品' },
    { name: '福利品系列', keyword: '福利品' },
];
function readPrice(value) {
    const parsed = Number(String(value !== null && value !== void 0 ? value : '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}
function formatPrice(value) {
    const price = readPrice(value);
    return `¥${price.toFixed(2)}`;
}
function formatSaleCount(value) {
    return `${Number(value || 0).toLocaleString('zh-CN')}件`;
}
function buildTags(product) {
    const tags = new Set();
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
function mapProduct(product) {
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
function filterProducts(source, filters, selectedOrigin) {
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
function sortProducts(source, sortMode) {
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
function buildSections(categories) {
    return SECTION_PRESETS.map((preset, index) => {
        var _a;
        const category = categories[index];
        return {
            id: String((_a = category === null || category === void 0 ? void 0 : category.id) !== null && _a !== void 0 ? _a : index + 1),
            name: preset.name,
            keyword: preset.keyword,
            categoryId: category ? Number(category.id) : null,
            products: [],
        };
    });
}
function createVisibleSections(sections, filters, selectedOrigin, sortMode) {
    return sections.map((section) => {
        const products = sortProducts(filterProducts(section.products, filters, selectedOrigin), sortMode);
        return {
            ...section,
            products,
        };
    });
}
function createEmptyFilterFlags() {
    return {
        organic: false,
        origin: false,
        instock: false,
        presale: false,
    };
}
function buildFilterPanelSections(navKey, originPlaces, activeSectionName) {
    const makeChip = (value, label, subLabel) => ({
        value,
        label: label || value,
        subLabel,
    });
    const originChips = originPlaces.length
        ? [makeChip('全部'), ...originPlaces.slice(0, 6).map((place) => makeChip(place))]
        : [makeChip('全部')];
    const categoryBase = activeSectionName ? activeSectionName.replace(/系列$/, '') : '当前分类';
    const brandBase = activeSectionName ? `${activeSectionName.replace(/系列$/, '')}品牌` : '热门品牌';
    const panelMap = {
        category: [
            {
                key: 'category',
                title: '分类',
                chips: [makeChip(categoryBase), makeChip('精品推荐'), makeChip('源头直供')],
            },
        ],
        logistics: [
            {
                key: 'logistics',
                title: '物流',
                chips: ['包邮', '坏果包赔', '冷链配送', '48小时内发', '现货'].map((value) => makeChip(value)),
            },
        ],
        discount: [
            {
                key: 'discount',
                title: '优惠',
                chips: [makeChip('百亿补贴'), makeChip('限时秒杀')],
            },
        ],
        rating: [
            {
                key: 'rating',
                title: '店铺评分',
                chips: [
                    makeChip('5分', '5分', '满分'),
                    makeChip('4.8分及以上', '4.8分及以上', '优秀'),
                    makeChip('4.6分及以上', '4.6分及以上', '良好'),
                ],
            },
        ],
        price: [
            {
                key: 'price',
                title: '价格区间',
                chips: [
                    makeChip('261元以下', '261元以下', '30%的选择'),
                    makeChip('261~398元', '261~398元', '60%的选择'),
                    makeChip('398~464元', '398~464元', '9%的选择'),
                    makeChip('464元以上', '464元以上', '1%的选择'),
                ],
            },
        ],
        origin: [
            {
                key: 'origin',
                title: '发货地',
                chips: originChips,
            },
        ],
        brand: [
            {
                key: 'brand',
                title: '热门品牌',
                chips: [makeChip(brandBase), makeChip('源头直供'), makeChip('平台严选')],
            },
        ],
        storage: [
            {
                key: 'storage',
                title: '存储类型',
                chips: ['冷藏', '冷冻', '常温'].map((value) => makeChip(value)),
            },
        ],
    };
    return panelMap[navKey] || panelMap.category;
}
function buildLocalFallbackProducts(section) {
    const localItems = [
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
    return localItems.map((item) => mapProduct({
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
    }));
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        cartBadge: '',
        sections: [],
        sectionsSource: [],
        activeSectionIndex: 0,
        activeSectionName: '',
        activeSectionId: '',
        scrollTargetId: '',
        sortMode: 'comprehensive',
        activeFilters: createEmptyFilterFlags(),
        selectedOrigin: '',
        originPlaces: [],
        products: [],
        loadingProducts: false,
        showFilterSheet: false,
        filterNavItems: [
            { key: 'category', label: '分类' },
            { key: 'logistics', label: '物流' },
            { key: 'discount', label: '优惠' },
            { key: 'rating', label: '店铺评分' },
            { key: 'price', label: '价格区间' },
            { key: 'origin', label: '发货地' },
            { key: 'brand', label: '热门品牌' },
            { key: 'storage', label: '存储类型' },
        ],
        activeFilterNavIndex: 0,
        activeFilterPanelSections: [],
        filterSelections: {},
        currentAddress: null,
        addressText: DEFAULT_ADDRESS_TEXT,
        hasAddress: false,
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.loadSections();
            void this.syncCartBadge();
            void this.loadAddress(true);
        },
    },
    pageLifetimes: {
        show() {
            var _a, _b;
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.syncCartBadge();
            void this.loadAddress();
            const tabBar = (_b = (_a = this).getTabBar) === null || _b === void 0 ? void 0 : _b.call(_a);
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
                const count = await (0, app_1.fetchCartItemCount)();
                this.setData({
                    cartBadge: count > 0 ? String(count) : '',
                });
            }
            catch {
                this.setData({
                    cartBadge: '',
                });
            }
        },
        async loadAddress(silent = false) {
            try {
                const list = await (0, app_1.fetchAddresses)();
                const defaultAddress = (list || []).find((item) => item.isDefault) ||
                    (list || [])[0] ||
                    null;
                this.setData({
                    currentAddress: defaultAddress,
                    addressText: formatAddressText(defaultAddress),
                    hasAddress: Boolean(defaultAddress),
                });
            }
            catch {
                if (!silent) {
                    this.setData({
                        currentAddress: null,
                        addressText: DEFAULT_ADDRESS_TEXT,
                        hasAddress: false,
                    });
                }
            }
        },
        chooseAddress() {
            wx.navigateTo({
                url: '/pages/address/list/list?mode=select&from=category',
                events: {
                    selectAddress: (address) => {
                        if (!address) {
                            return;
                        }
                        this.setData({
                            currentAddress: address,
                            addressText: formatAddressText(address),
                            hasAddress: true,
                        });
                    },
                },
                success: (res) => {
                    const channel = res.eventChannel;
                    if (channel && typeof channel.emit === 'function') {
                        channel.emit('requestCurrent', this.data.currentAddress);
                    }
                },
            });
        },
        async loadSections() {
            let sections = buildSections([]);
            try {
                const categories = await (0, app_1.fetchCategories)();
                sections = buildSections(categories);
            }
            catch {
                sections = buildSections([]);
            }
            const loadedSections = [];
            this.setData({ loadingProducts: true });
            try {
                const nextSections = await Promise.all(sections.map(async (section) => ({
                    ...section,
                    products: await this.loadSectionProducts(section),
                })));
                loadedSections.push(...nextSections);
            }
            finally {
                this.setData({ loadingProducts: false });
            }
            const visibleSections = createVisibleSections(loadedSections, this.data.activeFilters, this.data.selectedOrigin, this.data.sortMode);
            this.setData({
                sectionsSource: loadedSections,
                sections: visibleSections,
            }, () => {
                this.syncActiveSectionByIndex(0);
            });
        },
        async loadSectionProducts(section) {
            var _a;
            try {
                let responseItems = [];
                const candidates = [];
                if (section.categoryId != null) {
                    candidates.push((0, app_1.fetchProducts)('', 24, section.categoryId));
                }
                if (section.keyword) {
                    candidates.push((0, app_1.fetchProducts)(section.keyword, 24));
                }
                candidates.push((0, app_1.fetchProducts)('', 24));
                candidates.push((0, app_1.fetchHomeHotProducts)().then((items) => ({ items })));
                candidates.push((0, app_1.fetchProducts)(section.keyword, 24, (_a = section.categoryId) !== null && _a !== void 0 ? _a : undefined));
                for (const candidate of candidates) {
                    try {
                        const response = await candidate;
                        if (response.items && response.items.length) {
                            responseItems = response.items;
                            break;
                        }
                    }
                    catch {
                        // Try next fallback
                    }
                }
                return responseItems.length ? responseItems.map(mapProduct) : buildLocalFallbackProducts(section);
            }
            catch {
                return buildLocalFallbackProducts(section);
            }
        },
        syncActiveSectionByIndex(index) {
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
            (0, auth_route_1.navigateBackOrHome)();
        },
        switchSection(e) {
            const { index } = e.currentTarget.dataset || {};
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
        openProduct(e) {
            const { id } = e.currentTarget.dataset || {};
            if (!id) {
                return;
            }
            wx.navigateTo({
                url: `/pages/product/detail/detail?productId=${id}`,
            });
        },
        toggleSort(e) {
            const { sort } = e.currentTarget.dataset || {};
            if (!sort) {
                return;
            }
            let nextSort = sort;
            if (sort === 'priceAsc' && this.data.sortMode === 'priceAsc') {
                nextSort = 'priceDesc';
            }
            else if (sort === 'priceAsc' && this.data.sortMode === 'priceDesc') {
                nextSort = 'priceAsc';
            }
            this.setData({ sortMode: nextSort });
            this.applyView();
        },
        openFilterSheet() {
            var _a;
            const navKey = ((_a = this.data.filterNavItems[0]) === null || _a === void 0 ? void 0 : _a.key) || 'logistics';
            this.setData({
                showFilterSheet: true,
                activeFilterNavIndex: 0,
                activeFilterPanelSections: buildFilterPanelSections(navKey, this.data.originPlaces, this.data.activeSectionName),
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
        chooseFilter(e) {
            const { filter } = e.currentTarget.dataset || {};
            if (filter == null) {
                return;
            }
            if (filter === '') {
                return;
            }
            const nextFilters = { ...this.data.activeFilters };
            nextFilters[filter] = !nextFilters[filter];
            this.setData({
                activeFilters: nextFilters,
                selectedOrigin: filter === 'origin' && !nextFilters.origin ? '' : this.data.selectedOrigin,
            });
            this.applyView();
        },
        chooseOrigin(e) {
            const { origin } = e.currentTarget.dataset || {};
            this.setData({
                selectedOrigin: origin || '',
                activeFilters: {
                    ...this.data.activeFilters,
                    origin: true,
                },
            });
            this.applyView();
        },
        switchFilterNav(e) {
            var _a;
            const { index } = e.currentTarget.dataset || {};
            const nextIndex = Number(index);
            if (!Number.isFinite(nextIndex)) {
                return;
            }
            const navKey = ((_a = this.data.filterNavItems[nextIndex]) === null || _a === void 0 ? void 0 : _a.key) || 'logistics';
            this.setData({
                activeFilterNavIndex: nextIndex,
                activeFilterPanelSections: buildFilterPanelSections(navKey, this.data.originPlaces, this.data.activeSectionName),
            });
        },
        toggleFilterChip(e) {
            const { section, chip } = e.currentTarget.dataset || {};
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
                nextFilters.organic = chip === '精品推荐' ? !nextFilters.organic : nextFilters.organic;
            }
            if (section === 'logistics') {
                if (chip === '现货')
                    nextFilters.instock = !nextFilters.instock;
                if (chip === '预售')
                    nextFilters.presale = !nextFilters.presale;
            }
            this.setData({
                activeFilters: nextFilters,
                filterSelections: nextSelections,
            });
            this.applyView();
        },
        resetFilter() {
            var _a;
            const navKey = ((_a = this.data.filterNavItems[this.data.activeFilterNavIndex]) === null || _a === void 0 ? void 0 : _a.key) || 'logistics';
            this.setData({
                activeFilters: createEmptyFilterFlags(),
                selectedOrigin: '',
                filterSelections: {},
                activeFilterPanelSections: buildFilterPanelSections(navKey, this.data.originPlaces, this.data.activeSectionName),
            });
            this.applyView();
        },
        applyView() {
            const visibleSections = createVisibleSections(this.data.sectionsSource, this.data.activeFilters, this.data.selectedOrigin, this.data.sortMode);
            const nextIndex = Math.min(this.data.activeSectionIndex, Math.max(visibleSections.length - 1, 0));
            const nextSection = visibleSections[nextIndex];
            this.setData({
                sections: visibleSections,
                activeSectionIndex: nextIndex,
                activeSectionName: (nextSection === null || nextSection === void 0 ? void 0 : nextSection.name) || '',
                activeSectionId: (nextSection === null || nextSection === void 0 ? void 0 : nextSection.id) || '',
                products: (nextSection === null || nextSection === void 0 ? void 0 : nextSection.products) || [],
                originPlaces: Array.from(new Set(((nextSection === null || nextSection === void 0 ? void 0 : nextSection.products) || []).map((item) => item.originPlace).filter(Boolean))),
            });
        },
    },
});
