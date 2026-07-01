import { get, post, request } from './request';
import type { AppPagedResult } from './app';

// ====== 商家资料 ======

export type MerchantQualification = {
  id: number; qualificationType: string; fileName: string; fileUrl: string;
  status: number; auditRemark: string;
};

export type MerchantProfile = {
  merchantId: number; storeName: string; storeLogo: string;
  contactName: string; contactMobile: string; status: string;
  productCount: number; orderCount: number;
  availableAmount: string; frozenAmount: string; totalIncome: string; totalWithdrawn: string;
  qualifications?: MerchantQualification[];
};

export async function fetchMerchantProfile() { return get<MerchantProfile>('/merchant/profile'); }

export async function applyMerchant(payload: any) { return post('/merchant/apply', payload); }

// ====== 首页 / 工作台 ======

export type MerchantDashboard = {
  shop: { name: string; status: string; location: string; desc: string };
  heroStats: Array<{ label: string; value: string }>;
  shortcuts: Array<{ key: string; label: string; route: string }>;
  todos: Array<{ key: string; title: string; value: string; desc: string; tone: string }>;
  orders: Array<{ key: string; no: string; status: string; buyer: string; goods: string; price: string }>;
  finance: { week: string; profit: string; note: string };
};

export type MerchantWorkbench = {
  shop: { merchantId: number; storeName: string; storeLogo: string; status: string };
  metrics: { payAmount: string; orderCount: number; visitorCount: number; conversionRate: string; refundCount: number };
  todos: { pendingAccept: number; pendingShip: number; pendingRefund: number; lowStock: number; draftProducts: number; draftActivities: number };
  trend: Array<{ date: string; payAmount: string; orderCount: number; visitorCount: number }>;
};

export async function fetchMerchantDashboard() { return get<MerchantDashboard>('/merchant/dashboard'); }

// ====== 商品 ======

export type MerchantProduct = {
  productId: number; skuId: number; title: string; subtitle: string; categoryName: string;
  status: string; auditStatus: string; price: string; stock: string; stockValue: number;
  coverUrl: string; updatedAt: string;
};

export type MerchantProductDetail = {
  productId: number; title: string; subtitle: string; coverUrl: string;
  detailDesc: string; originPlace: string; categoryId: number; categoryName: string;
  price: string; originalPrice: string; stock: number;
  skuName: string; skuImageUrl: string; specJson: Record<string, string>;
  images: string[]; videos: Array<{ videoUrl: string; coverUrl?: string }>;
  serviceTags: Array<{ key: string; title: string; desc: string; icon: string }>;
  traceCode: string; traceDesc: string;
};

export type MerchantProductSku = {
  skuId: number; skuName: string; skuCode: string; imageUrl: string;
  specJson: Record<string, string>; price: string; originalPrice: string;
  offlinePrice?: string | null; stock: number; lockedStock: number;
  safetyStock: number; status: 'ENABLED' | 'DISABLED';
};

export type ProductFilterParams = {
  page?: number; pageSize?: number; keyword?: string;
  status?: 'ON_SHELF' | 'OFF_SHELF' | 'DRAFT';
  auditStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  stockStatus?: 'LOW' | 'OUT' | 'NORMAL';
  categoryId?: number;
};

export async function fetchMerchantProducts(query: ProductFilterParams = {}) {
  return get<AppPagedResult<MerchantProduct>>('/merchant/products', query);
}

export async function fetchMerchantProductDetail(productId: number) {
  return get<MerchantProductDetail>(`/merchant/products/${productId}`);
}

export async function createMerchantProduct(payload: Record<string, any>) {
  return post('/merchant/products', payload);
}

export async function updateMerchantProduct(productId: number, payload: Record<string, any>) {
  return request({ url: `/merchant/products/${productId}`, method: 'PUT', data: payload });
}

export async function updateMerchantProductStatus(productId: number, status: 'ON_SHELF' | 'OFF_SHELF') {
  return request({ url: `/merchant/products/${productId}/status`, method: 'PATCH' as WechatMiniprogram.RequestOption['method'], data: { status } });
}

// SKU 独立操作
export async function fetchMerchantProductSkus(productId: number) {
  return get<MerchantProductSku[]>(`/merchant/products/${productId}/skus`);
}

export async function updateMerchantSkuStock(skuId: number, stock: number) {
  return request({ url: `/merchant/skus/${skuId}/stock`, method: 'PATCH' as WechatMiniprogram.RequestOption['method'], data: { stock } });
}

export async function updateMerchantSkuStatus(skuId: number, status: 'ENABLED' | 'DISABLED') {
  return post(`/merchant/skus/${skuId}/status`, { status });
}

export async function deleteMerchantSku(skuId: number) {
  return post(`/merchant/skus/${skuId}/delete`);
}

export async function batchUpdateMerchantSkus(productId: number, payload: {
  skuIds: number[]; price?: string; stock?: number; safetyStock?: number; status?: number;
}) {
  return post(`/merchant/products/${productId}/skus/batch-update`, payload);
}

// ====== 商品草稿箱 ======

export type ProductDraft = {
  id: number; draftNo: string; title: string; coverUrl: string;
  completeness: number; updatedAt: string;
};

export type ProductDraftDetail = {
  id: number; draftNo: string; title: string; coverUrl: string;
  payloadJson: Record<string, any>; updatedAt: string; createdAt: string;
};

export async function fetchMerchantProductDrafts(): Promise<ProductDraft[]> {
  return get<ProductDraft[]>('/merchant/products/drafts');
}

export async function syncMerchantProductDraft(payload: Record<string, any>): Promise<{ draftId: string }> {
  return post<{ draftId: string }>('/merchant/products/drafts', payload);
}

export async function fetchMerchantProductDraft(draftId: string): Promise<ProductDraftDetail | null> {
  return get<ProductDraftDetail | null>(`/merchant/products/drafts/${draftId}`);
}

export async function updateMerchantProductDraft(draftId: string, payload: Record<string, any>) {
  return post(`/merchant/products/drafts/${draftId}`, payload);
}

export async function deleteMerchantProductDraft(draftId: string) {
  return post(`/merchant/products/drafts/${draftId}/delete`);
}

export async function publishMerchantProductDraft(draftId: string) {
  return post(`/merchant/products/drafts/${draftId}/publish`);
}

// ====== 活动 ======

export type MerchantActivity = {
  activityId: number; id?: number; title: string;
  activityType: 'SECKILL' | 'GROUP_BUY' | 'CASHBACK' | 'PRESALE';
  type?: string;
  activityTypeLabel: string; status: string; statusLabel: string;
  startAt: string; endAt: string; productCount: number;
  orderCount: number; payAmount: string; coverUrl?: string;
  coupon?: { thresholdAmount: string; discountAmount: string; stock: number } | null;
};

export type ActivityFilterParams = {
  page?: number; pageSize?: number; keyword?: string;
  activityType?: 'SECKILL' | 'GROUP_BUY' | 'CASHBACK' | 'PRESALE';
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ENDED';
};

export type ActivityProductItem = {
  id: number; productId: number; skuId?: number;
  title: string; coverUrl: string; skuName?: string;
  originalPrice: string; activityPrice?: string;
  activityStock?: number; soldCount?: number; limitPerUser?: number;
};

export type ActivityRule =
  | { type: 'SECKILL'; startAt: string; endAt: string; limitPerUser: number; stockMode: 'ACTIVITY_STOCK' | 'SKU_STOCK'; warningStock: number; timeSlot?: string }
  | { type: 'GROUP_BUY'; needed: number; expireHours: number; startAt: string; endAt: string; limitPerUser: number; formationMode?: string; allowShare?: boolean }
  | { type: 'CASHBACK'; thresholdAmount: string; discountAmount: string; couponStock: number; perUserLimit: number; startAt: string; endAt: string; validityDays?: number; scope?: string }
  | { type: 'PRESALE'; depositAmount: string; finalPaymentStartAt: string; finalPaymentEndAt: string; deliveryStartAt: string; limitPerUser: number };

export type ActivityDetail = {
  activityId: number; title: string; activityType: string; status: string;
  startAt: string; endAt: string; ruleJson: ActivityRule; products: ActivityProductItem[];
};

export type ActivityStatistics = {
  activityId: number; viewCount: number; orderCount: number; buyerCount: number;
  payAmount: string; conversionRate: string; remainStock: number;
  products: Array<{ productId: number; title: string; coverUrl: string; viewCount: number; orderCount: number; payAmount: string; conversion: string }>;
  trend: Array<{ date: string; viewCount: number; orderCount: number; payAmount: string }>;
};

export type ActivityProductCandidate = {
  productId: number; title: string; coverUrl: string; categoryName: string;
  totalStock: number; minPrice: string; maxPrice: string;
  skus: Array<{ skuId: number; skuName: string; price: string; stock: number }>;
};

export async function fetchMerchantActivities(query: ActivityFilterParams = {}) {
  return get<AppPagedResult<MerchantActivity>>('/merchant/activities', query);
}

export async function fetchMerchantActivityDetail(activityId: number) {
  return get<ActivityDetail>(`/merchant/activities/${activityId}`);
}

export async function createMerchantActivity(payload: Record<string, any>) {
  return post('/merchant/activities', payload);
}

export async function updateMerchantActivity(activityId: number, payload: Record<string, any>) {
  return request({ url: `/merchant/activities/${activityId}`, method: 'PATCH' as WechatMiniprogram.RequestOption['method'], data: payload });
}

export async function deleteMerchantActivity(activityId: number) {
  return request({ url: `/merchant/activities/${activityId}`, method: 'DELETE' });
}

export async function publishMerchantActivity(activityId: number) {
  return post(`/merchant/activities/${activityId}/publish`);
}

export async function pauseMerchantActivity(activityId: number) {
  return post(`/merchant/activities/${activityId}/pause`);
}

export async function finishMerchantActivity(activityId: number) {
  return post(`/merchant/activities/${activityId}/finish`);
}

export async function copyMerchantActivity(activityId: number) {
  return post(`/merchant/activities/${activityId}/copy`);
}

export async function fetchMerchantActivityProductCandidates(query: {
  keyword?: string; categoryId?: number; page?: number; pageSize?: number;
} = {}) {
  return get<AppPagedResult<ActivityProductCandidate>>('/merchant/activities/product-candidates', query);
}

export async function fetchMerchantActivityStatistics(activityId: number) {
  return get<ActivityStatistics>(`/merchant/activities/${activityId}/statistics`);
}

export const fetchActivityProductCandidates = fetchMerchantActivityProductCandidates;

// ====== 活动草稿箱 ======

export type ActivityDraft = {
  id: number; draftNo: string; title: string; activityType: string;
  missingFields: string[]; updatedAt: string;
};

export async function fetchMerchantActivityDrafts(query: {
  keyword?: string; status?: string; page?: number; pageSize?: number;
} = {}) {
  return get<AppPagedResult<ActivityDraft>>('/merchant/activities/drafts', query);
}

export async function createMerchantActivityDraft(payload: Record<string, any>) {
  return post('/merchant/activities/drafts', payload);
}

export async function publishMerchantActivityDraft(draftId: string) {
  return post(`/merchant/activities/drafts/${draftId}/publish`);
}

export async function deleteMerchantActivityDraft(draftId: string) {
  return post(`/merchant/activities/drafts/${draftId}/delete`);
}

// ====== 订单 ======

export type MerchantOrder = {
  orderNo: string; userName: string; userAvatar: string; userMobile: string;
  status: string; orderStatus?: number; payStatus: number; deliveryStatus: number; refundStatus?: number;
  totalAmount: string; payAmount: string;
  itemPreview: Array<{ title: string; coverUrl: string; quantity: number }>;
  items?: Array<{ orderItemId: number; productId: number; skuId: number; title: string; skuName: string; price: string; quantity: number; subtotal: string; coverUrl: string }>;
  refundStatusLabel?: string | null; canAccept: boolean; canShip: boolean; createdAt: string;
};

export type MerchantOrderDetail = {
  orderNo: string; userName: string; userMobile: string; userAvatar: string;
  status: string; orderStatus?: number; refundStatus?: number; payStatus: number; deliveryStatus: number;
  totalAmount: string; freightAmount: string; discountAmount: string; payAmount: string;
  addressSnapshot: {
    name?: string; mobile?: string; receiverName?: string; receiverMobile?: string;
    province: string; city: string; district: string;
    detail?: string; detailAddress?: string;
  } | null;
  remark: string; cancelReason: string | null;
  createdAt: string; paidAt: string | null; completedAt: string | null;
  items: Array<{ orderItemId: number; productId: number; skuId: number;
    title: string; skuName: string; price: string; quantity: number; subtotal: string; coverUrl: string }>;
  logisticsCompany: string; trackingNo: string;
  refund?: { refundNo: string; applyType: number; applyReason: string; applyImages: any;
    refundAmount: string; status: number; merchantRemark: string | null;
    processedAt: string | null; createdAt: string } | null;
};

export type OrderFilterParams = {
  page?: number; pageSize?: number; keyword?: string; status?: string;
};

export async function fetchMerchantOrders(query: OrderFilterParams = {}) {
  return get<AppPagedResult<MerchantOrder>>('/merchant/orders', query);
}

export async function fetchMerchantOrderDetail(orderNo: string) {
  return get<MerchantOrderDetail>(`/merchant/orders/${orderNo}`);
}

export async function acceptMerchantOrder(orderNo: string) {
  return post(`/merchant/orders/${orderNo}/accept`);
}

export async function shipMerchantOrder(orderNo: string, payload: { trackingNo?: string; logisticsCompany?: string } = {}) {
  return post(`/merchant/orders/${orderNo}/ship`, payload);
}

// ====== 售后 / 退款 ======

export type MerchantRefund = {
  refundNo: string; orderNo: string;
  buyer: { userId: number; nickname: string; avatarUrl: string; mobile: string };
  item: { productId: number; skuId: number; title: string; skuName: string;
    coverUrl: string; quantity: number; price: string };
  applyType: number; applyReason: string; applyImages: string[];
  refundAmount: string; status: number; statusLabel: string;
  merchantRemark?: string; createdAt: string; processedAt?: string;
};

export async function fetchMerchantRefunds(query: {
  page?: number; pageSize?: number; keyword?: string; status?: number; applyType?: number;
} = {}) {
  return get<AppPagedResult<MerchantRefund>>('/merchant/refunds', query);
}

export async function fetchMerchantRefundDetail(refundNo: string) {
  return get<MerchantRefund>(`/merchant/refunds/${refundNo}`);
}

export type AfterSaleItem = MerchantRefund;
export type AfterSaleDetail = MerchantRefund & {
  applyTypeLabel?: string;
  timeline?: Array<{ title: string; desc: string }>;
};
export const fetchAfterSaleList = fetchMerchantRefunds;
export const fetchAfterSaleDetail = fetchMerchantRefundDetail;

export async function processMerchantRefund(refundNo: string, payload: {
  action: 'approve' | 'reject'; remark?: string; merchantRemark?: string;
}) {
  return post(`/merchant/refunds/${refundNo}/process`, payload);
}

// ====== 评价 ======

export type MerchantReview = {
  id: number; orderNo: string;
  buyer: { userId: number; nickname: string; avatarUrl: string };
  product: { productId: number; title: string; coverUrl: string; skuName: string };
  rating: number; content: string; images: string[];
  replyContent: string | null; repliedAt: string | null; createdAt: string;
};

export async function fetchMerchantReviews(query: {
  page?: number; pageSize?: number; rating?: number; hasReply?: boolean;
} = {}) {
  return get<AppPagedResult<MerchantReview>>('/merchant/reviews', query);
}

export async function replyMerchantReview(reviewId: number, contentOrPayload: string | { content?: string; replyContent?: string }) {
  const body = typeof contentOrPayload === 'string' ? { content: contentOrPayload } : contentOrPayload;
  return post(`/merchant/reviews/${reviewId}/reply`, body);
}

export type ReviewItem = MerchantReview;
export const fetchReviewList = fetchMerchantReviews;

// ====== 配送设置 ======

export type MerchantDeliverySetting = {
  senderName: string; senderMobile: string; senderAddress: string;
  defaultCompany: string; coldChainEnabled: boolean; restrictedRegions: string[];
  shipRemindEnabled?: boolean;
  preferredCompanies?: string[];
  areaScope?: string;
};

export type MerchantFreightTemplate = {
  id: number; name: string; province: string;
  thresholdAmount: string; freightAmount: string; active: boolean;
};

export async function fetchMerchantDeliverySettings() {
  return get<MerchantDeliverySetting>('/merchant/delivery/settings');
}

export async function updateMerchantDeliverySettings(payload: Partial<MerchantDeliverySetting>) {
  return post('/merchant/delivery/settings', payload);
}

export const fetchDeliverySetting = fetchMerchantDeliverySettings;
export const saveDeliverySetting = updateMerchantDeliverySettings;

export async function fetchMerchantDeliveryTemplates() {
  return get<MerchantFreightTemplate[]>('/merchant/delivery/templates');
}

export async function createMerchantDeliveryTemplate(payload: Omit<MerchantFreightTemplate, 'id'>) {
  return post('/merchant/delivery/templates', payload);
}

export const fetchFreightTemplates = fetchMerchantDeliveryTemplates;
export const createFreightTemplate = createMerchantDeliveryTemplate;

export async function updateMerchantDeliveryTemplate(templateId: number, payload: Partial<MerchantFreightTemplate>) {
  return request({ url: `/merchant/delivery/templates/${templateId}`, method: 'PUT', data: payload });
}

export async function deleteMerchantDeliveryTemplate(templateId: number) {
  return request({ url: `/merchant/delivery/templates/${templateId}`, method: 'DELETE' });
}

export const deleteFreightTemplate = deleteMerchantDeliveryTemplate;

// ====== 财务 / 钱包 ======

export type MerchantWallet = {
  availableAmount: string; frozenAmount: string; totalIncome: string; totalWithdrawn: string;
};

export type MerchantWithdrawRecord = {
  withdrawNo: string; applyNo?: string; amount: string; fee: string;
  status: string; statusLabel: string; accountInfo: string; remark: string; createdAt: string;
};

export type FinanceRecord = {
  id: string; title: string; desc: string; amount: string;
  tone: 'green' | 'warn' | 'blue' | 'danger'; type: string; createdAt: string;
};

export async function fetchMerchantWallet() { return get<MerchantWallet>('/merchant/wallet'); }

export async function fetchMerchantFinanceRecords(query: {
  page?: number; pageSize?: number; type?: string;
} = {}) {
  return get<FinanceRecord[]>('/merchant/finance/records', query);
}

export async function fetchMerchantWithdraws() {
  return get<MerchantWithdrawRecord[]>('/merchant/withdraws');
}

export async function createMerchantWithdraw(payload: {
  amount: string; account?: string; accountName?: string; accountType?: string; accountNo?: string; remark?: string;
}) {
  return post('/merchant/withdraws', payload);
}

// ====== 聊天 ======

export type MerchantChatConversation = {
  conversationId: number; conversationKey: string; merchantId: number;
  merchantName: string; merchantLogo: string;
  buyerId: number; buyerName: string; buyerAvatar: string;
  orderNo: string; productId: number | null; productTitle: string;
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';
  sceneLabel: string; sceneSource: string;
  lastMessageId: number | null; lastMessageContent: string;
  lastMessageType: 'TEXT' | 'IMAGE'; lastMessageAt: string;
  unreadCount: number; isMine: boolean;
};

export type MerchantChatMessage = {
  messageId: number; conversationId: number; senderId: number; receiverId: number;
  senderRole: string; contentType: 'TEXT' | 'IMAGE'; content: string;
  attachments: Record<string, unknown> | null;
  readAt: string; createdAt: string; isMine: boolean;
};

export async function fetchMerchantChats() { return get<MerchantChatConversation[]>('/merchant/chats'); }

export async function fetchMerchantChatMessages(conversationId: number, query: {
  page?: number; pageSize?: number;
} = {}) {
  return get<{ conversationId: number; page: number; pageSize: number; total: number; items: MerchantChatMessage[] }>(
    `/merchant/chats/${conversationId}/messages`, { page: query.page, pageSize: query.pageSize },
  );
}

export async function sendMerchantChatMessage(conversationId: number, payload: {
  content: string; contentType?: 'TEXT' | 'IMAGE'; attachments?: Record<string, unknown>;
}) {
  return post<MerchantChatMessage>(`/merchant/chats/${conversationId}/messages`, payload);
}

export async function markMerchantChatRead(conversationId: number) {
  return post<{ conversationId: number; updatedCount: number; readAt: string }>(
    `/merchant/chats/${conversationId}/read`, {},
  );
}

export async function fetchMerchantChatUnreadCount() {
  return get<{ unreadCount: number }>('/merchant/chats/unread-count');
}

// ====== 通知 ======

export type MerchantNotice = {
  id: number; noticeId?: number; type: 'ORDER' | 'REFUND' | 'ACTIVITY' | 'AUDIT' | 'SYSTEM';
  typeLabel: string; title: string; content: string;
  read: boolean; isRead?: boolean; summary?: string; orderNo?: string; createdAt: string;
};

export async function fetchMerchantNotices(query: {
  page?: number; pageSize?: number; type?: string;
} = {}) {
  return get<AppPagedResult<MerchantNotice>>('/merchant/notices', query);
}

export async function markMerchantNoticeRead(noticeId: number) {
  return post(`/merchant/notices/${noticeId}/read`);
}

export async function markAllMerchantNoticesRead() {
  return post('/merchant/notices/read-all');
}

// ====== 统计 ======

export type MerchantStatisticsOverview = {
  payAmount: string; orderCount: number; visitorCount: number;
  conversionRate: string; refundRate: string;
  trend: Array<{ date: string; payAmount: string; orderCount: number; visitorCount: number }>;
  topProducts: Array<{ productId: number; title: string; coverUrl: string; orderCount: number; payAmount: string }>;
};

export async function fetchMerchantStatisticsOverview(range: 'today' | '7d' | '30d' = '7d') {
  return get<MerchantStatisticsOverview>(`/merchant/statistics/overview?range=${range}`);
}

// ====== 店铺安全 ======

export type MerchantSecurity = {
  contactMobile: string;
  bindWechat: boolean;
  lastLoginAt: string;
  loginProtect?: boolean;
  withdrawConfirm?: boolean;
  lastLoginDevice?: string;
};

export async function fetchMerchantSecurity() {
  return get<MerchantSecurity>('/merchant/security');
}

export async function updateMerchantSecurity(payload: Partial<MerchantSecurity>) {
  return post('/merchant/security', payload);
}

// ====== 文件 ======

export async function deleteMerchantFile(fileUrl: string) {
  return post('/files/delete', { url: fileUrl });
}

// ====== 工作台 ======
export async function fetchMerchantWorkbench() {
  return get<MerchantWorkbench>('/merchant/workbench');
}

// ====== 统计趋势 ======
export async function fetchMerchantStatisticsTrend(range: '7d' | '30d' = '7d') {
  return get<Array<{ date: string; payAmount: string; orderCount: number; visitorCount: number }>>('/merchant/statistics/trend', { range });
}

// ====== 物流公司 ======
export async function fetchLogisticsCompanies() {
  return get<Array<{ code: string; name: string }>>('/merchant/logistics/companies');
}

// ====== 评价汇总 ======
export type ReviewSummary = { shopScore: string; goodRate: string; pendingReply: number; total: number; goodCount: number; normalCount: number; badCount: number };

export async function fetchReviewSummary() {
  return get<ReviewSummary>('/merchant/reviews/summary');
}

// ====== 通知详情 ======
export async function fetchMerchantNoticeDetail(noticeId: number) {
  return get<MerchantNotice | null>(`/merchant/notices/${noticeId}`);
}

// ====== 店铺资料编辑 ======
export async function updateMerchantProfile(payload: {
  storeName?: string; storeLogo?: string; contactName?: string; contactMobile?: string; description?: string;
}) {
  return request({ url: '/merchant/profile', method: 'PUT', data: payload });
}

// ====== 资质认证 ======
export async function fetchMerchantQualifications(): Promise<MerchantQualification[]> {
  return get<MerchantQualification[]>('/merchant/qualifications');
}
export async function uploadMerchantQualification(payload: {
  qualificationType: string; fileName: string; fileUrl: string;
}) {
  return post('/merchant/qualifications', payload);
}
export async function deleteMerchantQualification(qualificationId: number) {
  return post(`/merchant/qualifications/${qualificationId}/delete`);
}
