"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const money_1 = require("../../../utils/money");
Component({
    properties: {
        product: {
            type: Object,
            value: null,
        },
        layout: {
            type: String,
            value: 'vertical', // 'vertical' | 'horizontal' | 'rank'
        },
    },
    data: {
        icons: icons_1.iconPaths,
        displayProduct: {},
    },
    observers: {
        product(product) {
            var _a, _b, _c, _d, _e, _f;
            if (!product) {
                this.setData({
                    displayProduct: {},
                });
                return;
            }
            const isGroupBuy = Boolean((_a = product.groupBuyConfig) === null || _a === void 0 ? void 0 : _a.enabled);
            this.setData({
                displayProduct: {
                    ...product,
                    price: (0, money_1.formatMoneyDisplay)((_b = product.priceNum) !== null && _b !== void 0 ? _b : product.price),
                    priceNum: (0, money_1.formatMoneyDisplay)((_c = product.priceNum) !== null && _c !== void 0 ? _c : product.price),
                    originalPrice: (0, money_1.formatMoneyDisplay)((_f = (_e = (_d = product.originalPrice) !== null && _d !== void 0 ? _d : product.originPrice) !== null && _e !== void 0 ? _e : product.priceNum) !== null && _f !== void 0 ? _f : product.price),
                    groupPrice: (0, money_1.formatMoneyDisplay)(product.groupPrice),
                    flashPrice: (0, money_1.formatMoneyDisplay)(product.flashPrice),
                    isGroupBuy,
                    badge: isGroupBuy ? '拼团' : product.badge,
                    ctaText: isGroupBuy ? '去拼团' : '',
                },
            });
        },
    },
    methods: {
        onCardTap() {
            var _a;
            const product = this.properties.product;
            const id = product === null || product === void 0 ? void 0 : product.id;
            if (id) {
                if ((_a = product === null || product === void 0 ? void 0 : product.groupBuyConfig) === null || _a === void 0 ? void 0 : _a.enabled) {
                    wx.navigateTo({
                        url: `/pages/quick/group-buy/index?productId=${id}&title=${encodeURIComponent(product.title || '拼团专区')}`,
                    });
                    return;
                }
                wx.navigateTo({
                    url: `/pages/product/detail/detail?productId=${id}`,
                });
            }
        },
        onAddToCart() {
            const product = this.properties.product;
            if (product && (product.skuId || product.id)) {
                this.triggerEvent('addtocart', {
                    skuId: product.skuId ? Number(product.skuId) : undefined,
                    product: product,
                });
            }
        },
    },
});
