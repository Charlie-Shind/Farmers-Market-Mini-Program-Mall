"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHomeBanners = fetchHomeBanners;
exports.fetchHomeQuickEntries = fetchHomeQuickEntries;
exports.fetchHomeHotProducts = fetchHomeHotProducts;
exports.fetchMerchantEntryStatus = fetchMerchantEntryStatus;
exports.bootstrapCatalogData = bootstrapCatalogData;
exports.fetchCategories = fetchCategories;
exports.fetchProducts = fetchProducts;
exports.fetchSearchHotKeywords = fetchSearchHotKeywords;
exports.fetchCart = fetchCart;
exports.fetchMessageList = fetchMessageList;
exports.fetchUnreadMessageCount = fetchUnreadMessageCount;
exports.fetchMessageDetail = fetchMessageDetail;
exports.markMessageRead = markMessageRead;
exports.markMessagesRead = markMessagesRead;
exports.markAllMessagesRead = markAllMessagesRead;
exports.deleteMessage = deleteMessage;
exports.fetchChatConversations = fetchChatConversations;
exports.fetchChatSupportTarget = fetchChatSupportTarget;
exports.openChatConversation = openChatConversation;
exports.fetchChatMessages = fetchChatMessages;
exports.sendChatMessage = sendChatMessage;
exports.markChatConversationRead = markChatConversationRead;
exports.fetchChatUnreadCount = fetchChatUnreadCount;
exports.setCachedCartItemCount = setCachedCartItemCount;
exports.invalidateCartItemCount = invalidateCartItemCount;
exports.fetchCartItemCount = fetchCartItemCount;
exports.fetchAddresses = fetchAddresses;
exports.updateCartItem = updateCartItem;
exports.removeCartItem = removeCartItem;
exports.addToCart = addToCart;
exports.fetchCoupons = fetchCoupons;
exports.fetchUserCoupons = fetchUserCoupons;
exports.receiveCoupon = receiveCoupon;
exports.fetchPointsLogs = fetchPointsLogs;
exports.fetchPointExchangeItems = fetchPointExchangeItems;
exports.exchangePointsCoupon = exchangePointsCoupon;
exports.fetchOrders = fetchOrders;
exports.fetchMe = fetchMe;
exports.updateMeProfile = updateMeProfile;
exports.fetchAssetsSummary = fetchAssetsSummary;
exports.fetchMerchantDetail = fetchMerchantDetail;
exports.fetchMerchantPublicProducts = fetchMerchantPublicProducts;
exports.fetchMerchantCoupons = fetchMerchantCoupons;
exports.fetchRecommendedCoupons = fetchRecommendedCoupons;
exports.fetchCategoryRecommendations = fetchCategoryRecommendations;
exports.fetchRelatedProducts = fetchRelatedProducts;
exports.createWxacode = createWxacode;
exports.createShareCard = createShareCard;
exports.scanQrCode = scanQrCode;
exports.resolveQrRedirect = resolveQrRedirect;
exports.fetchProductDetail = fetchProductDetail;
exports.fetchTraceDetail = fetchTraceDetail;
exports.fetchFavorites = fetchFavorites;
exports.addFavorite = addFavorite;
exports.removeFavorite = removeFavorite;
exports.createAddress = createAddress;
exports.updateAddress = updateAddress;
exports.deleteAddress = deleteAddress;
exports.previewOrder = previewOrder;
exports.createOrder = createOrder;
exports.createWechatPayment = createWechatPayment;
exports.fetchWechatPaymentStatus = fetchWechatPaymentStatus;
exports.fetchOrderLogisticsDetail = fetchOrderLogisticsDetail;
exports.fetchOrderDetail = fetchOrderDetail;
exports.cancelOrder = cancelOrder;
exports.confirmOrder = confirmOrder;
exports.createRefundApply = createRefundApply;
exports.submitOrderReview = submitOrderReview;
const request_1 = require("./request");
function buildQuery(params) {
    const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    return query.length ? `?${query.join('&')}` : '';
}
let cachedCartItemCount = null;
let cachedCartItemCountPromise = null;
async function fetchHomeBanners() {
    return (0, request_1.get)('/app/home/banners');
}
async function fetchHomeQuickEntries() {
    return (0, request_1.get)('/app/home/quick-entries');
}
async function fetchHomeHotProducts() {
    return (0, request_1.get)('/app/home/hot-products');
}
async function fetchMerchantEntryStatus() {
    return (0, request_1.get)('/app/home/merchant-entry-status');
}
let bootstrapCatalogPromise = null;
async function bootstrapCatalogData() {
    if (!bootstrapCatalogPromise) {
        bootstrapCatalogPromise = Promise.allSettled([
            fetchCategories(),
            fetchHomeHotProducts(),
            fetchProducts('', { page: 1, pageSize: 6 }),
        ]).then(() => undefined);
    }
    try {
        await bootstrapCatalogPromise;
    }
    finally {
        bootstrapCatalogPromise = null;
    }
}
async function fetchCategories() {
    return (0, request_1.get)('/app/categories');
}
async function fetchProducts(keyword = '', pageOrOptions = {}, categoryId) {
    const options = typeof pageOrOptions === 'number'
        ? { page: 1, pageSize: pageOrOptions, categoryId }
        : pageOrOptions;
    return (0, request_1.get)(`/app/products${buildQuery({
        page: options.page,
        pageSize: options.pageSize,
        keyword,
        categoryId: options.categoryId,
        isHot: options.isHot,
        isPreSale: options.isPreSale,
        productNature: options.productNature,
        deliveryType: options.deliveryType,
    })}`);
}
async function fetchSearchHotKeywords() {
    return (0, request_1.get)('/app/search/hot-keywords');
}
async function fetchCart() {
    return (0, request_1.get)('/app/cart');
}
async function fetchMessageList(query = {}) {
    return (0, request_1.get)('/app/messages', query, { auth: true });
}
async function fetchUnreadMessageCount() {
    return (0, request_1.get)('/app/messages/unread-count', undefined, { auth: true });
}
async function fetchMessageDetail(receiptId) {
    return (0, request_1.get)(`/app/messages/${receiptId}`, undefined, { auth: true });
}
async function markMessageRead(receiptId) {
    return (0, request_1.post)(`/app/messages/${receiptId}/read`, {}, { auth: true });
}
async function markMessagesRead(receiptIds) {
    return (0, request_1.post)('/app/messages/read-batch', {
        ids: receiptIds,
    }, { auth: true });
}
async function markAllMessagesRead() {
    return (0, request_1.post)('/app/messages/read-all', {}, { auth: true });
}
async function deleteMessage(receiptId) {
    return (0, request_1.post)(`/app/messages/${receiptId}/delete`, {});
}
async function fetchChatConversations() {
    return (0, request_1.get)('/app/chats');
}
async function fetchChatSupportTarget() {
    return (0, request_1.get)('/app/chats/support-target');
}
async function openChatConversation(payload) {
    return (0, request_1.post)('/app/chats/open', payload, { auth: true });
}
async function fetchChatMessages(conversationId, query = {}) {
    return (0, request_1.get)(`/app/chats/${conversationId}/messages${buildQuery({ page: query.page, pageSize: query.pageSize })}`);
}
async function sendChatMessage(conversationId, payload) {
    return (0, request_1.post)(`/app/chats/${conversationId}/messages`, payload, { auth: true });
}
async function markChatConversationRead(conversationId) {
    return (0, request_1.post)(`/app/chats/${conversationId}/read`, {}, { auth: true });
}
async function fetchChatUnreadCount() {
    return (0, request_1.get)('/app/chats/unread-count');
}
function setCachedCartItemCount(count) {
    cachedCartItemCount = Number.isFinite(Number(count)) && Number(count) >= 0 ? Number(count) : null;
}
function invalidateCartItemCount() {
    cachedCartItemCount = null;
    cachedCartItemCountPromise = null;
}
async function fetchCartItemCount(forceRefresh = false) {
    if (!forceRefresh && cachedCartItemCount != null) {
        return cachedCartItemCount;
    }
    if (!forceRefresh && cachedCartItemCountPromise) {
        return cachedCartItemCountPromise;
    }
    cachedCartItemCountPromise = (async () => {
        const groups = await fetchCart();
        const count = groups.reduce((sum, group) => {
            return (sum +
                group.items.reduce((groupSum, item) => groupSum + Number(item.quantity || 0), 0));
        }, 0);
        cachedCartItemCount = count;
        return count;
    })();
    try {
        return await cachedCartItemCountPromise;
    }
    finally {
        cachedCartItemCountPromise = null;
    }
}
async function fetchAddresses() {
    return (0, request_1.get)('/app/addresses');
}
async function updateCartItem(cartId, payload) {
    const result = await (0, request_1.request)({
        url: `/app/cart/items/${cartId}`,
        method: 'PATCH',
        data: payload,
    });
    invalidateCartItemCount();
    return result;
}
async function removeCartItem(cartId) {
    const result = await (0, request_1.del)(`/app/cart/items/${cartId}`);
    invalidateCartItemCount();
    return result;
}
async function addToCart(skuId, quantity = 1) {
    const result = await (0, request_1.post)('/app/cart/items', { skuId, quantity });
    if (typeof (result === null || result === void 0 ? void 0 : result.cartCount) === 'number') {
        setCachedCartItemCount(result.cartCount);
    }
    else {
        invalidateCartItemCount();
    }
    return result;
}
async function fetchCoupons() {
    return (0, request_1.get)('/app/coupons', undefined, { auth: true });
}
async function fetchUserCoupons() {
    return (0, request_1.get)('/app/user/coupons', undefined, { auth: true });
}
async function receiveCoupon(couponId) {
    return (0, request_1.post)(`/app/coupons/${couponId}/receive`, {}, { auth: true });
}
async function fetchPointsLogs() {
    return (0, request_1.get)('/app/points/logs', undefined, { auth: true });
}
async function fetchPointExchangeItems() {
    return (0, request_1.get)('/app/points/exchange-items', undefined, { auth: true });
}
async function exchangePointsCoupon(couponId) {
    return (0, request_1.post)('/app/points/exchange', { couponId }, { auth: true });
}
async function fetchOrders(query = {}) {
    return (0, request_1.get)(`/app/orders${buildQuery({
        page: query.page,
        pageSize: query.pageSize,
        keyword: query.keyword,
    })}`);
}
async function fetchMe() {
    return (0, request_1.get)('/identity/auth/me');
}
async function updateMeProfile(payload) {
    return (0, request_1.request)({
        url: '/identity/auth/me',
        method: 'PATCH',
        data: payload,
    });
}
async function fetchAssetsSummary() {
    return (0, request_1.get)('/app/assets/summary', undefined, { auth: true });
}
async function fetchMerchantDetail(merchantId) {
    return (0, request_1.get)(`/app/merchants/${merchantId}`);
}
async function fetchMerchantPublicProducts(merchantId, options = {}) {
    return (0, request_1.get)(`/app/merchants/${merchantId}/products`, options);
}
async function fetchMerchantCoupons(merchantId) {
    return (0, request_1.get)(`/app/merchants/${merchantId}/coupons`);
}
async function fetchRecommendedCoupons(scene, options = {}) {
    return (0, request_1.get)(`/app/coupons/recommended${buildQuery({
        scene,
        cartAmount: options.cartAmount,
        merchantId: options.merchantId,
        limit: options.limit,
    })}`);
}
async function fetchCategoryRecommendations(categoryId, options = {}) {
    return (0, request_1.get)(`/app/categories/${categoryId}/recommendations${buildQuery({
        period: options.period,
        page: options.page,
        pageSize: options.pageSize,
    })}`);
}
async function fetchRelatedProducts(productId, limit = 6) {
    return (0, request_1.get)(`/app/products/${productId}/related${buildQuery({ limit })}`);
}
async function createWxacode(payload) {
    return (0, request_1.post)('/app/qr-codes/wxacode', payload, { auth: true });
}
async function createShareCard(payload) {
    return (0, request_1.post)('/app/qr-codes/share-card', payload, { auth: true });
}
async function scanQrCode(payload) {
    return (0, request_1.post)('/app/qr-codes/scan', payload, { auth: true });
}
async function resolveQrRedirect(scene) {
    return (0, request_1.get)(`/app/qr-codes/redirect${buildQuery({ scene })}`);
}
async function fetchProductDetail(productId) {
    return (0, request_1.get)(`/app/products/${productId}`);
}
async function fetchTraceDetail(traceCode) {
    return (0, request_1.get)(`/app/traces/${encodeURIComponent(traceCode)}`);
}
async function fetchFavorites(query = {}) {
    return (0, request_1.get)(`/app/favorites${buildQuery({
        page: query.page,
        pageSize: query.pageSize,
    })}`, undefined, { auth: true });
}
async function addFavorite(productId) {
    return (0, request_1.post)(`/app/products/${productId}/favorite`, {}, { auth: true });
}
async function removeFavorite(productId) {
    return (0, request_1.del)(`/app/products/${productId}/favorite`, undefined, { auth: true });
}
async function createAddress(payload) {
    return (0, request_1.post)('/app/addresses', payload, { auth: true });
}
async function updateAddress(addressId, payload) {
    return (0, request_1.request)({
        url: `/app/addresses/${addressId}`,
        method: 'PATCH',
        data: payload,
        auth: true,
    });
}
async function deleteAddress(addressId) {
    return (0, request_1.del)(`/app/addresses/${addressId}`, undefined, { auth: true });
}
async function previewOrder(payload) {
    return (0, request_1.post)('/app/orders/preview', payload, { auth: true });
}
async function createOrder(payload) {
    const result = await (0, request_1.post)('/app/orders', payload, { auth: true });
    if (typeof (result === null || result === void 0 ? void 0 : result.cartCount) === 'number') {
        setCachedCartItemCount(result.cartCount);
    }
    else {
        invalidateCartItemCount();
    }
    return result;
}
async function createWechatPayment(payload) {
    return (0, request_1.post)('/app/payments/wechat', payload, { auth: true });
}
async function fetchWechatPaymentStatus(orderNo) {
    return (0, request_1.get)(`/app/payments/wechat/status/${encodeURIComponent(orderNo)}`, undefined, { auth: true });
}
async function fetchOrderLogisticsDetail(orderNo) {
    return (0, request_1.get)(`/app/orders/${encodeURIComponent(orderNo)}/logistics`, undefined, { auth: true });
}
async function fetchOrderDetail(orderNo) {
    return (0, request_1.get)(`/app/orders/${orderNo}`, undefined, { auth: true });
}
async function cancelOrder(orderNo) {
    const result = await (0, request_1.post)(`/app/orders/${orderNo}/cancel`, {}, { auth: true });
    invalidateCartItemCount();
    return result;
}
async function confirmOrder(orderNo) {
    return (0, request_1.post)(`/app/orders/${orderNo}/confirm`, {}, { auth: true });
}
async function createRefundApply(payload) {
    return (0, request_1.post)('/app/refunds', payload, { auth: true });
}
async function submitOrderReview(orderNo, payload) {
    return (0, request_1.post)(`/app/orders/${orderNo}/reviews`, payload, { auth: true });
}
