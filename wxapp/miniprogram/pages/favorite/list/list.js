"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function formatDateTime(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: false,
        loadingMore: false,
        favorites: [],
        page: 1,
        pageSize: 20,
        total: 0,
        noMore: false,
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
        },
    },
    pageLifetimes: {
        show() {
            void this.loadFavorites(true);
        },
    },
    methods: {
        async loadFavorites(reset = true) {
            var _a, _b;
            if (this.data.loading || this.data.loadingMore) {
                return;
            }
            const page = reset ? 1 : this.data.page;
            this.setData({ [reset ? 'loading' : 'loadingMore']: true });
            try {
                const response = await (0, app_1.fetchFavorites)({ page, pageSize: this.data.pageSize });
                const mapped = (response.items || []).map((item) => ({
                    ...item,
                    createdAtLabel: formatDateTime(item.createdAt),
                }));
                this.setData({
                    favorites: reset ? mapped : [...this.data.favorites, ...mapped],
                    total: (_a = response.total) !== null && _a !== void 0 ? _a : (reset ? mapped.length : this.data.favorites.length + mapped.length),
                    page: page + 1,
                    noMore: ((reset ? mapped.length : this.data.favorites.length + mapped.length) >= ((_b = response.total) !== null && _b !== void 0 ? _b : 0)) || mapped.length < this.data.pageSize,
                });
            }
            catch {
                wx.showToast({ title: '加载收藏失败', icon: 'none' });
            }
            finally {
                this.setData({ loading: false, loadingMore: false });
            }
        },
        loadMore() {
            if (this.data.noMore || this.data.loading || this.data.loadingMore) {
                return;
            }
            void this.loadFavorites(false);
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        openProductDetail(e) {
            const { productId } = e.currentTarget.dataset || {};
            if (!productId) {
                return;
            }
            wx.navigateTo({
                url: `/pages/product/detail/detail?productId=${productId}`,
            });
        },
        removeFavoriteItem(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/favorite/list/list')) {
                return;
            }
            const { productId } = e.currentTarget.dataset || {};
            if (!productId) {
                return;
            }
            wx.showModal({
                title: '取消收藏',
                content: '确定要从我的收藏中移除这个商品吗？',
                success: async (res) => {
                    if (!res.confirm) {
                        return;
                    }
                    try {
                        wx.showLoading({ title: '处理中...' });
                        await (0, app_1.removeFavorite)(Number(productId));
                        wx.showToast({ title: '已取消收藏', icon: 'success' });
                        this.setData({
                            favorites: this.data.favorites.filter((item) => item.productId !== Number(productId)),
                            total: Math.max(0, this.data.total - 1),
                        });
                    }
                    catch {
                        wx.showToast({ title: '操作失败', icon: 'none' });
                    }
                    finally {
                        wx.hideLoading();
                    }
                },
            });
        },
    },
});
