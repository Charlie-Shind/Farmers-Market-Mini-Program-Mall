import { sha256Hex } from '@/utils/crypto';

type QueryValue = string | number | boolean | null | undefined;

type QueryParams = Record<string, QueryValue>;

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type PageResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};

type DashboardOverview = {
  salesAmount: string;
  orderCount: number;
  userCount: number;
  merchantCount: number;
  scoped?: boolean;
};

type DashboardSale = {
  date: string;
  salesAmount: string;
  orderCount: number;
};

type HotProduct = {
  id: number;
  title: string;
  salesCount: number;
  coverUrl?: string;
};

type OriginSale = {
  originPlace: string;
  salesAmount: string;
  orderCount: number;
};

type AdminUserRow = {
  id: number;
  nickname: string;
  mobile: string;
  status: string;
  points: number;
  orderCount: number;
  lastLoginAt: string;
};

type AdminMerchantRow = {
  id: number;
  storeName: string;
  contactName: string;
  mobile: string;
  region: string;
  auditStatus: string;
  productCount: number;
  walletAmount: string;
  createdAt: string;
};

type AdminProductRow = {
  id: number;
  title: string;
  merchantName: string;
  categoryName: string;
  auditStatus: string;
  auditRemark?: string;
  status: string;
  minPrice: string;
  salesCount: number;
  updatedAt: string;
  originPlace?: string;
  productNature?: string;
  deliveryType?: number;
  isPreSale?: boolean;
  groupBuyConfig?: {
    enabled: boolean;
    needed: number;
    expireHours: number;
    discountRate: number;
  } | null;
};

type AdminActivityRow = {
  id: number;
  activityName: string;
  activityType: string;
  status: string;
  startAt: string;
  endAt: string;
  productCount: number;
};

type AdminOrderRow = {
  orderNo: string;
  userName: string;
  merchantName: string;
  status: string;
  payStatus: number;
  deliveryStatus: number;
  afterSaleStatus?: number;
  totalAmount: string;
  freightAmount: string;
  discountAmount: string;
  payAmount: string;
};

type AdminOrderDetailRow = AdminOrderRow & {
  remark?: string;
  addressSnapshot?: any;
  logisticsCompany?: string;
  trackingNo?: string;
  shippedAt?: string | null;
  canShip?: boolean;
  items: Array<{
    orderItemId: number;
    productId: number;
    skuId: number;
    title: string;
    skuName: string;
    price: string;
    quantity: number;
    subtotal: string;
    coverUrl: string;
  }>;
};

type AdminRefundRow = {
  refundNo: string;
  orderNo: string;
  userName: string;
  merchantName: string;
  amount: string;
  status: string;
  createdAt: string;
};

type LogisticsRuleRow = {
  id: number;
  name: string;
  province: string;
  thresholdAmount: string;
  freightAmount: string;
  active: boolean;
};

type AdminLogRow = {
  id: number;
  operator: string;
  operatorAccount: string;
  module: string;
  action: string;
  createdAt: string;
  riskLevel: string;
};

type AdminAccountRow = {
  id: number;
  accountNo: string;
  username: string;
  nickname: string;
  mobile: string;
  loginPassword?: string;
  merchantId?: number | null;
  accountType?: 'PLATFORM' | 'MERCHANT';
  status: 'NORMAL' | 'DISABLED';
  lastLoginAt: string;
  roleCodes: string[];
  roleNames: string[];
};

type AdminRoleRow = {
  id: number;
  code: string;
  name: string;
  status: 'NORMAL' | 'DISABLED';
  userCount: number;
  permissionKeys: string[];
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

type AdminCouponRow = {
  id: number;
  name: string;
  type: string;
  thresholdAmount: string;
  discountAmount: string;
  stock: number;
  issuedStock: number;
  remainingStock: number;
  receivedCount: number;
  usedCount: number;
  expiredCount: number;
  validStartAt: string;
  validEndAt: string;
  scope: string;
  perUserLimit: number;
  status: string;
  isActive: boolean;
  ruleJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type BannerItem = {
  id: number;
  title: string;
  imageUrl: string;
  linkType: string;
  linkId: number | null;
  sortOrder: number;
  status: string;
};

type CatalogCategory = {
  id: number;
  name: string;
  iconUrl: string;
  sortOrder: number;
  children?: CatalogCategory[];
};

type SystemSettings = {
  siteName: string;
  adminCount: number;
  permissionNodeCount: number;
  operationLogCount: number;
  systemEntryCount: number;
  customerServiceHotline: string;
  platformOfficialMerchantName: string;
  platformSupportMerchantId: string;
  auditMode: string;
  pointsRedeemEnabled?: boolean;
  pointsEarnRate?: string;
  pointsRedeemRate?: string;
  items?: Array<{ key: string; value: string }>;
};

type SupportTarget = {
  merchantId: number;
  merchantName: string;
  merchantLogo: string;
  hotline: string;
  source: 'CONFIGURED' | 'FALLBACK';
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';
  sceneLabel: string;
  sceneSource: string;
};

type AdminChatConversation = {
  conversationId: number;
  conversationKey: string;
  merchantId: number;
  merchantName: string;
  merchantLogo: string;
  buyerId: number;
  buyerName: string;
  buyerAvatar: string;
  orderNo: string;
  productId: number | null;
  productTitle: string;
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';
  sceneLabel: string;
  sceneSource: string;
  lastMessageId: number | null;
  lastMessageContent: string;
  lastMessageType: 'TEXT' | 'IMAGE';
  lastMessageAt: string;
  unreadCount: number;
  isMine: boolean;
};

type AdminChatMessage = {
  messageId: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  senderRole: string;
  contentType: 'TEXT' | 'IMAGE';
  content: string;
  attachments: Record<string, unknown> | null;
  readAt: string;
  createdAt: string;
  isMine: boolean;
};

type WithdrawRow = {
  withdrawNo: string;
  merchantName: string;
  amount: string;
  fee: string;
  status: string;
  auditedBy: string;
  auditedAt: string;
  remark: string;
  createdAt: string;
};

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) || '/api/admin';
const adminBase = (import.meta.env.VITE_ADMIN_BASE as string | undefined) || '/admin';
const adminStorageKeys = [
  'farm-admin-token',
  'farm-admin-role',
  'farm-admin-role-codes',
  'farm-admin-role-names',
  'farm-admin-permissions',
  'farm-admin-name',
  'farm-admin-account',
  'farm-admin-account-type',
  'farm-admin-merchant-id',
] as const;

function clearAdminSession() {
  for (const key of adminStorageKeys) {
    localStorage.removeItem(key);
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  const { pathname, search, hash } = window.location;
  const relativePath = pathname.startsWith(adminBase) ? pathname.slice(adminBase.length) || '/' : pathname || '/';
  const currentPath = `${relativePath}${search}${hash}`;

  if (relativePath === '/login') {
    return;
  }

  const target = `${adminBase}/login?redirect=${encodeURIComponent(currentPath)}`;
  window.location.replace(target);
}

function buildQueryString(params: QueryParams = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthRequest = path === '/auth/login' || path === '/auth/captcha';
  const token = isAuthRequest ? '' : (localStorage.getItem('farm-admin-token') ?? '');
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      clearAdminSession();
      redirectToLogin();
    }

    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  if (payload && payload.success === false) {
    throw new Error(payload.message ?? 'Request failed');
  }

  return (payload?.data ?? payload ?? null) as T;
}

export async function fetchLoginCaptcha() {
  return request<{
    captchaId: string;
    image: string;
    expiresIn: number;
  }>('/auth/captcha', {
    method: 'GET',
  });
}

export async function login(
  username: string,
  password: string,
  captchaId: string,
  captchaCode: string,
) {
  const passwordHash = await sha256Hex(password);
  const data = await request<{
    accessToken: string;
    role: string;
    roleCodes: string[];
    roleNames: string[];
    permissionKeys: string[];
    accountNo: string;
    merchantId?: number | null;
    accountType?: 'PLATFORM' | 'MERCHANT';
    nickname?: string;
    username?: string;
    mobile?: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password: passwordHash,
      passwordHashed: true,
      captchaId,
      captchaCode,
    }),
  });

  localStorage.setItem('farm-admin-token', data.accessToken);
  localStorage.setItem('farm-admin-role', data.role || data.roleNames?.[0] || data.roleCodes?.[0] || '平台管理员');
  localStorage.setItem('farm-admin-role-codes', JSON.stringify(data.roleCodes ?? []));
  localStorage.setItem('farm-admin-role-names', JSON.stringify(data.roleNames ?? []));
  localStorage.setItem('farm-admin-permissions', JSON.stringify(data.permissionKeys ?? []));
  localStorage.setItem('farm-admin-account-type', data.accountType ?? 'PLATFORM');
  if (data.merchantId != null) {
    localStorage.setItem('farm-admin-merchant-id', String(data.merchantId));
  } else {
    localStorage.removeItem('farm-admin-merchant-id');
  }

  return data;
}

export function logout() {
  clearAdminSession();
}

export async function getDashboardOverview(periodDays?: number) {
  const qs = periodDays ? `?periodDays=${periodDays}` : '';
  return request<DashboardOverview>(`/dashboard/overview${qs}`);
}

export async function getDashboardSales(periodDays?: number) {
  const qs = periodDays ? `?periodDays=${periodDays}` : '';
  return request<DashboardSale[]>(`/dashboard/sales${qs}`);
}

export async function getHotProducts() {
  return request<HotProduct[]>('/dashboard/hot-products');
}

export async function getOriginSales() {
  return request<OriginSale[]>('/dashboard/origin-sales');
}

export async function getUsers(query: QueryParams = {}) {
  return request<PageResponse<AdminUserRow>>(
    `/users${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
      userType: query.userType,
    })}`,
  );
}

export async function getMerchants(query: QueryParams = {}) {
  return request<PageResponse<AdminMerchantRow>>(
    `/merchants${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
    })}`,
  );
}

export async function getProducts(query: QueryParams = {}) {
  return request<PageResponse<AdminProductRow>>(
    `/products${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      auditStatus: query.auditStatus,
      status: query.status,
      productNature: query.productNature,
      deliveryType: query.deliveryType,
    })}`,
  );
}

export async function getCoupons(query: QueryParams = {}) {
  return request<PageResponse<AdminCouponRow>>(
    `/coupons${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
      type: query.type,
    })}`,
  );
}

export async function getExchangeCoupons(query: QueryParams = {}) {
  return request<PageResponse<AdminCouponRow>>(
    `/exchange-items${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
      type: query.type,
    })}`,
  );
}

export async function createExchangeCoupon(payload: Record<string, unknown>) {
  return request<AdminCouponRow>('/exchange-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateExchangeCoupon(couponId: number, payload: Record<string, unknown>) {
  return request<AdminCouponRow>(`/exchange-items/${couponId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateExchangeCouponStatus(couponId: number, status: string) {
  return request<AdminCouponRow>(`/exchange-items/${couponId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteExchangeCoupon(couponId: number) {
  return request<{ success: boolean; id: number }>(`/exchange-items/${couponId}`, {
    method: 'DELETE',
  });
}

export async function createCoupon(payload: Record<string, unknown>) {
  return request<AdminCouponRow>('/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCoupon(couponId: number, payload: Record<string, unknown>) {
  return request<AdminCouponRow>(`/coupons/${couponId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateCouponStatus(couponId: number, status: string) {
  return request<AdminCouponRow>(`/coupons/${couponId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteCoupon(couponId: number) {
  return request<{ success: boolean; id: number }>(`/coupons/${couponId}`, {
    method: 'DELETE',
  });
}

export async function issueCoupon(couponId: number, userId: number) {
  return request<{ success: boolean; couponId: number; userId: number; alreadyIssued: boolean }>(`/coupons/${couponId}/issue`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function adjustAdminUserPoints(payload: { userId: number; points: number; remark?: string }) {
  return request<{
    userId: number;
    nickname: string;
    mobile: string;
    points: number;
    balance: number;
    remark: string;
  }>('/points/adjust', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getActivities(query: QueryParams = {}) {
  return request<AdminActivityRow[]>(
    `/activities${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
    })}`,
  );
}

export async function getOrders(query: QueryParams = {}) {
  return request<PageResponse<AdminOrderRow>>(
    `/orders${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
      payStatus: query.payStatus,
      deliveryStatus: query.deliveryStatus,
    })}`,
  );
}

export type AdminGroupBuyRow = {
  groupId: number;
  groupNo: string;
  inviteCode: string | null;
  status: 'OPEN' | 'COMPLETED' | 'FAILED';
  productTitle: string;
  coverUrl: string;
  initiatorName: string;
  needed: number;
  memberCount: number;
  groupPrice: string;
  originPrice: string;
  expireAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type AdminGroupBuyListResponse = PageResponse<AdminGroupBuyRow> & {
  stats: { OPEN: number; COMPLETED: number; FAILED: number };
};

export async function getGroupBuys(query: QueryParams = {}) {
  return request<AdminGroupBuyListResponse>(
    `/group-buys${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getOrderDetail(orderNo: string) {
  return request<AdminOrderDetailRow>(`/orders/${orderNo}`);
}

export async function shipOrder(
  orderNo: string,
  body: { trackingNo: string; logisticsCompany?: string },
) {
  return request<{
    orderNo: string;
    trackingNo: string;
    logisticsCompany: string;
    deliveryStatus: number;
    status: string;
  }>(`/orders/${orderNo}/ship`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getRefunds(query: QueryParams = {}) {
  return request<PageResponse<AdminRefundRow>>(
    `/refunds${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getLogisticsRules(query: QueryParams = {}) {
  return request<LogisticsRuleRow[]>(
    `/logistics${buildQueryString({
      keyword: query.keyword,
    })}`,
  );
}

export async function getSettings() {
  return request<SystemSettings>('/settings');
}

export async function getChatSupportTarget() {
  return request<SupportTarget>('/chat/support-target');
}

export async function getChatConversations(query: QueryParams = {}) {
  return request<PageResponse<AdminChatConversation>>(
    `/chat/conversations${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      sceneType: query.sceneType,
      merchantId: query.merchantId,
    })}`,
  );
}

export async function getChatConversation(conversationId: number) {
  return request<AdminChatConversation>(`/chat/conversations/${conversationId}`);
}

export async function getChatConversationMessages(conversationId: number, query: QueryParams = {}) {
  return request<PageResponse<AdminChatMessage>>(
    `/chat/conversations/${conversationId}/messages${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    })}`,
  );
}

export async function sendChatConversationMessage(
  conversationId: number,
  payload: {
    content: string;
    contentType?: 'TEXT' | 'IMAGE';
    attachments?: Record<string, unknown> | null;
  },
) {
  return request<AdminChatMessage>(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveSettings(payload: QueryParams | Array<{ key: string; value: string }>) {
  return request<SystemSettings>('/settings', {
    method: 'POST',
    body: JSON.stringify(Array.isArray(payload) ? { settings: payload } : payload),
  });
}

export async function getLogs(query: QueryParams = {}) {
  return request<PageResponse<AdminLogRow>>(
    `/logs${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      action: query.action,
      module: query.module,
    })}`,
  );
}

export async function getWithdraws(query: QueryParams = {}) {
  return request<PageResponse<WithdrawRow>>(
    `/withdraws${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getBanners() {
  return request<BannerItem[]>('/banners');
}

export type AdminCategoryRow = {
  id: number;
  parentId: number | null;
  parentName: string;
  name: string;
  iconUrl: string;
  sortOrder: number;
  status: number;
  productCount: number;
  isTag: boolean;
};

export async function getAdminCategories() {
  return request<AdminCategoryRow[]>('/categories');
}

export async function createCategory(payload: {
  name: string;
  parentId?: number | null;
  iconUrl?: string;
  sortOrder?: number;
  status?: number;
}) {
  return request<AdminCategoryRow>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(
  categoryId: number,
  payload: Partial<{
    name: string;
    parentId: number | null;
    iconUrl: string;
    sortOrder: number;
    status: number;
  }>,
) {
  return request<AdminCategoryRow>(`/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(categoryId: number) {
  return request<{ id: number; deleted: boolean }>(`/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export type CategoryTag = {
  id: number;
  name: string;
  iconUrl: string;
  sortOrder?: number;
};

export async function getCategoryTags() {
  const response = await fetch(`${appBase}/category-tags`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? '分类标签加载失败');
  }
  return (payload?.data ?? payload ?? []) as CategoryTag[];
}

const appBase = (import.meta.env.VITE_APP_API_BASE as string | undefined) || '/api/app';

export async function getCatalogCategories() {
  const response = await fetch(`${appBase}/categories`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? '分类加载失败');
  }
  return (payload?.data ?? payload ?? []) as CatalogCategory[];
}

export async function getAppProducts(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val != null && val !== '') query.set(key, String(val));
  }
  const qs = query.toString();
  const response = await fetch(`${appBase}/products${qs ? `?${qs}` : ''}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message ?? '商品加载失败');
  return payload as { page: number; pageSize: number; total: number; items: any[] };
}

export async function auditMerchant(merchantId: number, auditStatus = 3, remark = '资质审核通过') {
  return request(`/merchants/${merchantId}/audit`, {
    method: 'POST',
    body: JSON.stringify({ auditStatus, remark }),
  });
}

export async function auditProduct(productId: number, auditStatus = 3, remark = '商品审核通过') {
  return request(`/products/${productId}/audit`, {
    method: 'POST',
    body: JSON.stringify({ auditStatus, remark }),
  });
}

export async function createAdminProduct(payload: Record<string, unknown>) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminProductDetail(productId: number) {
  return request(`/products/${productId}`);
}

export async function updateAdminProduct(productId: number, payload: Record<string, unknown>) {
  return request(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProduct(productId: number) {
  return request(`/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function getAdminMerchantDetail(merchantId: number) {
  return request(`/merchants/${merchantId}`);
}

export async function updateAdminMerchant(merchantId: number, payload: Record<string, unknown>) {
  return request(`/merchants/${merchantId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminMerchant(merchantId: number) {
  return request(`/merchants/${merchantId}`, {
    method: 'DELETE',
  });
}

export async function takedownProduct(productId: number, reason: string) {
  return request(`/products/${productId}/takedown`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function restoreProduct(productId: number) {
  return request(`/products/${productId}/restore`, {
    method: 'POST',
  });
}

export async function createBanner(payload: Record<string, unknown>) {
  return request<BannerItem>('/banners', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBanner(bannerId: number, payload: Record<string, unknown>) {
  return request<BannerItem>(`/banners/${bannerId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function reorderBanners(bannerIds: number[]) {
  return request<{ success: boolean }>('/banners/reorder', {
    method: 'PUT',
    body: JSON.stringify({ bannerIds }),
  });
}

export async function deleteBanner(bannerId: number) {
  return request<{ success: boolean; bannerId: number }>(`/banners/${bannerId}`, {
    method: 'DELETE',
  });
}

export async function updateBannerStatus(
  bannerId: number,
  status: 'ENABLED' | 'DISABLED',
  remark = '列表页状态切换',
) {
  return request<BannerItem>(`/banners/${bannerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remark }),
  });
}

export async function createActivity(payload: Record<string, unknown>) {
  return request('/activities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateActivity(activityId: number, payload: Record<string, unknown>) {
  return request(`/activities/${activityId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getActivityDetail(activityId: number) {
  return request(`/activities/${activityId}`);
}

export async function publishActivity(activityId: number) {
  return request(`/activities/${activityId}/publish`, {
    method: 'POST',
  });
}

export async function pauseActivity(activityId: number) {
  return request(`/activities/${activityId}/pause`, {
    method: 'POST',
  });
}

export async function finishActivity(activityId: number) {
  return request(`/activities/${activityId}/finish`, {
    method: 'POST',
  });
}

export async function deleteActivity(activityId: number) {
  return request(`/activities/${activityId}`, {
    method: 'DELETE',
  });
}

export async function endActivity(activityId: number, _remark = '超管强制下线') {
  // 后端无 /end 接口，强制下线统一走 finish
  return finishActivity(activityId);
}

export async function createLogisticsRule(payload: Record<string, unknown>) {
  return request('/logistics/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLogisticsRule(templateId: number, payload: Record<string, unknown>) {
  return request(`/logistics/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLogisticsRule(templateId: number) {
  return request(`/logistics/templates/${templateId}`, {
    method: 'DELETE',
  });
}

export async function sendAdminMessage(payload: Record<string, unknown>) {
  return request('/messages/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function broadcastAdminMessage(payload: Record<string, unknown>) {
  return request('/messages/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminMessages(query: QueryParams = {}) {
  return request<PageResponse<any>>(
    `/messages${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
    })}`,
  );
}

export async function deleteAdminMessage(messageId: number) {
  return request(`/messages/${messageId}/delete`, {
    method: 'POST',
  });
}

export async function arbitrateRefund(refundNo: string, action = 'approve', remark = '平台判定同意退款') {
  return request(`/refunds/${refundNo}/arbitrate`, {
    method: 'POST',
    body: JSON.stringify({ action, remark }),
  });
}

export async function auditWithdraw(applyNo: string, auditStatus = 3, remark = '提现审核通过') {
  return request(`/withdraws/${applyNo}/audit`, {
    method: 'POST',
    body: JSON.stringify({ auditStatus, remark }),
  });
}

export async function updateAdminUserStatus(
  userId: number,
  status: 'NORMAL' | 'DISABLED',
  remark = '列表页状态切换',
) {
  return request(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remark }),
  });
}

export async function getAdminAccounts(query: QueryParams = {}) {
  return request<PageResponse<AdminAccountRow>>(
    `/admin-accounts${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 200,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function createAdminAccount(payload: {
  username: string;
  nickname: string;
  mobile?: string;
  password?: string;
  roleCodes: string[];
}) {
  const rawPassword = String(payload.password ?? '').trim();
  const body: Record<string, unknown> = {
    username: payload.username,
    nickname: payload.nickname,
    mobile: payload.mobile,
    roleCodes: payload.roleCodes,
  };
  if (rawPassword) {
    // 明文下发，后端同时写入 hash 与可查看的 loginPassword
    body.password = rawPassword;
  }

  return request<AdminAccountRow & { initialPassword?: string }>('/admin-accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function syncMerchantsAdminAccounts() {
  return request<{
    created: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      username?: string;
      initialPassword: string;
      adminUserId: number;
    }>;
    ensured: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      username?: string;
      initialPassword: string;
      adminUserId: number;
    }>;
    accounts: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      username?: string;
      initialPassword: string;
      adminUserId: number;
    }>;
    skipped: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      reason: string;
    }>;
    createdCount: number;
    ensuredCount: number;
    skippedCount: number;
  }>('/admin-accounts/sync-merchants', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateAdminAccount(
  adminUserId: number,
  payload: Partial<{
    nickname: string;
    mobile: string;
    status: 'NORMAL' | 'DISABLED';
    roleCodes: string[];
  }>,
) {
  return request<AdminAccountRow>(`/admin-accounts/${adminUserId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function resetAdminPassword(adminUserId: number, password?: string) {
  const rawPassword = String(password ?? '').trim();
  const body: Record<string, unknown> = {};
  if (rawPassword) {
    // 明文下发，后端同时写入 hash 与可查看的 loginPassword
    body.password = rawPassword;
  }
  return request<{
    success: boolean;
    initialPassword?: string;
    loginPassword?: string;
    username?: string;
    mobile?: string;
  }>(`/admin-accounts/${adminUserId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function auditMerchantProfile(
  merchantId: number,
  action: 'approve' | 'reject',
  remark?: string,
) {
  return request<{ success: boolean; profileAuditStatus: number }>(
    `/merchants/${merchantId}/profile-audit`,
    {
      method: 'POST',
      body: JSON.stringify({ action, remark }),
    },
  );
}

export async function getAdminRoles(query: QueryParams = {}) {
  return request<{ items: AdminRoleRow[] }>(
    `/admin-roles${buildQueryString({
      keyword: query.keyword,
    })}`,
  );
}

export async function createAdminRole(payload: {
  code: string;
  name: string;
  status?: 'NORMAL' | 'DISABLED';
  permissionKeys?: string[];
}) {
  return request<AdminRoleRow>('/admin-roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminRole(
  roleId: number,
  payload: Partial<{
    name: string;
    status: 'NORMAL' | 'DISABLED';
    permissionKeys: string[];
  }>,
) {
  return request<AdminRoleRow>(`/admin-roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('farm-admin-token') ?? '';
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? '图片上传失败');
  }

  const data = payload?.data ?? payload;
  return data as { url: string; bucket: string; path: string; objectKey: string; fileName: string };
}

export async function getUserSummary(userId: number) {
  return request<{
    id: number;
    nickname: string;
    mobile: string;
    role: string;
    status: string;
    createdAt: string;
    lastLoginAt: string;
    orderCount: number;
    totalSpent: string;
  }>(`/users/${userId}/summary`);
}

export async function getMerchantSummary(merchantId: number) {
  return request<{
    id: number;
    storeName: string;
    contactName: string;
    contactMobile: string;
    auditStatus: string;
    productCount: number;
    orderCount: number;
    totalIncome: string;
    createdAt: string;
  }>(`/merchants/${merchantId}/summary`);
}

export async function deleteAdminAccount(adminUserId: number) {
  return request<{ success: boolean }>(`/admin-accounts/${adminUserId}`, {
    method: 'DELETE',
  });
}

export async function deleteAdminRole(roleId: number) {
  return request<{ success: boolean }>(`/admin-roles/${roleId}`, {
    method: 'DELETE',
  });
}

export async function getLeaders(query: QueryParams = {}) {
  return request<PageResponse<any>>(
    `/leaders${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getLeader(leaderId: number) {
  return request<any>(`/leaders/${leaderId}`);
}

export async function auditLeader(leaderId: number, payload: Record<string, unknown>) {
  return request<any>(`/leaders/${leaderId}/audit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLeader(leaderId: number, payload: Record<string, unknown>) {
  return request<any>(`/leaders/${leaderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateLeaderStatus(leaderId: number, payload: Record<string, unknown>) {
  return request<any>(`/leaders/${leaderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteLeader(leaderId: number) {
  return request<{ success: boolean }>(`/leaders/${leaderId}`, {
    method: 'DELETE',
  });
}

export async function getPickupPoints(query: QueryParams = {}) {
  return request<PageResponse<any>>(
    `/pickup-points${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
      city: query.city,
      district: query.district,
      status: query.status,
    })}`,
  );
}

export async function createPickupPoint(payload: Record<string, unknown>) {
  return request<any>('/pickup-points', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePickupPoint(pickupPointId: number, payload: Record<string, unknown>) {
  return request<any>(`/pickup-points/${pickupPointId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updatePickupPointStatus(pickupPointId: number, payload: Record<string, unknown>) {
  return request<any>(`/pickup-points/${pickupPointId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePickupPoint(pickupPointId: number) {
  return request<{ success: boolean }>(`/pickup-points/${pickupPointId}`, {
    method: 'DELETE',
  });
}

export async function getLeaderCommissions(query: QueryParams = {}) {
  return request<PageResponse<any>>(
    `/leader-commissions${buildQueryString({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      leaderId: query.leaderId,
      status: query.status,
    })}`,
  );
}

export async function settleLeaderCommission(commissionId: number) {
  return request<any>(`/leader-commissions/${commissionId}/settle`, {
    method: 'POST',
  });
}

export async function batchSettleLeaderCommissions(ids: number[]) {
  return request<any>('/leader-commissions/batch-settle', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
