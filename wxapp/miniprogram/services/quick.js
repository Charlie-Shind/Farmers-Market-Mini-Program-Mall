"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFlashSaleActive = fetchFlashSaleActive;
exports.fetchFlashSaleWindows = fetchFlashSaleWindows;
exports.fetchFlashSaleItems = fetchFlashSaleItems;
exports.fetchGroupBuyProducts = fetchGroupBuyProducts;
exports.fetchGroupBuyNearby = fetchGroupBuyNearby;
exports.joinGroupBuy = joinGroupBuy;
exports.claimFlashSale = claimFlashSale;
exports.fetchGiftZoneItems = fetchGiftZoneItems;
exports.fetchOriginZoneItems = fetchOriginZoneItems;
const request_1 = require("./request");
async function fetchFlashSaleActive() {
    return (0, request_1.get)('/app/quick/flash-sale/active');
}
async function fetchFlashSaleWindows() {
    return (0, request_1.get)('/app/quick/flash-sale/windows');
}
async function fetchFlashSaleItems(options = {}) {
    return (0, request_1.get)('/app/quick/flash-sale/items', options);
}
async function fetchGroupBuyProducts(options = {}) {
    return (0, request_1.get)('/app/quick/group-buy/products', options);
}
async function fetchGroupBuyNearby(options = {}) {
    return (0, request_1.post)('/app/quick/group-buy/nearby', options);
}
async function joinGroupBuy(payload) {
    return (0, request_1.post)('/app/quick/group-buy/join', payload, { auth: true });
}
async function claimFlashSale(payload) {
    return (0, request_1.post)('/app/quick/flash-sale/claim', payload, { auth: true });
}
async function fetchGiftZoneItems(options = {}) {
    return (0, request_1.get)('/app/quick/gift-zone/items', options);
}
async function fetchOriginZoneItems(options = {}) {
    return (0, request_1.get)('/app/quick/origin-zone/items', options);
}
