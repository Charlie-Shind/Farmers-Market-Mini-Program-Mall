"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
const DELIVERY_METHODS = [
    { type: 1, name: '标准快递' },
    { type: 2, name: '同城冷链' },
    { type: 3, name: '自提点自提' },
];
Component({
    data: {
        checkoutMode: 'cart',
        cartIds: [],
        groupBuyContext: null,
        flashSaleContext: null,
        address: null,
        items: [],
        deliveryMethods: DELIVERY_METHODS,
        selectedDelivery: DELIVERY_METHODS[0],
        availableCoupons: [],
        selectedCoupon: null,
        selectedCouponId: 0,
        usePoints: false,
        points: {
            balance: 0,
            usable: 0,
            money: '0.00',
            redeemEnabled: true,
            redeemRate: 100,
        },
        summary: {
            productAmount: '0.00',
            freightAmount: '0.00',
            couponDiscount: '0.00',
            pointsDiscount: '0.00',
            payAmount: '0.00',
        },
        icons: icons_1.iconPaths,
        pageStyle: '',
        activeSheet: '',
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
            this.hideStackedTabBar();
            void this.bootstrapPage();
        },
        hide() {
            this.restoreStackedTabBar();
        },
    },
    methods: {
        hideStackedTabBar() {
            const pages = getCurrentPages();
            for (let i = pages.length - 1; i >= 0; i -= 1) {
                const page = pages[i];
                const tabBar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
                if (tabBar) {
                    tabBar.setData({ visible: false });
                    return;
                }
            }
        },
        restoreStackedTabBar() {
            const pages = getCurrentPages();
            for (let i = pages.length - 1; i >= 0; i -= 1) {
                const page = pages[i];
                const tabBar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
                if (tabBar && typeof tabBar.syncFromRoute === 'function') {
                    tabBar.syncFromRoute();
                    return;
                }
            }
        },
        async bootstrapPage() {
            var _a, _b, _c;
            await new Promise((resolve) => setTimeout(resolve, 0));
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const options = (current === null || current === void 0 ? void 0 : current.options) || {};
            const cartIdsStr = options.cartIds || '';
            const groupBuyIdStr = options.groupBuyId || '';
            const productIdStr = options.productId || '';
            const skuIdStr = options.skuId || '';
            const modeStr = options.mode || '';
            if (!cartIdsStr && !groupBuyIdStr && modeStr !== 'flashSale') {
                wx.showToast({ title: '参数错误', icon: 'none' });
                setTimeout(() => this.goBack(), 1500);
                return;
            }
            if (modeStr === 'flashSale') {
                const flashSaleItemId = Number(options.flashSaleItemId);
                const skuId = Number(options.skuId);
                const quantity = Number(options.quantity || 1);
                const flashPrice = options.flashPrice || '0.00';
                const title = options.title ? decodeURIComponent(options.title) : '';
                const subtitle = options.subtitle ? decodeURIComponent(options.subtitle) : '';
                const coverUrl = options.coverUrl ? decodeURIComponent(options.coverUrl) : '';
                const originPrice = options.originPrice ? decodeURIComponent(options.originPrice) : '';
                if (![flashSaleItemId, skuId].every((v) => Number.isFinite(v) && v > 0)) {
                    wx.showToast({ title: '秒杀参数错误', icon: 'none' });
                    setTimeout(() => this.goBack(), 1500);
                    return;
                }
                this.setData({
                    checkoutMode: 'flashSale',
                    cartIds: [],
                    groupBuyContext: null,
                    flashSaleContext: { flashSaleItemId, skuId, quantity, flashPrice, title, subtitle, coverUrl, originPrice },
                });
                await this.initCheckoutData();
                return;
            }
            if (groupBuyIdStr) {
                const groupBuyId = Number(groupBuyIdStr);
                const productId = Number(productIdStr);
                const skuId = Number(skuIdStr);
                if (![groupBuyId, productId, skuId].every((value) => Number.isFinite(value) && value > 0)) {
                    wx.showToast({ title: '拼团参数错误', icon: 'none' });
                    setTimeout(() => this.goBack(), 1500);
                    return;
                }
                const sameGroupBuy = this.data.checkoutMode === 'groupBuy' &&
                    ((_a = this.data.groupBuyContext) === null || _a === void 0 ? void 0 : _a.groupBuyId) === groupBuyId &&
                    ((_b = this.data.groupBuyContext) === null || _b === void 0 ? void 0 : _b.productId) === productId &&
                    ((_c = this.data.groupBuyContext) === null || _c === void 0 ? void 0 : _c.skuId) === skuId &&
                    this.data.items.length > 0;
                if (sameGroupBuy) {
                    return;
                }
                this.setData({
                    checkoutMode: 'groupBuy',
                    cartIds: [],
                    groupBuyContext: {
                        groupBuyId,
                        productId,
                        skuId,
                        title: '',
                        skuName: '',
                        coverUrl: '',
                        groupPrice: '0.00',
                    },
                });
                await this.initCheckoutData();
                return;
            }
            const cartIds = cartIdsStr.split(',').map(Number).filter(Boolean);
            const sameCartIds = this.data.checkoutMode === 'cart' &&
                cartIds.length === this.data.cartIds.length &&
                cartIds.every((id, index) => id === this.data.cartIds[index]);
            if (sameCartIds && this.data.items.length > 0) {
                return;
            }
            this.setData({
                checkoutMode: 'cart',
                cartIds,
                groupBuyContext: null,
            });
            await this.initCheckoutData();
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        async initCheckoutData() {
            var _a, _b;
            wx.showLoading({ title: '加载中…' });
            try {
                // 1. Fetch addresses, choose default or first
                const addresses = await (0, app_1.fetchAddresses)();
                const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;
                let flatItems = [];
                let totalGoodsAmount = 0;
                if (this.data.checkoutMode === 'flashSale') {
                    const context = this.data.flashSaleContext;
                    if (!context) {
                        wx.showToast({ title: '秒杀参数缺失', icon: 'none' });
                        setTimeout(() => this.goBack(), 1500);
                        return;
                    }
                    // Flash sale pricing is already determined by the claim endpoint
                    flatItems = [
                        {
                            cartId: 0,
                            productId: 0,
                            skuId: context.skuId,
                            title: context.title || '秒杀商品',
                            skuName: context.subtitle || '',
                            price: context.flashPrice,
                            originalPrice: context.originPrice || undefined,
                            quantity: context.quantity,
                            coverUrl: context.coverUrl || '',
                            storeName: '',
                        },
                    ];
                    totalGoodsAmount = Number(context.flashPrice) * context.quantity;
                }
                else if (this.data.checkoutMode === 'groupBuy') {
                    const context = this.data.groupBuyContext;
                    if (!context) {
                        wx.showToast({ title: '拼团参数缺失', icon: 'none' });
                        setTimeout(() => this.goBack(), 1500);
                        return;
                    }
                    const product = await (0, app_1.fetchProductDetail)(context.productId);
                    const selectedSku = product.skus.find((item) => Number(item.id) === Number(context.skuId)) || product.skus[0];
                    if (!selectedSku) {
                        wx.showToast({ title: '拼团规格失效', icon: 'none' });
                        setTimeout(() => this.goBack(), 1500);
                        return;
                    }
                    const groupConfig = product.groupBuyConfig;
                    if (!groupConfig || !groupConfig.enabled) {
                        wx.showToast({ title: '该商品暂不支持拼团', icon: 'none' });
                        setTimeout(() => this.goBack(), 1500);
                        return;
                    }
                    const groupPrice = (Number(selectedSku.price) * groupConfig.discountRate).toFixed(2);
                    flatItems = [
                        {
                            cartId: 0,
                            productId: Number(product.id),
                            skuId: Number(selectedSku.id),
                            title: product.title,
                            skuName: selectedSku.skuName || '默认规格',
                            price: groupPrice,
                            quantity: 1,
                            coverUrl: selectedSku.imageUrl || product.coverUrl,
                            storeName: product.merchantName || '',
                        },
                    ];
                    totalGoodsAmount = Number(groupPrice);
                    this.setData({
                        groupBuyContext: {
                            ...context,
                            title: product.title,
                            skuName: selectedSku.skuName || '默认规格',
                            coverUrl: selectedSku.imageUrl || product.coverUrl,
                            groupPrice,
                        },
                    });
                }
                else {
                    // 2. Fetch cart list and filter items
                    const cartGroups = await (0, app_1.fetchCart)();
                    cartGroups.forEach((group) => {
                        group.items.forEach((item) => {
                            if (this.data.cartIds.includes(item.cartId)) {
                                flatItems.push({
                                    cartId: item.cartId,
                                    productId: item.productId,
                                    skuId: item.skuId,
                                    title: item.title,
                                    skuName: item.skuName || '默认规格',
                                    price: item.price,
                                    quantity: item.quantity,
                                    coverUrl: item.coverUrl,
                                    storeName: group.storeName,
                                });
                            }
                        });
                    });
                    if (flatItems.length === 0) {
                        wx.showToast({ title: '结算商品失效', icon: 'none' });
                        setTimeout(() => this.goBack(), 1500);
                        return;
                    }
                    totalGoodsAmount = flatItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
                }
                // 3. Fetch user's received coupons that are usable for this order
                const userCoupons = await (0, app_1.fetchUserCoupons)().catch(() => []);
                const nowMs = Date.now();
                const availableCoupons = userCoupons
                    .filter((uc) => uc.status === 'RECEIVED')
                    .filter((uc) => !uc.validEndAt || new Date(uc.validEndAt).getTime() >= nowMs)
                    .filter((uc) => Number(uc.thresholdAmount) <= totalGoodsAmount)
                    .map((uc) => ({
                    couponId: uc.couponId,
                    name: uc.name,
                    type: uc.type,
                    thresholdAmount: uc.thresholdAmount,
                    discountAmount: uc.discountAmount,
                    stock: 0,
                    issuedStock: 0,
                    received: true,
                }));
                // 4. Fetch points balance
                const assets = await (0, app_1.fetchAssetsSummary)().catch(() => null);
                const pointsBalance = (assets === null || assets === void 0 ? void 0 : assets.points.balance) || 0;
                const pointsRedeemEnabled = (assets === null || assets === void 0 ? void 0 : assets.points.redeemEnabled) !== false;
                const pointsRedeemRate = Math.max(Number((_a = assets === null || assets === void 0 ? void 0 : assets.points.redeemRate) !== null && _a !== void 0 ? _a : 100) || 100, 1);
                this.setData({
                    address: defaultAddress,
                    items: flatItems,
                    availableCoupons,
                    selectedCouponId: ((_b = this.data.selectedCoupon) === null || _b === void 0 ? void 0 : _b.couponId) || 0,
                    usePoints: pointsRedeemEnabled ? this.data.usePoints : false,
                    points: {
                        balance: pointsBalance,
                        usable: pointsRedeemEnabled ? Math.min(pointsBalance, Math.floor(totalGoodsAmount * pointsRedeemRate)) : 0,
                        money: pointsRedeemEnabled
                            ? (Math.min(pointsBalance, Math.floor(totalGoodsAmount * pointsRedeemRate)) / pointsRedeemRate).toFixed(2)
                            : '0.00',
                        redeemEnabled: pointsRedeemEnabled,
                        redeemRate: pointsRedeemRate,
                    },
                });
                // 5. Load preview calculations
                await this.loadOrderPreview();
            }
            catch {
                wx.showToast({ title: '获取订单信息失败', icon: 'none' });
            }
            finally {
                wx.hideLoading();
            }
        },
        async loadOrderPreview() {
            var _a, _b, _c;
            const address = this.data.address;
            const cartIds = this.data.cartIds;
            const deliveryType = this.data.selectedDelivery.type;
            const couponId = ((_a = this.data.selectedCoupon) === null || _a === void 0 ? void 0 : _a.couponId) || null;
            const usePointsVal = this.data.points.redeemEnabled && this.data.usePoints ? this.data.points.usable : 0;
            const groupBuyContext = this.data.groupBuyContext;
            // Calculate freight based on delivery method
            let freightAmount = 0;
            if (deliveryType === 1) {
                freightAmount = 8.0; // Standard express freight
            }
            else if (deliveryType === 2) {
                freightAmount = 15.0; // Cold chain delivery freight
            }
            try {
                const previewPayload = {
                    addressId: (address === null || address === void 0 ? void 0 : address.id) || null,
                    couponId,
                    usePoints: usePointsVal,
                    deliveryType,
                    freightAmount,
                };
                if (this.data.checkoutMode === 'flashSale' && this.data.flashSaleContext) {
                    Object.assign(previewPayload, {
                        flashSaleItemId: this.data.flashSaleContext.flashSaleItemId,
                        skuId: this.data.flashSaleContext.skuId,
                        quantity: this.data.flashSaleContext.quantity,
                    });
                }
                else if (this.data.checkoutMode === 'groupBuy' && groupBuyContext) {
                    Object.assign(previewPayload, {
                        orderMode: 'GROUP_BUY',
                        groupBuyId: groupBuyContext.groupBuyId,
                        productId: groupBuyContext.productId,
                        skuId: groupBuyContext.skuId,
                        quantity: 1,
                    });
                }
                else {
                    Object.assign(previewPayload, {
                        cartIds,
                    });
                }
                const preview = await (0, app_1.previewOrder)(previewPayload);
                const couponDiscount = ((_b = preview.coupon) === null || _b === void 0 ? void 0 : _b.usable) ? String((_c = preview.coupon.discountAmount) !== null && _c !== void 0 ? _c : '0.00') : '0.00';
                const pointsDiscount = Math.max(Number(preview.summary.productAmount) + Number(preview.summary.freightAmount) - Number(preview.summary.payAmount) - Number(couponDiscount), 0).toFixed(2);
                this.setData({
                    summary: {
                        productAmount: preview.summary.productAmount,
                        freightAmount: preview.summary.freightAmount,
                        couponDiscount,
                        pointsDiscount,
                        payAmount: preview.summary.payAmount,
                    },
                });
            }
            catch {
                wx.showToast({ title: '价格预估失败，请稍后重试', icon: 'none' });
            }
        },
        selectAddress() {
            wx.navigateTo({
                url: '/pages/address/list/list?mode=select',
                events: {
                    selectAddress: (address) => {
                        this.setData({
                            address,
                        });
                        void this.loadOrderPreview();
                    },
                },
                success: (res) => {
                    // Backup event listener for WeChat Mini Program navigateTo events
                    const eventChannel = res.eventChannel;
                    if (eventChannel && typeof eventChannel.on === 'function') {
                        eventChannel.on('selectAddress', (address) => {
                            this.setData({
                                address,
                            });
                            void this.loadOrderPreview();
                        });
                    }
                },
            });
        },
        async onDeliveryChange(e) {
            var _a;
            const index = Number(((_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) || 0);
            const selectedDelivery = DELIVERY_METHODS[index] || DELIVERY_METHODS[0];
            this.setData({
                selectedDelivery,
            });
            void this.loadOrderPreview();
        },
        async onPointsToggle(e) {
            var _a;
            if (!this.data.points.redeemEnabled) {
                this.setData({
                    usePoints: false,
                });
                return;
            }
            this.setData({
                usePoints: ((_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) === true,
            });
            void this.loadOrderPreview();
        },
        openCouponSheet() {
            this.setData({
                activeSheet: 'coupon',
            });
        },
        closeSheet() {
            this.setData({
                activeSheet: '',
            });
        },
        preventBubble() { },
        preventTouchMove() { },
        selectCoupon(e) {
            const id = e.currentTarget.dataset.id;
            if (id === 'none' || !id) {
                this.setData({
                    selectedCoupon: null,
                    selectedCouponId: 0,
                    activeSheet: '',
                });
            }
            else {
                const coupon = this.data.availableCoupons.find((c) => c.couponId === Number(id));
                this.setData({
                    selectedCoupon: coupon || null,
                    selectedCouponId: (coupon === null || coupon === void 0 ? void 0 : coupon.couponId) || 0,
                    activeSheet: '',
                });
            }
            void this.loadOrderPreview();
        },
        async submitOrder() {
            var _a, _b;
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/checkout/checkout')) {
                return;
            }
            const address = this.data.address;
            if (!address) {
                wx.showToast({ title: '请先选择收货地址', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '正在提交订单…' });
            let createdOrderNo = '';
            let detailOrderNo = '';
            try {
                const deliveryType = this.data.selectedDelivery.type;
                const couponId = ((_a = this.data.selectedCoupon) === null || _a === void 0 ? void 0 : _a.couponId) || null;
                const usePointsVal = this.data.points.redeemEnabled && this.data.usePoints ? this.data.points.usable : 0;
                const groupBuyContext = this.data.groupBuyContext;
                let freightAmount = 0;
                if (deliveryType === 1)
                    freightAmount = 8.0;
                else if (deliveryType === 2)
                    freightAmount = 15.0;
                const orderPayload = {
                    addressId: address.id,
                    couponId,
                    usePoints: usePointsVal,
                    deliveryType,
                    freightAmount,
                    remark: '',
                };
                if (this.data.checkoutMode === 'flashSale' && this.data.flashSaleContext) {
                    Object.assign(orderPayload, {
                        flashSaleItemId: this.data.flashSaleContext.flashSaleItemId,
                        skuId: this.data.flashSaleContext.skuId,
                        quantity: this.data.flashSaleContext.quantity,
                    });
                }
                else if (this.data.checkoutMode === 'groupBuy' && groupBuyContext) {
                    Object.assign(orderPayload, {
                        orderMode: 'GROUP_BUY',
                        groupBuyId: groupBuyContext.groupBuyId,
                        productId: groupBuyContext.productId,
                        skuId: groupBuyContext.skuId,
                        quantity: 1,
                    });
                }
                else {
                    Object.assign(orderPayload, {
                        cartIds: this.data.cartIds,
                    });
                }
                // 1. Create Order
                const orderResult = await (0, app_1.createOrder)(orderPayload);
                createdOrderNo = orderResult.orderNo;
                detailOrderNo = ((_b = orderResult.childOrderNos) === null || _b === void 0 ? void 0 : _b[0]) || orderResult.orderNo;
                // 2. Create the payment bill and query current status
                const payment = await (0, app_1.createWechatPayment)({ orderNo: orderResult.orderNo });
                const paymentStatus = await (0, app_1.fetchWechatPaymentStatus)(orderResult.orderNo);
                wx.hideLoading();
                // 3. Notify user that the payment bill is ready
                wx.showModal({
                    title: '支付单已创建',
                    content: paymentStatus.tradeState === 'SUCCESS'
                        ? `实付金额：¥${this.data.summary.payAmount}\n支付单号：${payment.paymentNo}\n支付状态：已支付。`
                        : `实付金额：¥${this.data.summary.payAmount}\n支付单号：${payment.paymentNo}\n支付状态：待支付，可稍后继续支付。`,
                    showCancel: false,
                    confirmText: '知道了',
                    confirmColor: '#2c4a39',
                    success: () => {
                        wx.showToast({
                            title: paymentStatus.tradeState === 'SUCCESS' ? '订单已支付' : '订单已保留，可稍后继续支付',
                            icon: 'none',
                        });
                        setTimeout(() => {
                            wx.reLaunch({
                                url: `/pages/order/detail/detail?orderNo=${detailOrderNo}`,
                            });
                        }, 1200);
                    },
                });
            }
            catch (err) {
                wx.hideLoading();
                if (createdOrderNo) {
                    wx.showToast({
                        title: (err === null || err === void 0 ? void 0 : err.message) || '订单已生成，可稍后继续支付',
                        icon: 'none',
                    });
                    setTimeout(() => {
                        wx.reLaunch({
                            url: `/pages/order/detail/detail?orderNo=${detailOrderNo || createdOrderNo}`,
                        });
                    }, 1200);
                    return;
                }
                wx.showToast({
                    title: (err === null || err === void 0 ? void 0 : err.message) || '下单失败，请重试',
                    icon: 'none',
                });
            }
        },
    },
});
