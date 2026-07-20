import { del, get, post, request } from './request';

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return query.length ? `?${query.join('&')}` : '';
}

export type AppPagedResult<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};

export type AppBanner = {
  id: number;
  title: string;
  imageUrl: string;
  linkType: string;
  linkId: number | null;
  startAt?: string;
  endAt?: string;
  sortOrder: number;
  status: string;
};

export type AppQuickEntry = {
  id: number;
  title: string;
  icon: string;
  linkType: string;
  linkId: number | null;
};

export type AppProduct = {
  id: number;
  categoryId?: number;
  merchantId?: number;
  skuId?: number;
  title: string;
  subtitle: string;
  detailDesc?: string;
  merchantName?: string;
  skuNames?: string[];
  coverUrl: string;
  originPlace: string;
  minPrice?: string;
  maxPrice?: string;
  saleCount?: number;
  isHot?: boolean;
  createdAt?: string;
  icon?: string;
  isFavorite?: boolean;
  status?: number;
  isPreSale?: boolean;
  deliveryType?: number;
  productNature?: string;
};

export type AppCategory = {
  id: number;
  name: string;
  iconUrl: string;
  sortOrder: number;
  children: Array<{
    id: number;
    name: string;
    iconUrl: string;
    sortOrder: number;
  }>;
};

export type AppCartItem = {
  cartId: number;
  productId: number;
  skuId: number;
  title: string;
  skuName: string;
  price: string;
  quantity: number;
  checked: boolean;
  stock: number;
  coverUrl: string;
};

export type AppCartGroup = {
  merchantId: number;
  storeName: string;
  items: AppCartItem[];
};

export type AppFreightPromo = {
  ruleId?: number | null;
  thresholdAmount: string;
  freightAmount?: string;
  name?: string;
};

export type AppCartResult = {
  groups: AppCartGroup[];
  freightPromo?: AppFreightPromo;
};

let cachedCartItemCount: number | null = null;
let cachedCartItemCountPromise: Promise<number> | null = null;

export type AppMessageContentBlock =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'image';
      url: string;
      alt?: string;
    };

export type AppMessageContent = {
  blocks: AppMessageContentBlock[];
  preview?: string;
  link?: {
    label?: string;
    url?: string;
    type?: string;
    id?: string;
  };
};

export type AppMessageListItem = {
  receiptId: number;
  messageId: number;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  coverImageUrl: string;
  isRead: boolean;
  publishAt: string;
  dateKey: string;
  readAt: string;
  bizType: string;
  bizId: string;
};

export type AppMessageDetail = AppMessageListItem & {
  contentType: string;
  contentJson: AppMessageContent | null;
  senderType: string;
  senderId: number | null;
  senderNickname: string | null;
  senderAvatar: string | null;
  deliveredAt: string;
};

export type AppChatConversation = {
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

export type AppChatMessage = {
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

export type AppAddress = {
  id: number;
  receiverName: string;
  receiverMobile: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  isDefault: boolean;
};

export type AppCoupon = {
  couponId: number;
  name: string;
  type: string;
  thresholdAmount: string;
  discountAmount: string;
  stock: number;
  issuedStock: number;
  received: boolean;
};

export type AppUserCoupon = {
  userCouponId: number;
  userCouponNo: string;
  couponId: number;
  name: string;
  type: string;
  thresholdAmount: string;
  discountAmount: string;
  status: string;
  sourceType: string;
  receivedAt: string;
  usedAt: string | null;
  expiredAt: string | null;
  orderNo: string | null;
  validStartAt: string | null;
  validEndAt: string | null;
  scope: string;
  perUserLimit: number;
  usable: boolean;
  unusableReason: string | null;
};

export type AppPointLog = {
  id: number;
  changeType: string;
  points: number;
  sourceType: string;
  sourceNo: string;
  remark: string;
  createdAt: string;
};

export type AppPointExchangeItem = {
  couponId: number;
  name: string;
  type: string;
  exchangeKind?: 'COUPON' | 'PRODUCT' | string;
  thresholdAmount: string;
  discountAmount: string;
  stock: number;
  issuedStock: number;
  validStartAt: string | null;
  validEndAt: string | null;
  received: boolean;
  pointsCost: number;
  canRedeem: boolean;
  coverUrl?: string;
  imageUrl?: string;
};

export type AppOrder = {
  orderNo: string;
  userName: string;
  orderStatus?: string;
  status: string | number;
  payStatus: number;
  deliveryStatus: number;
  totalAmount: string;
  freightAmount?: string;
  discountAmount?: string;
  payAmount?: string;
  expireAt?: string;
  groupBuyId?: number | null;
  groupBuy?: AppOrderGroupBuy | null;
};

export type AppOrderGroupBuy = {
  groupId: number;
  groupNo: string;
  inviteCode?: string | null;
  status: 'OPEN' | 'COMPLETED' | 'FAILED';
  needed: number;
  memberCount: number;
  expireAt: string | null;
  completedAt: string | null;
  productId: number;
  skuId: number;
  productTitle: string;
  productCoverUrl: string;
  groupPrice: string;
  originPrice: string;
  members: Array<{
    memberId: number;
    userId: number;
    isInitiator: boolean;
    joinedAt: string;
    nickname?: string;
    avatarUrl?: string;
  }>;
};

export type AppMeResponse = {
  user: {
    id?: number;
    nickname: string;
    avatarUrl: string;
    mobile: string;
    role?: string;
    status?: string | number;
  };
  canUseGuest: boolean;
  profile?: {
    userId: number;
    openid: string;
    nickname: string;
    avatarUrl: string;
    mobile: string;
    status: number;
    lastLoginAt: string;
  };
};

export async function fetchHomeBanners() {
  return get<AppBanner[]>('/app/home/banners');
}

export async function fetchHomeQuickEntries() {
  return get<AppQuickEntry[]>('/app/home/quick-entries');
}

export async function fetchHomeHotProducts() {
  return get<AppProduct[]>('/app/home/hot-products');
}

export async function fetchMerchantEntryStatus() {
  return get<{ enabled: boolean }>('/app/home/merchant-entry-status');
}

let bootstrapCatalogPromise: Promise<void> | null = null;

export async function bootstrapCatalogData() {
  if (!bootstrapCatalogPromise) {
    bootstrapCatalogPromise = Promise.allSettled([
      fetchCategories(),
      fetchHomeHotProducts(),
      fetchProducts('', { page: 1, pageSize: 6 }),
    ]).then(() => undefined);
  }

  try {
    await bootstrapCatalogPromise;
  } finally {
    bootstrapCatalogPromise = null;
  }
}

export async function fetchCategories(options: {
  level?: '1' | '2' | 'tree' | 'all';
  parentId?: number | string;
  status?: number | string;
  page?: number | string;
  pageSize?: number | string;
} = {}) {
  return get<AppCategory[]>(
    `/app/categories${buildQuery({
      level: options.level || '2',
      parentId: options.parentId,
      status: options.status || 1,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
    })}`,
  );
}

export async function fetchProducts(
  keyword = '',
  pageOrOptions:
    | number
    | {
        page?: number;
        pageSize?: number;
        categoryId?: number;
        isHot?: boolean;
        isPreSale?: boolean;
        productNature?: string;
        deliveryType?: number;
      } = {},
  categoryId?: number,
) {
  const options =
    typeof pageOrOptions === 'number'
      ? { page: 1, pageSize: pageOrOptions, categoryId }
      : pageOrOptions;

  return get<AppPagedResult<AppProduct>>(
    `/app/products${buildQuery({
      page: options.page,
      pageSize: options.pageSize,
      keyword,
      categoryId: options.categoryId,
      isHot: options.isHot,
      isPreSale: options.isPreSale,
      productNature: options.productNature,
      deliveryType: options.deliveryType,
    })}`,
  );
}

export async function fetchSearchHotKeywords() {
  return get<string[]>('/app/search/hot-keywords');
}

export async function fetchCart(): Promise<AppCartResult> {
  const data = await get<AppCartGroup[] | AppCartResult>('/app/cart');
  if (Array.isArray(data)) {
    return { groups: data };
  }
  return {
    groups: Array.isArray(data?.groups) ? data.groups : [],
    freightPromo: data?.freightPromo,
  };
}

export async function fetchMessageList(query: { page?: number; pageSize?: number; type?: string; isRead?: boolean } = {}) {
  return get<{
    page: number;
    pageSize: number;
    total: number;
    unreadCount: number;
    items: AppMessageListItem[];
  }>('/app/messages', query, { auth: true });
}

export async function fetchUnreadMessageCount() {
  return get<{ unreadCount: number }>('/app/messages/unread-count', undefined, { auth: true });
}

export async function fetchMessageDetail(receiptId: number) {
  return get<AppMessageDetail>(`/app/messages/${receiptId}`, undefined, { auth: true });
}

export async function markMessageRead(receiptId: number) {
  return post<{ receiptId: number; isRead: boolean; readAt: string }>(`/app/messages/${receiptId}/read`, {}, { auth: true });
}

export async function markMessagesRead(receiptIds: Array<number | string>) {
  return post<{ updatedCount: number; readAt: string }>('/app/messages/read-batch', {
    ids: receiptIds,
  }, { auth: true });
}

export async function markAllMessagesRead() {
  return post<{ updatedCount: number; readAt: string }>('/app/messages/read-all', {}, { auth: true });
}

export async function deleteMessage(receiptId: number) {
  return post<{ receiptId: number; deleted: boolean }>(`/app/messages/${receiptId}/delete`, {});
}

export async function fetchChatConversations() {
  return get<AppChatConversation[]>('/app/chats');
}

export type AppChatSupportTarget = {
  merchantId: number;
  merchantName: string;
  merchantLogo: string;
  hotline: string;
  source: 'CONFIGURED' | 'FALLBACK';
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';
  sceneLabel: string;
  sceneSource: string;
};

export async function fetchChatSupportTarget() {
  return get<AppChatSupportTarget>('/app/chats/support-target');
}

export async function openChatConversation(payload: {
  merchantId?: number;
  productId?: number;
  orderNo?: string;
  sceneType?: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';
  sceneLabel?: string;
  sceneSource?: string;
}) {
  return post<AppChatConversation & { opened: boolean }>('/app/chats/open', payload, { auth: true });
}

export async function fetchChatMessages(conversationId: number, query: { page?: number; pageSize?: number } = {}) {
  return get<{ conversationId: number; page: number; pageSize: number; total: number; items: AppChatMessage[] }>(
    `/app/chats/${conversationId}/messages${buildQuery({ page: query.page, pageSize: query.pageSize })}`,
  );
}

export async function sendChatMessage(conversationId: number, payload: { content: string; contentType?: 'TEXT' | 'IMAGE'; attachments?: Record<string, unknown> }) {
  return post<AppChatMessage>(`/app/chats/${conversationId}/messages`, payload, { auth: true });
}

export async function markChatConversationRead(conversationId: number) {
  return post<{ conversationId: number; updatedCount: number; readAt: string }>(`/app/chats/${conversationId}/read`, {}, { auth: true });
}

export async function fetchChatUnreadCount() {
  return get<{ unreadCount: number }>('/app/chats/unread-count');
}

export function setCachedCartItemCount(count: number | null) {
  cachedCartItemCount = Number.isFinite(Number(count)) && Number(count) >= 0 ? Number(count) : null;
}

export function invalidateCartItemCount() {
  cachedCartItemCount = null;
  cachedCartItemCountPromise = null;
}

export async function fetchCartItemCount(forceRefresh = false) {
  if (!forceRefresh && cachedCartItemCount != null) {
    return cachedCartItemCount;
  }

  if (!forceRefresh && cachedCartItemCountPromise) {
    return cachedCartItemCountPromise;
  }

  cachedCartItemCountPromise = (async () => {
    const { groups } = await fetchCart();

    const count = groups.reduce((sum, group) => {
      return (
        sum +
        group.items.reduce((groupSum, item) => groupSum + Number(item.quantity || 0), 0)
      );
    }, 0);

    cachedCartItemCount = count;
    return count;
  })();

  try {
    return await cachedCartItemCountPromise;
  } finally {
    cachedCartItemCountPromise = null;
  }
}

export async function fetchAddresses() {
  return get<AppAddress[]>('/app/addresses');
}

export async function updateCartItem(cartId: number, payload: Record<string, unknown>) {
  const result = await request({
    url: `/app/cart/items/${cartId}`,
    method: 'PATCH' as WechatMiniprogram.RequestOption['method'],
    data: payload,
  });
  invalidateCartItemCount();
  return result;
}

export async function removeCartItem(cartId: number) {
  const result = await del(`/app/cart/items/${cartId}`);
  invalidateCartItemCount();
  return result;
}

export async function addToCart(skuId: number, quantity = 1) {
  const result = await post<{ message: string; cartId: number; cartCount: number }>('/app/cart/items', { skuId, quantity });
  if (typeof result?.cartCount === 'number') {
    setCachedCartItemCount(result.cartCount);
  } else {
    invalidateCartItemCount();
  }
  return result;
}

export async function fetchCoupons() {
  return get<AppCoupon[]>('/app/coupons', undefined, { auth: true });
}

export async function fetchUserCoupons() {
  return get<AppUserCoupon[]>('/app/user/coupons', undefined, { auth: true });
}

export async function receiveCoupon(couponId: number) {
  return post(`/app/coupons/${couponId}/receive`, {}, { auth: true });
}

export async function fetchPointsLogs() {
  return get<AppPointLog[]>('/app/points/logs', undefined, { auth: true });
}

export async function fetchPointExchangeItems() {
  return get<{ balance: number; items: AppPointExchangeItem[] }>('/app/points/exchange-items', undefined, { auth: true });
}

export async function exchangePointsCoupon(couponId: number) {
  return post<{
    alreadyExchanged: boolean;
    couponId: number;
    userCouponId: number;
    couponName: string;
    pointsCost: number;
    remainingPoints: number;
  }>('/app/points/exchange', { couponId }, { auth: true });
}

export async function fetchOrders(query: { page?: number; pageSize?: number; keyword?: string } = {}) {
  return get<{ page: number; pageSize: number; total: number; items: AppOrder[] }>(
    `/app/orders${buildQuery({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
    })}`,
  );
}

export async function fetchMe() {
  return get<AppMeResponse>('/identity/auth/me');
}

export async function updateMeProfile(payload: Record<string, unknown>) {
  return request({
    url: '/identity/auth/me',
    method: 'PATCH' as WechatMiniprogram.RequestOption['method'],
    data: payload,
  });
}

// ===== Step 6 联调：B1 / B2 / A2 / A3 新增接口 =====

export type AppAssetsSummary = {
  user: {
    id: number;
    displayName: string;
    avatarUrl: string;
    vipLevel: number;
    vipName: string;
  };
  points: {
    balance: number;
    expireIn30d: number;
    todayEarned: number;
    redeemEnabled: boolean;
    earnRate: number;
    redeemRate: number;
  };
  coupons: {
    unused: number;
    available: number;
    expiredUnused: number;
  };
  favorites: {
    total: number;
    recentViewed: number;
  };
  orders: {
    pendingPay: number;
    pendingShip: number;
    pendingReceive: number;
    pendingReview: number;
    refunding: number;
    totalCompleted: number;
  };
  defaultAddress: AppAddress | null;
  wallet: {
    available: string;
    frozen: string;
    note: string;
  };
  updatedAt: string;
};

export type AppRecommendedCoupon = {
  couponId: number;
  name: string;
  type: string;
  thresholdAmount: string;
  discountAmount: string;
  validStartAt: string | null;
  validEndAt: string | null;
  stock: number;
  issuedStock: number;
  received: boolean;
  matchScore: number;
  matchReason: string;
};

export type AppRecommendedCouponsResult = {
  scene: string;
  items: AppRecommendedCoupon[];
};

export type AppRecommendItem = {
  id: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  price: string;
  originalPrice: string;
  salesCount: number;
  isHot: boolean;
  isPreSale: boolean;
  merchantId: number;
  storeName: string;
  originPlace?: string;
  productNature?: string;
};

export type AppCategoryRecommendations = {
  categoryId: number;
  period: string;
  page: number;
  pageSize: number;
  total: number;
  items: AppRecommendItem[];
};

export type AppRelatedProducts = {
  productId: number;
  items: AppRecommendItem[];
};

export type AppWxacodeResult = {
  scene: string;
  imageUrl: string;
  expireAt: string | null;
  width: number;
  cached: boolean;
};

export type AppShareCardResult = {
  scene: string;
  imageUrl: string;
  expireAt: string;
  channel: string;
  cached: boolean;
};

export type AppQrScanResult = {
  redirect: string | null;
  bindStatus: 'bound' | 'expired' | 'duplicate' | 'none';
};

export type AppQrRedirectResult = {
  redirect: string;
};

export async function fetchAssetsSummary() {
  return get<AppAssetsSummary>('/app/assets/summary', undefined, { auth: true });
}

export type AppMerchantCoupon = {
  couponId: number;
  name: string;
  type: string;
  thresholdAmount: string;
  discountAmount: string;
  stock: number;
  issuedStock: number;
  validStartAt: string;
  validEndAt: string;
  scope: string;
  perUserLimit: number;
  isActive: boolean;
  receiveStatus: string;
  received: boolean;
};

export type AppMerchantSummary = {
  merchantId: number;
  storeName: string;
  storeLogo: string;
  contactName: string;
  description?: string;
  status: number;
  productCount: number;
  totalSales: number;
  qualificationCount: number;
};

export type AppMerchantProduct = {
  productId: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  minPrice: string;
  originPrice: string;
  saleCount: number;
  isFavorite: boolean;
  originPlace?: string;
};

export type AppMerchantProductPage = {
  items: AppMerchantProduct[];
  page: number;
  pageSize: number;
  total: number;
};

export async function fetchMerchantDetail(merchantId: number) {
  return get<AppMerchantSummary>(`/app/merchants/${merchantId}`);
}

export async function fetchMerchantPublicProducts(
  merchantId: number,
  options: { page?: number; pageSize?: number; keyword?: string; sort?: string; isPreSale?: boolean; isHot?: boolean } = {},
) {
  return get<AppMerchantProductPage>(`/app/merchants/${merchantId}/products`, options as any);
}

export async function fetchMerchantCoupons(merchantId: number) {
  return get<AppMerchantCoupon[]>(`/app/merchants/${merchantId}/coupons`);
}

export async function fetchRecommendedCoupons(
  scene: 'home' | 'cart' | 'shop' | 'checkout',
  options: { cartAmount?: number; merchantId?: number; limit?: number } = {},
) {
  return get<AppRecommendedCouponsResult>(
    `/app/coupons/recommended${buildQuery({
      scene,
      cartAmount: options.cartAmount,
      merchantId: options.merchantId,
      limit: options.limit,
    })}`,
  );
}

export async function fetchCategoryRecommendations(
  categoryId: number,
  options: { period?: 'day' | 'week' | 'month'; page?: number; pageSize?: number } = {},
) {
  return get<AppCategoryRecommendations>(
    `/app/categories/${categoryId}/recommendations${buildQuery({
      period: options.period,
      page: options.page,
      pageSize: options.pageSize,
    })}`,
  );
}

export async function fetchRelatedProducts(productId: number, limit = 6) {
  return get<AppRelatedProducts>(`/app/products/${productId}/related${buildQuery({ limit })}`);
}

export async function createWxacode(payload: { type: 'p' | 'm' | 'c' | 'o' | 'a'; refId: number; inviterId?: number; width?: number }) {
  return post<AppWxacodeResult>('/app/qr-codes/wxacode', payload, { auth: true });
}

export async function createShareCard(payload: { activityId: number; channel?: string }) {
  return post<AppShareCardResult>('/app/qr-codes/share-card', payload, { auth: true });
}

export async function scanQrCode(payload: { scene: string; channel?: string }) {
  return post<AppQrScanResult>('/app/qr-codes/scan', payload, { auth: true });
}

export async function resolveQrRedirect(scene: string) {
  return get<AppQrRedirectResult>(`/app/qr-codes/redirect${buildQuery({ scene })}`);
}

export type AppProductDetail = AppProduct & {
  detailDesc?: string;
  groupBuyConfig?: {
    enabled: boolean;
    needed: number;
    expireHours: number;
    discountRate: number;
  } | null;
  serviceTags: Array<{
    key: string;
    title: string;
    desc: string;
    icon: string;
  }>;
  images: string[];
  videos: Array<{ videoUrl: string; coverUrl: string }>;
  skus: Array<{
    id: number;
    skuName: string;
    imageUrl?: string;
    price: string;
    originalPrice: string;
    offlinePrice?: string | null;
    stock: number;
    lockedStock?: number;
    safetyStock?: number | null;
    specJson: Record<string, string>;
  }>;
  traceInfo: {
    traceCode: string;
    traceDesc: string;
    traceUrl: string;
  } | null;
  merchant: {
    id: number;
    storeName: string;
    contactName: string;
    contactMobile: string;
    storeLogo?: string;
  };
  category: {
    id: number;
    name: string;
  };
  brand?: string;
  supplierName?: string;
  ingredients?: string;
  shelfLife?: string;
  productionDate?: string;
  material?: string;
  dimensions?: string;
  leadTime?: string;
  shippingRestrictedRegions?: string;
  afterSalesCommitment?: string;
  logisticsCompany?: string;
  productNature?: string;
  liveCities?: string;
  sessionAttribute?: string;
  liveMechanism?: string;
};

export type AppTraceDetail = {
  traceCode: string;
  traceDesc: string;
  status: 'verified';
  recordedAt: string;
  product: {
    id: number;
    title: string;
    subtitle: string;
    coverUrl: string;
    originPlace: string;
    categoryName: string;
  };
  merchant: {
    id: number;
    storeName: string;
    contactName: string;
    contactMobile: string;
  };
  detailLines: Array<{
    label: string;
    value: string;
  }>;
  timeline: Array<{
    title: string;
    desc: string;
    time: string;
    status: 'done' | 'pending';
  }>;
  raw: Record<string, unknown> | null;
};

export type AppFavoriteItem = {
  favoriteId: number;
  productId: number;
  merchantId: number;
  skuId: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  originPlace: string;
  minPrice: string;
  storeName: string;
  isPreSale: boolean;
  createdAt: string;
};

export async function fetchProductDetail(productId: number) {
  return get<AppProductDetail>(`/app/products/${productId}`);
}

export async function fetchTraceDetail(traceCode: string) {
  return get<AppTraceDetail>(`/app/traces/${encodeURIComponent(traceCode)}`);
}

export async function fetchFavorites(query: { page?: number; pageSize?: number } = {}) {
  return get<AppPagedResult<AppFavoriteItem>>(
    `/app/favorites${buildQuery({
      page: query.page,
      pageSize: query.pageSize,
    })}`,
    undefined,
    { auth: true },
  );
}

export async function addFavorite(productId: number) {
  return post<any>(`/app/products/${productId}/favorite`, {}, { auth: true });
}

export async function removeFavorite(productId: number) {
  return del<any>(`/app/products/${productId}/favorite`, undefined, { auth: true });
}

export async function createAddress(payload: Record<string, unknown>) {
  return post<AppAddress>('/app/addresses', payload, { auth: true });
}

export async function updateAddress(addressId: number, payload: Record<string, unknown>) {
  return request<AppAddress>({
    url: `/app/addresses/${addressId}`,
    method: 'PATCH' as WechatMiniprogram.RequestOption['method'],
    data: payload,
    auth: true,
  });
}

export async function deleteAddress(addressId: number) {
  return del<any>(`/app/addresses/${addressId}`, undefined, { auth: true });
}

export type AppOrderPreviewResponse = {
  summary: {
    productAmount: string;
    freightAmount: string;
    discountAmount: string;
    payAmount: string;
  };
  addressSnapshot: any;
  couponId: number | null;
  coupon?: {
    couponId: number | null;
    usable: boolean;
    reason: string | null;
    discountAmount: string;
  } | null;
  usePoints: number;
  deliveryType: number;
};

export async function previewOrder(payload: Record<string, unknown>) {
  return post<AppOrderPreviewResponse>('/app/orders/preview', payload, { auth: true });
}

export async function createOrder(payload: Record<string, unknown>) {
  const result = await post<{
    orderNo: string;
    payAmount: string;
    cartCount?: number;
    childOrderNos?: string[];
    orderMode?: string;
  }>('/app/orders', payload, { auth: true });
  if (typeof result?.cartCount === 'number') {
    setCachedCartItemCount(result.cartCount);
  } else {
    invalidateCartItemCount();
  }
  return result;
}

export async function createWechatPayment(payload: Record<string, unknown>) {
  return post<{
    appId: string;
    paymentNo: string;
    orderNo: string;
    prepayId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    packageVal: string;
    signType: string;
    paySign: string;
  }>('/app/payments/wechat', payload, { auth: true });
}

export async function fetchWechatPaymentStatus(orderNo: string) {
  return get<{
    orderNo: string;
    paymentNo: string;
    tradeState: 'SUCCESS' | 'NOTPAY';
    tradeStateDesc: string;
    totalAmount: string;
    paidAt: string | null;
    outTradeNo: string;
    transactionId: string | null;
    complianceStatus: 'PASS' | 'PENDING';
    createdAt: string;
  }>(`/app/payments/wechat/status/${encodeURIComponent(orderNo)}`, undefined, { auth: true });
}

export async function mockPaySuccess(orderNo: string) {
  return post<{ received: boolean; processed: boolean }>(
    '/payments/wechat/callback',
    { orderNo },
    { auth: false },
  );
}

export async function fetchOrderLogisticsDetail(orderNo: string) {
  return get<{
    orderNo: string;
    logisticsCompany: string;
    logisticsCode: string;
    trackingNo: string;
    status: string;
    statusLabel: string;
    shippedAt: string | null;
    deliveredAt: string | null;
    updatedAt: string;
    timeline: Array<{
      time: string | null;
      title: string;
      desc: string;
      status: 'done' | 'pending';
    }>;
  }>(`/app/orders/${encodeURIComponent(orderNo)}/logistics`, undefined, { auth: true });
}

export async function fetchOrderDetail(orderNo: string) {
  return get<any>(`/app/orders/${orderNo}`, undefined, { auth: true });
}

export async function cancelOrder(orderNo: string) {
  const result = await post<any>(`/app/orders/${orderNo}/cancel`, {}, { auth: true });
  invalidateCartItemCount();
  return result;
}

export async function confirmOrder(orderNo: string) {
  return post<any>(`/app/orders/${orderNo}/confirm`, {}, { auth: true });
}

export async function createRefundApply(payload: { orderNo: string; orderItemId: number; refundAmount: string; applyType: number; applyReason: string; applyImages?: string[] }) {
  return post<any>('/app/refunds', payload, { auth: true });
}

export type AppCategoryTag = {
  id: number;
  name: string;
  iconUrl: string;
};

export async function fetchCategoryTags() {
  return get<AppCategoryTag[]>('/app/category-tags');
}

export async function submitOrderReview(orderNo: string, payload: { reviews: Array<{ orderItemId: number; rating: number; content: string; images?: string[] }> }) {
  return post<{ orderNo: string; reviewCount: number; results: Array<{ orderItemId: number; reviewId: number }> }>(`/app/orders/${orderNo}/reviews`, payload, { auth: true });
}
