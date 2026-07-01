import { get, post } from './request';

export type FlashSaleStatus = 'ONGOING' | 'UPCOMING' | 'ENDED';

export type FlashSaleWindow = {
  id: number;
  label: string;
  startAt: string;
  endAt: string;
  status: FlashSaleStatus;
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

export async function joinGroupBuy(payload: { productId: number; skuId?: number; groupId?: number; lat?: number; lng?: number }) {
  return post<{
    groupId?: number;
    groupBuyId?: number;
    productId: number;
    skuId?: number;
    inviteCode?: string | null;
    status?: string;
  }>('/app/quick/group-buy/join', payload, { auth: true });
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
