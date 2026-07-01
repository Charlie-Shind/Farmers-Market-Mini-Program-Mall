"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
function toMoney(value) {
    const amount = Number(String(value == null ? 0 : value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(amount) ? amount : 0;
}
function buildCartItems(groups) {
    const flatItems = groups.flatMap((group) => group.items.map((item, index) => ({
        ...item,
        groupKey: group.storeName,
        orderIndex: index,
    })));
    return flatItems.map((item, index) => ({
        id: String(item.cartId),
        cartId: item.cartId,
        title: item.title,
        desc: item.skuName || `规格 ${index + 1}`,
        price: `¥${item.price}`,
        quantity: item.quantity,
        checked: item.checked,
        imageClass: ['orange-img', 'egg-img', 'rice-img', 'oil-img'][index % 4],
        coverUrl: item.coverUrl,
        imageStyle: item.coverUrl
            ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
            : '',
    }));
}
Component({
    data: {
        cart: {
            address: {
                title: '收货地址：加载中',
                desc: '正在拉取真实收货地址',
            },
            promo: {
                text: '满¥129.00，可享免运费',
                actionLabel: '去凑单',
                threshold: 129,
            },
            shopName: '购物车',
            items: [],
            discount: '¥0.00',
            total: '¥0.00',
            recommend: [],
        },
        cartItemCount: 0,
        checkedItemCount: 0,
        loading: false,
        loadError: false,
        icons: icons_1.iconPaths,
        pageStyle: '',
        showSpecSheet: false,
        activeSpecProduct: null,
    },
    lifetimes: {
        attached() {
            if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/cart/cart')) {
                return;
            }
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            this.loadCartData();
        },
    },
    pageLifetimes: {
        show() {
            var _a, _b;
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            this.loadCartData();
            const tabBar = (_b = (_a = this).getTabBar) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (tabBar) {
                if (typeof tabBar.syncFromRoute === 'function') {
                    tabBar.syncFromRoute();
                }
                else {
                    tabBar.setData({ visible: true, active: 'cart' });
                }
            }
        },
    },
    methods: {
        async loadCartData() {
            var _a, _b, _c;
            this.setData({
                loading: true,
                loadError: false,
            });
            try {
                const [groups, addresses, productsPage] = await Promise.all([
                    (0, app_1.fetchCart)(),
                    (0, app_1.fetchAddresses)(),
                    (0, app_1.fetchProducts)('', 4),
                ]);
                const items = buildCartItems(groups);
                const checkedItems = items.filter((item) => item.checked);
                const checkedTotal = items.reduce((sum, item) => {
                    if (!item.checked) {
                        return sum;
                    }
                    return sum + toMoney(item.price) * item.quantity;
                }, 0);
                const promoThreshold = 129;
                const shopName = groups.length > 1 ? `${groups.length} 家商户商品` : ((_a = groups[0]) === null || _a === void 0 ? void 0 : _a.storeName) || '购物车';
                const address = addresses.find((item) => item.isDefault) || addresses[0];
                const promoText = checkedTotal >= promoThreshold
                    ? '已满足免运费'
                    : `满¥${promoThreshold.toFixed(2)}，可享免运费`;
                this.setData({
                    cart: {
                        address: address
                            ? {
                                title: `收货地址：${address.province}${address.city}${address.district} ${address.detailAddress}`,
                                desc: `${address.receiverName} ${address.receiverMobile}${address.isDefault ? ' · 默认地址' : ''}`,
                            }
                            : {
                                title: '收货地址：未设置',
                                desc: '请先添加真实收货地址',
                            },
                        promo: {
                            text: promoText,
                            actionLabel: '去凑单',
                            threshold: promoThreshold,
                        },
                        shopName,
                        items,
                        discount: '¥0.00',
                        total: `¥${checkedTotal.toFixed(2)}`,
                        recommend: (productsPage.items || []).slice(0, 2).map((product, index) => ({
                            id: String(product.id),
                            skuId: product.skuId,
                            title: product.title,
                            desc: product.subtitle || product.originPlace || '优选商品',
                            price: `¥${product.minPrice || '0.00'}`,
                            imageClass: ['oil-img', 'tomato-img'][index % 2],
                            coverUrl: product.coverUrl,
                            imageStyle: product.coverUrl
                                ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
                                : '',
                        })),
                    },
                    cartItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
                    checkedItemCount: checkedItems.reduce((sum, item) => sum + item.quantity, 0),
                });
                const tabBar = (_c = (_b = this).getTabBar) === null || _c === void 0 ? void 0 : _c.call(_b);
                if (tabBar && typeof tabBar.syncFromRoute === 'function') {
                    tabBar.syncFromRoute();
                }
            }
            catch {
                this.setData({
                    loadError: true,
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        async toggleItem(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                return;
            }
            const { cartId, checked } = e.currentTarget.dataset || {};
            if (!cartId) {
                return;
            }
            try {
                const currentChecked = checked === true;
                await (0, app_1.updateCartItem)(Number(cartId), { checked: !currentChecked });
                this.loadCartData();
            }
            catch {
                wx.showToast({ title: '更新失败', icon: 'none' });
            }
        },
        async increaseItem(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                return;
            }
            const { cartId, quantity } = e.currentTarget.dataset || {};
            if (!cartId) {
                return;
            }
            try {
                await (0, app_1.updateCartItem)(Number(cartId), { quantity: Number(quantity || 0) + 1 });
                this.loadCartData();
            }
            catch {
                wx.showToast({ title: '更新失败', icon: 'none' });
            }
        },
        async decreaseItem(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                return;
            }
            const { cartId, quantity } = e.currentTarget.dataset || {};
            if (!cartId) {
                return;
            }
            const nextQuantity = Math.max(Number(quantity || 0) - 1, 0);
            try {
                if (nextQuantity <= 0) {
                    await (0, app_1.removeCartItem)(Number(cartId));
                }
                else {
                    await (0, app_1.updateCartItem)(Number(cartId), { quantity: nextQuantity });
                }
                this.loadCartData();
            }
            catch {
                wx.showToast({ title: '更新失败', icon: 'none' });
            }
        },
        openProductDetail(e) {
            const { id } = e.currentTarget.dataset || {};
            if (!id) {
                return;
            }
            wx.navigateTo({
                url: `/pages/product/detail/detail?productId=${id}`,
            });
        },
        async addRecommendToCart(e) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                return;
            }
            const { id } = e.currentTarget.dataset || {};
            if (!id) {
                wx.showToast({ title: '商品不存在', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '加载中...', mask: true });
            try {
                const fullProduct = await (0, app_1.fetchProductDetail)(Number(id));
                wx.hideLoading();
                if (fullProduct && fullProduct.skus && fullProduct.skus.length > 0) {
                    this.setData({
                        activeSpecProduct: fullProduct,
                        showSpecSheet: true,
                    });
                }
                else {
                    wx.showToast({ title: '该商品暂无规格', icon: 'none' });
                }
            }
            catch {
                wx.hideLoading();
                wx.showToast({ title: '获取商品规格失败', icon: 'none' });
            }
        },
        onCloseSpecSheet() {
            this.setData({ showSpecSheet: false });
        },
        async onConfirmSpecSheet(e) {
            const { sku, qty } = e.detail || {};
            if (!sku) {
                wx.showToast({ title: '请选择规格', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '加入购物车...', mask: true });
            try {
                await (0, app_1.addToCart)(Number(sku.id), qty || 1);
                wx.hideLoading();
                wx.showToast({ title: '已加入购物车', icon: 'success' });
                this.setData({ showSpecSheet: false });
                await this.loadCartData();
            }
            catch {
                wx.hideLoading();
                wx.showToast({ title: '加入购物车失败', icon: 'none' });
            }
        },
        openSection(e) {
            const { label } = e.currentTarget.dataset || {};
            if (label === '收货地址') {
                if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                    return;
                }
                wx.navigateTo({ url: '/pages/address/list/list' });
                return;
            }
            if (label === '去凑单') {
                if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                    return;
                }
                wx.navigateTo({ url: '/pages/category/category' });
                return;
            }
            if (label === '去逛逛') {
                wx.switchTab({ url: '/pages/index/index' });
                return;
            }
            if (label === '结算') {
                if (!(0, auth_route_1.ensureCustomerAccess)('/pages/cart/cart')) {
                    return;
                }
                const checkedIds = this.data.cart.items.filter((item) => item.checked).map((item) => item.cartId);
                if (!checkedIds.length) {
                    wx.showToast({ title: '请选择要结算的商品', icon: 'none' });
                    return;
                }
                wx.navigateTo({
                    url: `/pages/checkout/checkout?cartIds=${checkedIds.join(',')}`,
                });
                return;
            }
            if (label === '编辑购物车') {
                wx.showToast({ title: '数量和勾选可直接编辑', icon: 'none' });
            }
        },
    },
});
