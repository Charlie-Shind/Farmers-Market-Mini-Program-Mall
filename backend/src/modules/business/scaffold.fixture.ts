// Legacy scaffold-only mock data.
// Do not treat these values as runtime truth or production-facing URLs.
// The live seed and upload flow should return real object-storage assets.
import { randomUUID } from 'node:crypto';

export type Pagination<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Mock 资源 URL 统一通过环境变量配置
 * 默认为占位符域名，便于识别「此处未配置真实地址」
 */
const SCAFFOLD_CDN_BASE = (process.env.DEMO_CDN_BASE_URL || 'https://cdn.example.com').replace(/\/+$/, '');
const SCAFFOLD_TRACE_BASE = (process.env.DEMO_TRACE_BASE_URL || 'https://trace.example.com').replace(/\/+$/, '');
const cdn = (path: string): string => `${SCAFFOLD_CDN_BASE}/${path.replace(/^\/+/, '')}`;
const trace = (code: string): string => `${SCAFFOLD_TRACE_BASE}/${code}`;

export const scaffoldCategories = [
  { id: 1, name: '时令果蔬', iconUrl: cdn('category-fruit.png'), sortOrder: 1 },
  { id: 2, name: '肉禽蛋奶', iconUrl: cdn('category-meat.png'), sortOrder: 2 },
  { id: 3, name: '粮油干货', iconUrl: cdn('category-grain.png'), sortOrder: 3 },
  { id: 4, name: '特产礼盒', iconUrl: cdn('category-gift.png'), sortOrder: 4 },
];

export const scaffoldProducts = [
  {
    id: 1001,
    categoryId: 1,
    merchantId: 10,
    title: '云南高山苹果',
    subtitle: '产地直发，新鲜采摘',
    originPlace: '云南昭通',
    coverUrl: cdn('product-apple-cover.png'),
    minPrice: '39.90',
    maxPrice: '59.90',
    saleCount: 3821,
    isFavorite: false,
    status: 'ON_SHELF',
    isPreSale: false,
    isHot: true,
    deliveryType: 1,
  },
  {
    id: 1002,
    categoryId: 4,
    merchantId: 11,
    title: '东北黑木耳礼盒',
    subtitle: '山珍干货，礼赠佳品',
    originPlace: '黑龙江牡丹江',
    coverUrl: cdn('product-fungus-cover.png'),
    minPrice: '29.90',
    maxPrice: '49.90',
    saleCount: 1210,
    isFavorite: false,
    status: 'ON_SHELF',
    isPreSale: false,
    isHot: false,
    deliveryType: 1,
  },
];

export const scaffoldProductDetails = {
  1001: {
    id: 1001,
    categoryId: 1,
    merchantId: 10,
    title: '云南高山苹果',
    subtitle: '产地直发，新鲜采摘',
    originPlace: '云南昭通',
    coverUrl: cdn('product-apple-cover.png'),
    detailDesc: '高海拔果园直采，果肉细腻，甜度稳定。',
    deliveryType: 1,
    isPreSale: false,
    isFavorite: false,
    images: [
      cdn('product-apple-1.png'),
      cdn('product-apple-2.png'),
    ],
    videos: [
      {
        videoUrl: cdn('product-apple-video.mp4'),
        coverUrl: cdn('product-apple-video-cover.png'),
      },
    ],
    skus: [
      {
        id: 2001,
        skuName: '5斤装',
        price: '39.90',
        originalPrice: '49.90',
        stock: 100,
        lockedStock: 6,
        specJson: { weight: '5斤' },
      },
      {
        id: 2002,
        skuName: '10斤装',
        price: '59.90',
        originalPrice: '69.90',
        stock: 60,
        lockedStock: 4,
        specJson: { weight: '10斤' },
      },
    ],
    traceInfo: {
      traceCode: 'TRACE20260001',
      traceDesc: '云南昭通果园直采',
      traceUrl: trace('TRACE20260001'),
    },
  },
  1002: {
    id: 1002,
    categoryId: 4,
    merchantId: 11,
    title: '东北黑木耳礼盒',
    subtitle: '山珍干货，礼赠佳品',
    originPlace: '黑龙江牡丹江',
    coverUrl: cdn('product-fungus-cover.png'),
    detailDesc: '自然晾晒，干净饱满，适合礼赠和家庭食用。',
    deliveryType: 1,
    isPreSale: false,
    isFavorite: false,
    images: [cdn('product-fungus-1.png')],
    videos: [],
    skus: [
      {
        id: 3001,
        skuName: '礼盒装',
        price: '29.90',
        originalPrice: '39.90',
        stock: 80,
        lockedStock: 2,
        specJson: { gift: '礼盒装' },
      },
    ],
    traceInfo: {
      traceCode: 'TRACE20260002',
      traceDesc: '黑龙江源头直供',
      traceUrl: trace('TRACE20260002'),
    },
  },
} as const;

export const scaffoldCartGroups = [
  {
    merchantId: 10,
    storeName: '云南果园农户',
    items: [
      {
        cartId: 1,
        productId: 1001,
        skuId: 2001,
        title: '云南高山苹果',
        skuName: '5斤装',
        price: '39.90',
        quantity: 2,
        checked: true,
        stock: 100,
        coverUrl: cdn('product-apple-cover.png'),
      },
    ],
  },
];

export const scaffoldOrders = [
  {
    orderNo: `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    merchantId: 10,
    storeName: '云南果园农户',
    status: 1,
    payStatus: 0,
    deliveryStatus: 0,
    afterSaleStatus: 0,
    totalAmount: '79.80',
    freightAmount: '0.00',
    discountAmount: '0.00',
    payAmount: '79.80',
    items: [
      {
        orderItemId: 1,
        productId: 1001,
        skuId: 2001,
        title: '云南高山苹果',
        skuName: '5斤装',
        price: '39.90',
        quantity: 2,
        subtotal: '79.80',
        coverUrl: cdn('product-apple-cover.png'),
      },
    ],
  },
];

export const scaffoldCoupons = [
  {
    couponId: 1,
    name: '新人立减券',
    type: 'CASH',
    thresholdAmount: '50.00',
    discountAmount: '10.00',
    stock: 1000,
    issuedStock: 240,
    received: false,
  },
  {
    couponId: 2,
    name: '满减券',
    type: 'CASH',
    thresholdAmount: '99.00',
    discountAmount: '20.00',
    stock: 800,
    issuedStock: 300,
    received: true,
  },
];

export const scaffoldPointsLogs = [
  {
    id: 1,
    changeType: 'EARN',
    points: 120,
    sourceType: 'ORDER',
    sourceNo: 'NO202606070001',
    remark: '订单完成奖励',
    createdAt: '2026-06-07T10:00:00.000Z',
  },
  {
    id: 2,
    changeType: 'DEDUCT',
    points: -20,
    sourceType: 'REFUND',
    sourceNo: 'RF202606070001',
    remark: '售后扣回积分',
    createdAt: '2026-06-07T12:00:00.000Z',
  },
];

export const scaffoldLeaderCommissions = [
  {
    id: 1,
    orderNo: 'NO202606070001',
    commissionAmount: '8.00',
    status: 'PENDING_SETTLEMENT',
    remark: '自提订单分佣',
  },
];

export const scaffoldMerchantWallet = {
  availableAmount: '1832.50',
  frozenAmount: '500.00',
  totalIncome: '6200.00',
  totalWithdrawn: '4367.50',
};

export const scaffoldDashboardOverview = {
  salesAmount: '128780.50',
  orderCount: 1832,
  userCount: 1024,
  merchantCount: 18,
};

export const scaffoldDashboardSales = [
  { date: '2026-06-01', salesAmount: '1280.00', orderCount: 22 },
  { date: '2026-06-02', salesAmount: '1688.50', orderCount: 31 },
];

export const scaffoldHotProducts = [
  {
    id: 1001,
    title: '云南高山苹果',
    salesCount: 3821,
    coverUrl: cdn('product-apple-cover.png'),
  },
  {
    id: 1002,
    title: '东北黑木耳礼盒',
    salesCount: 1210,
    coverUrl: cdn('product-fungus-cover.png'),
  },
];

export const scaffoldOriginSales = [
  { originPlace: '云南昭通', salesAmount: '43880.00', orderCount: 620 },
  { originPlace: '黑龙江牡丹江', salesAmount: '29120.00', orderCount: 358 },
];

export const scaffoldAdminUsers = [
  {
    id: 1,
    nickname: '田间小橙子',
    mobile: '13800000001',
    status: 'NORMAL',
    points: 1280,
    orderCount: 18,
    lastLoginAt: '2026-06-07 19:20',
  },
  {
    id: 2,
    nickname: '果园老李',
    mobile: '13800000002',
    status: 'NORMAL',
    points: 760,
    orderCount: 9,
    lastLoginAt: '2026-06-07 18:42',
  },
  {
    id: 3,
    nickname: '山野阿梅',
    mobile: '13800000003',
    status: 'DISABLED',
    points: 120,
    orderCount: 2,
    lastLoginAt: '2026-06-06 21:10',
  },
];

export const scaffoldAdminMerchants = [
  {
    id: 10,
    storeName: '云南果园农户',
    contactName: '张三',
    mobile: '13811110000',
    region: '云南昭通',
    auditStatus: 'APPROVED',
    productCount: 12,
    walletAmount: '1832.50',
    createdAt: '2026-05-29 09:30',
  },
  {
    id: 11,
    storeName: '黑土山珍馆',
    contactName: '李四',
    mobile: '13811110001',
    region: '黑龙江牡丹江',
    auditStatus: 'PENDING_AUDIT',
    productCount: 6,
    walletAmount: '620.00',
    createdAt: '2026-06-02 10:15',
  },
  {
    id: 12,
    storeName: '乡味礼盒铺',
    contactName: '王五',
    mobile: '13811110002',
    region: '湖南长沙',
    auditStatus: 'REJECTED',
    productCount: 4,
    walletAmount: '0.00',
    createdAt: '2026-06-05 15:20',
  },
];

export const scaffoldAdminProducts = [
  {
    id: 1001,
    title: '云南高山苹果',
    merchantName: '云南果园农户',
    categoryName: '时令果蔬',
    auditStatus: 'APPROVED',
    status: 'ON_SHELF',
    minPrice: '39.90',
    salesCount: 3821,
    updatedAt: '2026-06-07 13:08',
  },
  {
    id: 1002,
    title: '东北黑木耳礼盒',
    merchantName: '黑土山珍馆',
    categoryName: '特产礼盒',
    auditStatus: 'PENDING_AUDIT',
    status: 'OFF_SHELF',
    minPrice: '29.90',
    salesCount: 1210,
    updatedAt: '2026-06-06 11:28',
  },
  {
    id: 1003,
    title: '山野香米 10kg',
    merchantName: '乡味礼盒铺',
    categoryName: '粮油干货',
    auditStatus: 'REJECTED',
    status: 'DRAFT',
    minPrice: '69.90',
    salesCount: 320,
    updatedAt: '2026-06-05 16:00',
  },
];

export const scaffoldAdminActivities = [
  {
    id: 1,
    activityName: '限时秒杀',
    activityType: 'SECKILL',
    status: 'RUNNING',
    startAt: '2026-06-07 10:00',
    endAt: '2026-06-07 22:00',
    productCount: 8,
  },
  {
    id: 2,
    activityName: '周末拼团',
    activityType: 'GROUP_BUY',
    status: 'DRAFT',
    startAt: '2026-06-08 09:00',
    endAt: '2026-06-10 23:00',
    productCount: 5,
  },
  {
    id: 3,
    activityName: '满减专区',
    activityType: 'CASHBACK',
    status: 'ENDED',
    startAt: '2026-05-28 00:00',
    endAt: '2026-06-03 23:59',
    productCount: 11,
  },
];

export const scaffoldAdminRefunds = [
  {
    refundNo: 'RF202606070001',
    orderNo: 'NO202606070001',
    userName: '田间小橙子',
    merchantName: '云南果园农户',
    amount: '20.00',
    status: 'PENDING_ARBITRATION',
    createdAt: '2026-06-07 14:10',
  },
  {
    refundNo: 'RF202606070002',
    orderNo: 'NO202606070002',
    userName: '果园老李',
    merchantName: '黑土山珍馆',
    amount: '39.90',
    status: 'MERCHANT_REPLIED',
    createdAt: '2026-06-07 16:25',
  },
  {
    refundNo: 'RF202606070003',
    orderNo: 'NO202606070003',
    userName: '山野阿梅',
    merchantName: '乡味礼盒铺',
    amount: '15.00',
    status: 'APPROVED',
    createdAt: '2026-06-06 18:45',
  },
];

export const scaffoldBanners = [
  {
    id: 1,
    title: '春季产地直发',
    imageUrl: cdn('banner-spring.png'),
    linkType: 'activity',
    linkId: 1,
    sortOrder: 1,
    status: 'ENABLED',
  },
  {
    id: 2,
    title: '新鲜水果专场',
    imageUrl: cdn('banner-fruit.png'),
    linkType: 'product',
    linkId: 1001,
    sortOrder: 2,
    status: 'ENABLED',
  },
];

export const scaffoldLogisticsRules = [
  {
    id: 1,
    name: '同城冷链配送',
    province: '广东',
    thresholdAmount: '88.00',
    freightAmount: '0.00',
    active: true,
  },
  {
    id: 2,
    name: '跨省标准配送',
    province: '全国',
    thresholdAmount: '99.00',
    freightAmount: '8.00',
    active: true,
  },
  {
    id: 3,
    name: '偏远地区附加费',
    province: '西藏/新疆',
    thresholdAmount: '199.00',
    freightAmount: '15.00',
    active: false,
  },
];

export const scaffoldSystemSettings = {
  siteName: '湾源农仓运营管理后台',
  adminCount: 6,
  permissionNodeCount: 128,
  operationLogCount: 8926,
  systemEntryCount: 14,
  customerServiceHotline: '400-800-2026',
  auditMode: 'STRICT',
};

export const scaffoldOperationLogs = [
  {
    id: 1,
    operator: '平台管理员',
    operatorAccount: 'admin@wanyuan',
    module: '商品管理',
    action: '下架商品',
    createdAt: '2026-06-07 14:22',
    riskLevel: '中风险',
  },
  {
    id: 2,
    operator: '运营小林',
    operatorAccount: 'ops@wanyuan',
    module: '活动管理',
    action: '上线 Banner',
    createdAt: '2026-06-07 13:40',
    riskLevel: '正常',
  },
  {
    id: 3,
    operator: '客服阿宁',
    operatorAccount: 'cs@wanyuan',
    module: '售后仲裁',
    action: '同意退款',
    createdAt: '2026-06-06 21:55',
    riskLevel: '高风险',
  },
];

export function paginate<T>(items: T[], page = 1, pageSize = 10): Pagination<T> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
  const start = (safePage - 1) * safePageSize;
  const sliced = items.slice(start, start + safePageSize);

  return {
    items: sliced,
    page: safePage,
    pageSize: safePageSize,
    total: items.length,
  };
}

export function getProductDetail(productId: number) {
  const detail = scaffoldProductDetails[productId as keyof typeof scaffoldProductDetails];

  if (!detail) {
    return null;
  }

  return {
    ...detail,
    isFavorite: false,
  };
}
