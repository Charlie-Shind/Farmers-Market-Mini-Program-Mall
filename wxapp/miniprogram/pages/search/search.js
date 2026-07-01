"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
const SEARCH_PAGE_SIZE = 24;
const SEARCH_IMAGE_CLASSES = ['orange-img', 'egg-img', 'tomato-img', 'rice-img', 'oil-img', 'date-img'];
let searchDebounceTimer = null;
let searchRequestSeq = 0;
function readPageOptions() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    return (current === null || current === void 0 ? void 0 : current.options) || {};
}
function normalizeSearchText(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[\s·,，.。/\\|_\-()（）【】\[\]:：]+/g, '');
}
function includesInOrder(source, query) {
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
function scoreProduct(product, keyword, index) {
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
function buildResultTags(product) {
    const tags = new Set();
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
function mapProductToView(product, index) {
    return {
        id: String(product.id),
        title: product.title,
        desc: product.subtitle || product.detailDesc || product.originPlace || '全站商品',
        price: `¥${product.minPrice || '0.00'}`,
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
        results: [],
        total: 0,
        resultNote: '',
        page: 1,
        pageSize: SEARCH_PAGE_SIZE,
        noMore: false,
        focusSearch: true,
        cartBadge: '',
        icons: icons_1.iconPaths,
        pageStyle: '',
    },
    lifetimes: {
        attached() {
            const options = readPageOptions();
            const initialKeyword = options.keyword ? decodeURIComponent(options.keyword) : '';
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
                searchText: initialKeyword,
                focusSearch: true,
            });
            if (initialKeyword.trim()) {
                void this.runSearch(initialKeyword.trim());
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
            void this.syncCartBadge();
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
        async runSearch(keyword, reset = true) {
            var _a, _b;
            const nextKeyword = keyword.trim();
            if (!nextKeyword) {
                this.resetSearchState();
                return;
            }
            const requestId = ++searchRequestSeq;
            const nextPage = reset ? 1 : this.data.page;
            this.setData({
                activeKeyword: nextKeyword,
                loading: reset,
                loadingMore: !reset,
                resultNote: '',
            });
            try {
                const response = await (0, app_1.fetchProducts)(nextKeyword, {
                    page: nextPage,
                    pageSize: SEARCH_PAGE_SIZE,
                });
                if (requestId !== searchRequestSeq) {
                    return;
                }
                const sortedItems = ((_a = response.items) !== null && _a !== void 0 ? _a : [])
                    .map((item, index) => ({
                    item,
                    index,
                    score: scoreProduct(item, nextKeyword, index),
                }))
                    .sort((left, right) => left.score - right.score || left.index - right.index)
                    .map(({ item, index }) => mapProductToView(item, index));
                const mergedItems = reset ? sortedItems : [...this.data.results, ...sortedItems];
                const total = (_b = response.total) !== null && _b !== void 0 ? _b : mergedItems.length;
                const noMore = mergedItems.length >= total || sortedItems.length < SEARCH_PAGE_SIZE;
                this.setData({
                    results: mergedItems,
                    total,
                    page: nextPage + 1,
                    noMore,
                    resultNote: noMore
                        ? `共 ${mergedItems.length} 件匹配结果`
                        : `已加载 ${mergedItems.length}/${total} 件，下滑加载更多`,
                    loading: false,
                    loadingMore: false,
                });
            }
            catch {
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
        onSearchInput(e) {
            var _a;
            const value = String((_a = e.detail.value) !== null && _a !== void 0 ? _a : '');
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
                void this.runSearch(keyword, true);
            }, 240);
        },
        submitSearch(e) {
            var _a;
            const keywordFromEvent = (_a = e === null || e === void 0 ? void 0 : e.currentTarget.dataset) === null || _a === void 0 ? void 0 : _a.keyword;
            const keyword = (keywordFromEvent || this.data.searchText || '').trim();
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = null;
            }
            if (!keyword) {
                this.clearSearch();
                return;
            }
            void this.runSearch(keyword, true);
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
        loadMore() {
            if (!this.data.activeKeyword || this.data.loading || this.data.loadingMore || this.data.noMore) {
                return;
            }
            void this.runSearch(this.data.activeKeyword, false);
        },
        openSearchResult(e) {
            const { categoryId } = e.currentTarget.dataset || {};
            if (categoryId) {
                wx.navigateTo({
                    url: `/pages/category/detail/detail?categoryId=${encodeURIComponent(categoryId)}&categoryName=${encodeURIComponent('搜索结果')}`,
                });
                return;
            }
            const { id } = e.currentTarget.dataset || {};
            if (id) {
                wx.navigateTo({
                    url: `/pages/product/detail/detail?productId=${id}`,
                });
                return;
            }
            wx.showToast({ title: '无法打开该商品', icon: 'none' });
        },
        openProductList() {
            const keyword = (this.data.searchText || this.data.activeKeyword || '').trim();
            const query = keyword ? `?title=${encodeURIComponent(keyword)}&keyword=${encodeURIComponent(keyword)}` : '?title=商品列表';
            wx.navigateTo({
                url: `/pages/product/list/list${query}`,
            });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
    },
});
