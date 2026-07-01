import { get, post, request } from './request';
import type { AppPagedResult } from './app';

export type LeaderApplication = {
  id: number;
  status: 'NOT_APPLIED' | 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED';
  statusLabel: string;
  realName: string;
  idCardNo: string;
  mobile: string;
  businessCertUrl: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  rejectRemark?: string;
  createdAt?: string;
  auditAt?: string;
};

export type LeaderDashboard = {
  overview: {
    totalOrders: number;
    totalCommission: string;
    todayOrders: number;
    todayCommission: string;
    pendingPickup: number;
    availableWithdraw: string;
  };
  recentOrders: Array<{
    orderNo: string;
    buyerName: string;
    totalAmount: string;
    commission: string;
    status: string;
    createdAt: string;
  }>;
  trend: Array<{
    date: string;
    orders: number;
    commission: string;
  }>;
};

export type LeaderOrder = {
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  buyerAvatar?: string;
  status: string;
  statusLabel: string;
  totalAmount: string;
  commission: string;
  pickupStatus: 'PENDING' | 'PICKED_UP';
  items: Array<{
    orderItemId: number;
    productId: number;
    skuId: number;
    title: string;
    skuName: string;
    price: string;
    quantity: number;
    coverUrl: string;
  }>;
  createdAt: string;
  paidAt?: string;
  pickedUpAt?: string;
  pickupCode?: string;
};

export type CommissionRecord = {
  id: number;
  commissionNo: string;
  orderNo: string;
  amount: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  description: string;
  createdAt: string;
  settledAt?: string;
};

export type PickupPoint = {
  id: number;
  leaderId: number;
  storeName: string;
  storeAddress: string;
  storePhoto?: string;
  latitude: number;
  longitude: number;
  distance?: number;
  distanceLabel?: string;
  leaderName: string;
  leaderPhone: string;
  businessHours?: string;
  status: number;
};

export type PickupPointDetail = PickupPoint & {
  description?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  createdAt?: string;
};

export async function applyLeader(payload: {
  realName: string;
  idCardNo: string;
  mobile: string;
  businessCertUrl: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
}) {
  return post('/app/leaders/apply', payload, { auth: true });
}

export async function fetchLeaderApplication() {
  return get<LeaderApplication>('/app/leaders/application', undefined, { auth: true });
}

export async function updateLeaderApplication(payload: {
  realName?: string;
  idCardNo?: string;
  mobile?: string;
  businessCertUrl?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
}) {
  return request({
    url: '/app/leaders/application',
    method: 'PUT',
    data: payload,
    auth: true,
  });
}

export async function fetchPickupPoints(query: {
  page?: number;
  pageSize?: number;
  latitude?: number;
  longitude?: number;
  keyword?: string;
} = {}) {
  return get<AppPagedResult<PickupPoint>>(
    '/app/leaders/pickup-points',
    query as any,
    { auth: false },
  );
}

export async function fetchPickupPointDetail(id: number) {
  return get<PickupPointDetail>(`/app/leaders/pickup-points/${id}`, undefined, { auth: false });
}

export async function fetchMyPickupPoint() {
  return get<PickupPointDetail | null>('/app/leaders/my-pickup-point', undefined, { auth: true });
}

export async function saveMyPickupPoint(payload: {
  storeName: string;
  province: string;
  city: string;
  district?: string;
  detailAddress: string;
  latitude?: number;
  longitude?: number;
  storePhoto?: string;
  businessHours?: string;
  description?: string;
}) {
  return request<PickupPointDetail>({
    url: '/app/leaders/my-pickup-point',
    method: 'PUT',
    data: payload,
    auth: true,
  });
}

export async function fetchLeaderDashboard() {
  return get<LeaderDashboard>('/app/leaders/dashboard', undefined, { auth: true });
}

export async function fetchLeaderOrders(query: {
  page?: number;
  pageSize?: number;
  status?: string;
  pickupStatus?: string;
} = {}) {
  return get<AppPagedResult<LeaderOrder>>(
    '/app/leaders/orders',
    query as any,
    { auth: true },
  );
}

export async function confirmPickup(orderNo: string) {
  return post(`/app/leaders/orders/${orderNo}/pickup`, {}, { auth: true });
}

export async function fetchLeaderCommissions(query: {
  page?: number;
  pageSize?: number;
  status?: string;
} = {}) {
  return get<AppPagedResult<CommissionRecord>>(
    '/app/leaders/commissions',
    query as any,
    { auth: true },
  );
}
