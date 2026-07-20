import { get, post } from './request';
import { fetchOrders } from './app';

export type FlashSaleStatus = 'ONGOING' | 'UPCOMING' | 'ENDED';

export type FlashSaleWindow = {
  id: number;
  label: string;
  startAt: string;
  endAt: string;
  status: FlashSaleStatus;
};

export type FreightSubsidyRule = {
  id: number;
  name: string;
  province: string;
  thresholdAmount: string;
  freightAmount: string;
  ruleText: string;
};

export type FlashSaleItem = {
  itemId?: number;
  productId: number;
  skuId?: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  flashPrice: string;
  originPrice: string;
  stockLeft: number;
  totalStock: number;
  originPlace?: string;
  activityStartAt?: string;
  activityEndAt?: string;
};

export type FlashSaleActiveResult = {
  windows: FlashSaleWindow[];
  items: FlashSaleItem[];
  generatedAt: string;
};

export type GroupBuyItem = {
  groupId: number;
  inviteCode?: string | null;
  productId: number;
  skuId?: number;
  title: string;
  coverUrl: string;
  roughArea: string;
  memberCount: number;
  needed: number;
  expireAt: string;
  groupPrice: string;
  originPrice: string;
};

export type GroupBuyNearbyResult = {
  groups: GroupBuyItem[];
  generatedAt: string;
};

export type QuickZoneProduct = {
  productId: number;
  skuId?: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  minPrice: string;
  originPrice?: string;
  saleCount?: number;
  isPreSale?: boolean;
  originPlace?: string;
  badge?: string;
  categoryId: number;
  categoryName: string;
};

export type QuickZonePageResult = {
  items: QuickZoneProduct[];
  total: number;
  page: number;
  pageSize: number;
  generatedAt: string;
};

export async function fetchFlashSaleActive(): Promise<FlashSaleActiveResult> {
  return get<FlashSaleActiveResult>('/app/quick/flash-sale/active');
}

export type FlashSaleWindowListResult = {
  windows: FlashSaleWindow[];
  freightRules?: FreightSubsidyRule[];
  generatedAt: string;
};

export type FlashSaleItemPageResult = {
  windowId: number | null;
  window?: FlashSaleWindow;
  page: number;
  pageSize: number;
  total: number;
  items: FlashSaleItem[];
  generatedAt: string;
};

export async function fetchFlashSaleWindows(): Promise<FlashSaleWindowListResult> {
  return get<FlashSaleWindowListResult>('/app/quick/flash-sale/windows');
}

export async function fetchFlashSaleItems(options: { windowId?: number; page?: number; pageSize?: number } = {}) {
  return get<FlashSaleItemPageResult>('/app/quick/flash-sale/items', options as any);
}

export type GroupBuyProduct = {
  productId: number;
  skuId: number | null;
  title: string;
  subtitle: string;
  coverUrl: string;
  originPrice: string;
  groupPrice: string;
  needed: number;
  expireHours: number;
  originPlace?: string;
  merchant: {
    merchantId: number;
    storeName: string;
    storeLogo: string;
  } | null;
};

export type GroupBuyProductPageResult = {
  page: number;
  pageSize: number;
  total: number;
  items: GroupBuyProduct[];
};

export async function fetchGroupBuyProducts(options: { page?: number; pageSize?: number; keyword?: string } = {}) {
  return get<GroupBuyProductPageResult>('/app/quick/group-buy/products', options as any);
}

export async function fetchGroupBuyNearby(
  options: { lat?: number; lng?: number; limit?: number; maxDistanceKm?: number; inviteCode?: string } = {},
): Promise<GroupBuyNearbyResult> {
  return post<GroupBuyNearbyResult>('/app/quick/group-buy/nearby', options);
}

export type GroupBuyJoinResult = {
  groupId: number;
  groupNo: string;
  inviteCode?: string | null;
  productId: number;
  skuId?: number;
  title: string;
  coverUrl: string;
  roughArea: string;
  memberCount: number;
  needed: number;
  groupPrice: string;
  originPrice: string;
  expireAt: string;
  expireHours?: number;
  status: 'OPEN' | 'COMPLETED' | 'FAILED';
  isNewGroup: boolean;
  /** 若该用户此前已为该团创建过未支付订单，这里会带回订单号，前端应引导续付而不是重新下单 */
  pendingOrderNo: string | null;
  /** 该用户已经是这个团的付费成员（重复点击"正在拼团"的同一个团） */
  alreadyJoined: boolean;
  /** alreadyJoined 为 true 时，对应的已支付订单号，前端应跳转订单详情查看拼团进度 */
  orderNo: string | null;
};

/**
 * 开团/参团校验接口。
 * 注意：调用本接口【不会】占用成团名额，只有真正下单并支付成功才会计入成团人数。
 * 开新团时也不会立刻创建团记录，需提交拼团订单后才落库。
 */
export async function joinGroupBuy(payload: { productId: number; skuId?: number; groupId?: number; lat?: number; lng?: number }) {
  return post<GroupBuyJoinResult>('/app/quick/group-buy/join', payload, { auth: true });
}

/** 拼团结算页跳转：新开团无 groupId，参已有团带 groupId */
export function buildGroupBuyCheckoutUrl(params: {
  productId: number | string;
  skuId?: number | string | null;
  groupId?: number | string | null;
}) {
  const productId = Number(params.productId);
  const skuId = Number(params.skuId || 0);
  const groupId = Number(params.groupId || 0);
  if (groupId > 0) {
    return `/pages/checkout/checkout?mode=groupBuy&groupBuyId=${groupId}&productId=${productId}&skuId=${skuId}`;
  }
  return `/pages/checkout/checkout?mode=groupBuy&productId=${productId}&skuId=${skuId}`;
}

/** 是否为「已在该团中」类错误（兼容尚未部署新后端的旧接口文案） */
export function isAlreadyJoinedGroupError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || '');
  return message.includes('你已在该团中') || message.includes('已在该团');
}

/**
 * 已参团时跳转进度页：优先订单详情（含拼团进度），找不到订单则去「我的拼团」。
 * 兼容旧后端仍返回「你已在该团中」400、且尚未部署 /mine 接口的情况。
 */
export async function navigateToJoinedGroupProgress(options: {
  groupId?: number | string | null;
  orderNo?: string | null;
}) {
  const orderNo = String(options.orderNo || '').trim();
  if (orderNo) {
    wx.navigateTo({ url: `/pages/order/detail/detail?orderNo=${encodeURIComponent(orderNo)}` });
    return;
  }

  const groupId = Number(options.groupId || 0);
  if (groupId > 0) {
    // 1) 新接口：我的拼团
    try {
      const mine = await fetchMyGroupBuys();
      const matched = (mine.items || []).find((item) => Number(item.groupId) === groupId);
      const targetOrderNo = String(matched?.orderNo || matched?.pendingOrderNo || '').trim();
      if (targetOrderNo) {
        wx.navigateTo({ url: `/pages/order/detail/detail?orderNo=${encodeURIComponent(targetOrderNo)}` });
        return;
      }
    } catch {
      // ignore
    }

    // 2) 兼容旧后端：从订单列表里按 groupBuyId 找
    try {
      const orders = await fetchOrders({ page: 1, pageSize: 50 });
      const matchedOrder = (orders.items || []).find((item) => Number(item.groupBuyId || 0) === groupId);
      const targetOrderNo = String(matchedOrder?.orderNo || '').trim();
      if (targetOrderNo) {
        wx.navigateTo({ url: `/pages/order/detail/detail?orderNo=${encodeURIComponent(targetOrderNo)}` });
        return;
      }
    } catch {
      // ignore
    }
  }

  wx.navigateTo({ url: '/pages/order/list/list' });
}

export type GroupBuyDetail = {
  groupId: number;
  groupNo: string;
  inviteCode?: string | null;
  productId: number;
  skuId?: number;
  title: string;
  coverUrl: string;
  roughArea: string;
  memberCount: number;
  needed: number;
  expireAt: string;
  completedAt: string | null;
  groupPrice: string;
  originPrice: string;
  status: 'OPEN' | 'COMPLETED' | 'FAILED';
};

/** 拼团详情：用于分享参团链接 / 邀请码落地页 */
export async function fetchGroupBuyDetail(options: { groupId?: number; inviteCode?: string }) {
  return get<GroupBuyDetail>('/app/quick/group-buy/detail', options as any);
}

export type MyGroupBuyItem = {
  groupId: number;
  groupNo: string;
  inviteCode?: string | null;
  productId: number;
  skuId?: number;
  title: string;
  coverUrl: string;
  status: 'OPEN' | 'COMPLETED' | 'FAILED';
  needed: number;
  memberCount: number;
  isInitiator: boolean;
  isPaidMember: boolean;
  needsPayment: boolean;
  orderNo: string | null;
  pendingOrderNo: string | null;
  groupPrice: string;
  originPrice: string;
  expireAt: string;
  completedAt: string | null;
  members?: Array<{
    userId: number;
    isInitiator: boolean;
    isMine?: boolean;
    nickname?: string;
    avatarUrl?: string;
  }>;
};

/** 我的拼团列表：我发起或已付款参加过的团 */
export async function fetchMyGroupBuys() {
  return get<{ items: MyGroupBuyItem[] }>('/app/quick/group-buy/mine', undefined, { auth: true });
}

export async function claimFlashSale(payload: { itemId: number; quantity?: number }) {
  return post<{
    itemId: number;
    skuId: number;
    quantity: number;
    stockLeft: number;
    flashPrice: string;
    status: string;
  }>('/app/quick/flash-sale/claim', payload, { auth: true });
}

export async function fetchGiftZoneItems(
  options: { page?: number; pageSize?: number; sortBy?: 'sales' | 'price' } = {},
): Promise<QuickZonePageResult> {
  return get<QuickZonePageResult>('/app/quick/gift-zone/items', options as any);
}

export async function fetchOriginZoneItems(
  options: { page?: number; pageSize?: number; originPlace?: string; categoryId?: number } = {},
): Promise<QuickZonePageResult> {
  return get<QuickZonePageResult>('/app/quick/origin-zone/items', options as any);
}
