"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFreightTemplate = exports.createFreightTemplate = exports.fetchFreightTemplates = exports.saveDeliverySetting = exports.fetchDeliverySetting = exports.fetchReviewList = exports.fetchAfterSaleDetail = exports.fetchAfterSaleList = exports.fetchActivityProductCandidates = void 0;
exports.fetchMerchantProfile = fetchMerchantProfile;
exports.applyMerchant = applyMerchant;
exports.fetchMerchantDashboard = fetchMerchantDashboard;
exports.fetchMerchantProducts = fetchMerchantProducts;
exports.fetchMerchantProductDetail = fetchMerchantProductDetail;
exports.createMerchantProduct = createMerchantProduct;
exports.updateMerchantProduct = updateMerchantProduct;
exports.updateMerchantProductStatus = updateMerchantProductStatus;
exports.fetchMerchantProductSkus = fetchMerchantProductSkus;
exports.updateMerchantSkuStock = updateMerchantSkuStock;
exports.updateMerchantSkuStatus = updateMerchantSkuStatus;
exports.deleteMerchantSku = deleteMerchantSku;
exports.batchUpdateMerchantSkus = batchUpdateMerchantSkus;
exports.fetchMerchantProductDrafts = fetchMerchantProductDrafts;
exports.syncMerchantProductDraft = syncMerchantProductDraft;
exports.fetchMerchantProductDraft = fetchMerchantProductDraft;
exports.updateMerchantProductDraft = updateMerchantProductDraft;
exports.deleteMerchantProductDraft = deleteMerchantProductDraft;
exports.publishMerchantProductDraft = publishMerchantProductDraft;
exports.fetchMerchantActivities = fetchMerchantActivities;
exports.fetchMerchantActivityDetail = fetchMerchantActivityDetail;
exports.createMerchantActivity = createMerchantActivity;
exports.updateMerchantActivity = updateMerchantActivity;
exports.deleteMerchantActivity = deleteMerchantActivity;
exports.publishMerchantActivity = publishMerchantActivity;
exports.pauseMerchantActivity = pauseMerchantActivity;
exports.finishMerchantActivity = finishMerchantActivity;
exports.copyMerchantActivity = copyMerchantActivity;
exports.fetchMerchantActivityProductCandidates = fetchMerchantActivityProductCandidates;
exports.fetchMerchantActivityStatistics = fetchMerchantActivityStatistics;
exports.fetchMerchantActivityDrafts = fetchMerchantActivityDrafts;
exports.createMerchantActivityDraft = createMerchantActivityDraft;
exports.publishMerchantActivityDraft = publishMerchantActivityDraft;
exports.deleteMerchantActivityDraft = deleteMerchantActivityDraft;
exports.fetchMerchantOrders = fetchMerchantOrders;
exports.fetchMerchantOrderDetail = fetchMerchantOrderDetail;
exports.acceptMerchantOrder = acceptMerchantOrder;
exports.shipMerchantOrder = shipMerchantOrder;
exports.fetchMerchantRefunds = fetchMerchantRefunds;
exports.fetchMerchantRefundDetail = fetchMerchantRefundDetail;
exports.processMerchantRefund = processMerchantRefund;
exports.fetchMerchantReviews = fetchMerchantReviews;
exports.replyMerchantReview = replyMerchantReview;
exports.fetchMerchantDeliverySettings = fetchMerchantDeliverySettings;
exports.updateMerchantDeliverySettings = updateMerchantDeliverySettings;
exports.fetchMerchantDeliveryTemplates = fetchMerchantDeliveryTemplates;
exports.createMerchantDeliveryTemplate = createMerchantDeliveryTemplate;
exports.updateMerchantDeliveryTemplate = updateMerchantDeliveryTemplate;
exports.deleteMerchantDeliveryTemplate = deleteMerchantDeliveryTemplate;
exports.fetchMerchantWallet = fetchMerchantWallet;
exports.fetchMerchantFinanceRecords = fetchMerchantFinanceRecords;
exports.fetchMerchantWithdraws = fetchMerchantWithdraws;
exports.createMerchantWithdraw = createMerchantWithdraw;
exports.fetchMerchantChats = fetchMerchantChats;
exports.fetchMerchantChatMessages = fetchMerchantChatMessages;
exports.sendMerchantChatMessage = sendMerchantChatMessage;
exports.markMerchantChatRead = markMerchantChatRead;
exports.fetchMerchantChatUnreadCount = fetchMerchantChatUnreadCount;
exports.fetchMerchantNotices = fetchMerchantNotices;
exports.markMerchantNoticeRead = markMerchantNoticeRead;
exports.markAllMerchantNoticesRead = markAllMerchantNoticesRead;
exports.fetchMerchantStatisticsOverview = fetchMerchantStatisticsOverview;
exports.fetchMerchantSecurity = fetchMerchantSecurity;
exports.updateMerchantSecurity = updateMerchantSecurity;
exports.deleteMerchantFile = deleteMerchantFile;
exports.fetchMerchantWorkbench = fetchMerchantWorkbench;
exports.fetchMerchantStatisticsTrend = fetchMerchantStatisticsTrend;
exports.fetchLogisticsCompanies = fetchLogisticsCompanies;
exports.fetchReviewSummary = fetchReviewSummary;
exports.fetchMerchantNoticeDetail = fetchMerchantNoticeDetail;
exports.updateMerchantProfile = updateMerchantProfile;
exports.fetchMerchantQualifications = fetchMerchantQualifications;
exports.uploadMerchantQualification = uploadMerchantQualification;
exports.deleteMerchantQualification = deleteMerchantQualification;
const request_1 = require("./request");
async function fetchMerchantProfile() { return (0, request_1.get)('/merchant/profile'); }
async function applyMerchant(payload) { return (0, request_1.post)('/merchant/apply', payload); }
async function fetchMerchantDashboard() { return (0, request_1.get)('/merchant/dashboard'); }
async function fetchMerchantProducts(query = {}) {
    return (0, request_1.get)('/merchant/products', query);
}
async function fetchMerchantProductDetail(productId) {
    return (0, request_1.get)(`/merchant/products/${productId}`);
}
async function createMerchantProduct(payload) {
    return (0, request_1.post)('/merchant/products', payload);
}
async function updateMerchantProduct(productId, payload) {
    return (0, request_1.request)({ url: `/merchant/products/${productId}`, method: 'PUT', data: payload });
}
async function updateMerchantProductStatus(productId, status) {
    return (0, request_1.request)({ url: `/merchant/products/${productId}/status`, method: 'PATCH', data: { status } });
}
// SKU 独立操作
async function fetchMerchantProductSkus(productId) {
    return (0, request_1.get)(`/merchant/products/${productId}/skus`);
}
async function updateMerchantSkuStock(skuId, stock) {
    return (0, request_1.request)({ url: `/merchant/skus/${skuId}/stock`, method: 'PATCH', data: { stock } });
}
async function updateMerchantSkuStatus(skuId, status) {
    return (0, request_1.post)(`/merchant/skus/${skuId}/status`, { status });
}
async function deleteMerchantSku(skuId) {
    return (0, request_1.post)(`/merchant/skus/${skuId}/delete`);
}
async function batchUpdateMerchantSkus(productId, payload) {
    return (0, request_1.post)(`/merchant/products/${productId}/skus/batch-update`, payload);
}
async function fetchMerchantProductDrafts() {
    return (0, request_1.get)('/merchant/products/drafts');
}
async function syncMerchantProductDraft(payload) {
    return (0, request_1.post)('/merchant/products/drafts', payload);
}
async function fetchMerchantProductDraft(draftId) {
    return (0, request_1.get)(`/merchant/products/drafts/${draftId}`);
}
async function updateMerchantProductDraft(draftId, payload) {
    return (0, request_1.post)(`/merchant/products/drafts/${draftId}`, payload);
}
async function deleteMerchantProductDraft(draftId) {
    return (0, request_1.post)(`/merchant/products/drafts/${draftId}/delete`);
}
async function publishMerchantProductDraft(draftId) {
    return (0, request_1.post)(`/merchant/products/drafts/${draftId}/publish`);
}
async function fetchMerchantActivities(query = {}) {
    return (0, request_1.get)('/merchant/activities', query);
}
async function fetchMerchantActivityDetail(activityId) {
    return (0, request_1.get)(`/merchant/activities/${activityId}`);
}
async function createMerchantActivity(payload) {
    return (0, request_1.post)('/merchant/activities', payload);
}
async function updateMerchantActivity(activityId, payload) {
    return (0, request_1.request)({ url: `/merchant/activities/${activityId}`, method: 'PATCH', data: payload });
}
async function deleteMerchantActivity(activityId) {
    return (0, request_1.request)({ url: `/merchant/activities/${activityId}`, method: 'DELETE' });
}
async function publishMerchantActivity(activityId) {
    return (0, request_1.post)(`/merchant/activities/${activityId}/publish`);
}
async function pauseMerchantActivity(activityId) {
    return (0, request_1.post)(`/merchant/activities/${activityId}/pause`);
}
async function finishMerchantActivity(activityId) {
    return (0, request_1.post)(`/merchant/activities/${activityId}/finish`);
}
async function copyMerchantActivity(activityId) {
    return (0, request_1.post)(`/merchant/activities/${activityId}/copy`);
}
async function fetchMerchantActivityProductCandidates(query = {}) {
    return (0, request_1.get)('/merchant/activities/product-candidates', query);
}
async function fetchMerchantActivityStatistics(activityId) {
    return (0, request_1.get)(`/merchant/activities/${activityId}/statistics`);
}
exports.fetchActivityProductCandidates = fetchMerchantActivityProductCandidates;
async function fetchMerchantActivityDrafts(query = {}) {
    return (0, request_1.get)('/merchant/activities/drafts', query);
}
async function createMerchantActivityDraft(payload) {
    return (0, request_1.post)('/merchant/activities/drafts', payload);
}
async function publishMerchantActivityDraft(draftId) {
    return (0, request_1.post)(`/merchant/activities/drafts/${draftId}/publish`);
}
async function deleteMerchantActivityDraft(draftId) {
    return (0, request_1.post)(`/merchant/activities/drafts/${draftId}/delete`);
}
async function fetchMerchantOrders(query = {}) {
    return (0, request_1.get)('/merchant/orders', query);
}
async function fetchMerchantOrderDetail(orderNo) {
    return (0, request_1.get)(`/merchant/orders/${orderNo}`);
}
async function acceptMerchantOrder(orderNo) {
    return (0, request_1.post)(`/merchant/orders/${orderNo}/accept`);
}
async function shipMerchantOrder(orderNo, payload = {}) {
    return (0, request_1.post)(`/merchant/orders/${orderNo}/ship`, payload);
}
async function fetchMerchantRefunds(query = {}) {
    return (0, request_1.get)('/merchant/refunds', query);
}
async function fetchMerchantRefundDetail(refundNo) {
    return (0, request_1.get)(`/merchant/refunds/${refundNo}`);
}
exports.fetchAfterSaleList = fetchMerchantRefunds;
exports.fetchAfterSaleDetail = fetchMerchantRefundDetail;
async function processMerchantRefund(refundNo, payload) {
    return (0, request_1.post)(`/merchant/refunds/${refundNo}/process`, payload);
}
async function fetchMerchantReviews(query = {}) {
    return (0, request_1.get)('/merchant/reviews', query);
}
async function replyMerchantReview(reviewId, contentOrPayload) {
    const body = typeof contentOrPayload === 'string' ? { content: contentOrPayload } : contentOrPayload;
    return (0, request_1.post)(`/merchant/reviews/${reviewId}/reply`, body);
}
exports.fetchReviewList = fetchMerchantReviews;
async function fetchMerchantDeliverySettings() {
    return (0, request_1.get)('/merchant/delivery/settings');
}
async function updateMerchantDeliverySettings(payload) {
    return (0, request_1.post)('/merchant/delivery/settings', payload);
}
exports.fetchDeliverySetting = fetchMerchantDeliverySettings;
exports.saveDeliverySetting = updateMerchantDeliverySettings;
async function fetchMerchantDeliveryTemplates() {
    return (0, request_1.get)('/merchant/delivery/templates');
}
async function createMerchantDeliveryTemplate(payload) {
    return (0, request_1.post)('/merchant/delivery/templates', payload);
}
exports.fetchFreightTemplates = fetchMerchantDeliveryTemplates;
exports.createFreightTemplate = createMerchantDeliveryTemplate;
async function updateMerchantDeliveryTemplate(templateId, payload) {
    return (0, request_1.request)({ url: `/merchant/delivery/templates/${templateId}`, method: 'PUT', data: payload });
}
async function deleteMerchantDeliveryTemplate(templateId) {
    return (0, request_1.request)({ url: `/merchant/delivery/templates/${templateId}`, method: 'DELETE' });
}
exports.deleteFreightTemplate = deleteMerchantDeliveryTemplate;
async function fetchMerchantWallet() { return (0, request_1.get)('/merchant/wallet'); }
async function fetchMerchantFinanceRecords(query = {}) {
    return (0, request_1.get)('/merchant/finance/records', query);
}
async function fetchMerchantWithdraws() {
    return (0, request_1.get)('/merchant/withdraws');
}
async function createMerchantWithdraw(payload) {
    return (0, request_1.post)('/merchant/withdraws', payload);
}
async function fetchMerchantChats() { return (0, request_1.get)('/merchant/chats'); }
async function fetchMerchantChatMessages(conversationId, query = {}) {
    return (0, request_1.get)(`/merchant/chats/${conversationId}/messages`, { page: query.page, pageSize: query.pageSize });
}
async function sendMerchantChatMessage(conversationId, payload) {
    return (0, request_1.post)(`/merchant/chats/${conversationId}/messages`, payload);
}
async function markMerchantChatRead(conversationId) {
    return (0, request_1.post)(`/merchant/chats/${conversationId}/read`, {});
}
async function fetchMerchantChatUnreadCount() {
    return (0, request_1.get)('/merchant/chats/unread-count');
}
async function fetchMerchantNotices(query = {}) {
    return (0, request_1.get)('/merchant/notices', query);
}
async function markMerchantNoticeRead(noticeId) {
    return (0, request_1.post)(`/merchant/notices/${noticeId}/read`);
}
async function markAllMerchantNoticesRead() {
    return (0, request_1.post)('/merchant/notices/read-all');
}
async function fetchMerchantStatisticsOverview(range = '7d') {
    return (0, request_1.get)(`/merchant/statistics/overview?range=${range}`);
}
async function fetchMerchantSecurity() {
    return (0, request_1.get)('/merchant/security');
}
async function updateMerchantSecurity(payload) {
    return (0, request_1.post)('/merchant/security', payload);
}
// ====== 文件 ======
async function deleteMerchantFile(fileUrl) {
    return (0, request_1.post)('/files/delete', { url: fileUrl });
}
// ====== 工作台 ======
async function fetchMerchantWorkbench() {
    return (0, request_1.get)('/merchant/workbench');
}
// ====== 统计趋势 ======
async function fetchMerchantStatisticsTrend(range = '7d') {
    return (0, request_1.get)('/merchant/statistics/trend', { range });
}
// ====== 物流公司 ======
async function fetchLogisticsCompanies() {
    return (0, request_1.get)('/merchant/logistics/companies');
}
async function fetchReviewSummary() {
    return (0, request_1.get)('/merchant/reviews/summary');
}
// ====== 通知详情 ======
async function fetchMerchantNoticeDetail(noticeId) {
    return (0, request_1.get)(`/merchant/notices/${noticeId}`);
}
// ====== 店铺资料编辑 ======
async function updateMerchantProfile(payload) {
    return (0, request_1.request)({ url: '/merchant/profile', method: 'PUT', data: payload });
}
// ====== 资质认证 ======
async function fetchMerchantQualifications() {
    return (0, request_1.get)('/merchant/qualifications');
}
async function uploadMerchantQualification(payload) {
    return (0, request_1.post)('/merchant/qualifications', payload);
}
async function deleteMerchantQualification(qualificationId) {
    return (0, request_1.post)(`/merchant/qualifications/${qualificationId}/delete`);
}
