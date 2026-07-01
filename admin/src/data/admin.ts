export type ResourceKey =
  | 'users'
  | 'merchants'
  | 'products'
  | 'coupons'
  | 'exchange'
  | 'activities'
  | 'orders'
  | 'refunds'
  | 'withdraws'
  | 'logistics'
  | 'messages'
  | 'chat'
  | 'leaders'
  | 'pickup-points'
  | 'commissions';

export interface NavItem {
  key: string;
  label: string;
  to: string;
  icon: string;
  badgeKey?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: string;
  items: NavItem[];
}

export interface ColumnDef {
  key: string;
  label: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface ResourceConfig {
  title: string;
  searchPlaceholder: string;
  primaryAction: string;
  secondaryAction: string;
  columns: ColumnDef[];
  filters?: FilterDef[];
}

export const navItems: NavItem[] = [
  { key: 'dashboard', label: '控制台首页', to: '/dashboard', icon: 'home' },
  { key: 'analytics', label: '数据看板', to: '/analytics', icon: 'discover' },

  { key: 'merchants', label: '商户管理', to: '/merchants', icon: 'shop' },
  { key: 'products', label: '商品管理', to: '/products', icon: 'package', badgeKey: 'pendingProductAudit' },
  { key: 'categories', label: '分类管理', to: '/categories', icon: 'category' },
  { key: 'orders', label: '订单履约', to: '/orders', icon: 'orderPendingShip' },
  { key: 'logistics', label: '物流配置', to: '/logistics', icon: 'delivering' },
  { key: 'refunds', label: '售后仲裁', to: '/refunds', icon: 'refund', badgeKey: 'pendingRefund' },
  { key: 'withdraws', label: '提现审核', to: '/withdraws', icon: 'wallet', badgeKey: 'pendingWithdraw' },
  { key: 'chat', label: '客服会话', to: '/chat', icon: 'support' },

  { key: 'coupons', label: '优惠券管理', to: '/coupons', icon: 'coupon' },
  { key: 'exchangeCoupons', label: '兑换券管理', to: '/exchange/coupons', icon: 'redPacket' },
  { key: 'exchangeProducts', label: '兑换商品管理', to: '/exchange/products', icon: 'shopBag' },
  { key: 'activities', label: '活动管理', to: '/activities', icon: 'flash' },
  { key: 'banners', label: '轮播广告', to: '/banners', icon: 'image' },
  { key: 'messages', label: '公告管理', to: '/messages', icon: 'bell' },

  { key: 'users', label: '用户管理', to: '/users', icon: 'profile' },
  { key: 'admins', label: '管理员管理', to: '/admins', icon: 'member' },
  { key: 'settings', label: '系统配置', to: '/settings', icon: 'settings' },

  { key: 'leaders', label: '团长管理', to: '/leaders', icon: 'group' },
  { key: 'pickup-points', label: '自提点管理', to: '/pickup-points', icon: 'map' },
  { key: 'commissions', label: '佣金管理', to: '/commissions', icon: 'invoice' },
];

export const navGroups: NavGroup[] = [
  { key: 'dashboard', label: '运营大盘', icon: 'home', items: navItems.filter((i) => ['dashboard', 'analytics'].includes(i.key)) },
  { key: 'core', label: '核心电商', icon: 'shopBag', items: navItems.filter((i) => ['merchants', 'products', 'categories', 'orders', 'logistics', 'refunds', 'withdraws'].includes(i.key)) },
  { key: 'marketing', label: '营销中心', icon: 'gift', items: navItems.filter((i) => ['coupons', 'activities', 'banners', 'messages'].includes(i.key)) },
  { key: 'exchange', label: '兑换中心', icon: 'redPacket', items: navItems.filter((i) => ['exchangeCoupons', 'exchangeProducts'].includes(i.key)) },
  { key: 'support', label: '客户服务', icon: 'support', items: navItems.filter((i) => ['chat'].includes(i.key)) },
  { key: 'leader', label: '社区团长', icon: 'group', items: navItems.filter((i) => ['leaders', 'pickup-points', 'commissions'].includes(i.key)) },
  { key: 'base', label: '系统基础', icon: 'settings', items: navItems.filter((i) => ['users', 'admins', 'settings'].includes(i.key)) },
];

export const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  users: {
    title: '用户管理',
    searchPlaceholder: '搜索昵称 / 手机号',
    primaryAction: '状态管理',
    secondaryAction: '导出',
    columns: [
      { key: 'nickname', label: '用户昵称' },
      { key: 'mobile', label: '手机号' },
      { key: 'status', label: '状态' },
      { key: 'points', label: '积分' },
      { key: 'orderCount', label: '订单数' },
      { key: 'lastLoginAt', label: '最近登录' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '正常', value: 'NORMAL' },
          { label: '禁用', value: 'DISABLED' },
        ],
      },
      {
        key: 'pointsTier',
        label: '积分层级',
        options: [
          { label: '有积分用户', value: 'hasPoints' },
          { label: '高积分 (>100)', value: 'highPoints' },
          { label: '满仓大佬 (>500)', value: 'vipPoints' },
        ],
      },
      {
        key: 'buyerTier',
        label: '买家等级',
        options: [
          { label: '已下单客户', value: 'ordered' },
          { label: '高频客户 (>=5单)', value: 'loyal' },
          { label: '至尊果农 (>=15单)', value: 'vipBuyer' },
        ],
      },
      {
        key: 'userType',
        label: '用户类型',
        options: [
          { label: '正式用户', value: 'REGULAR' },
          { label: '游客用户', value: 'GUEST' },
        ],
      },
    ],
  },
  merchants: {
    title: '商户管理',
    searchPlaceholder: '搜索店铺 / 联系人 / 手机号',
    primaryAction: '审核管理',
    secondaryAction: '导出',
    columns: [
      { key: 'storeName', label: '店铺名称' },
      { key: 'contactName', label: '联系人' },
      { key: 'mobile', label: '手机号' },
      { key: 'region', label: '区域' },
      { key: 'auditStatus', label: '审核状态' },
      { key: 'productCount', label: '商品数' },
      { key: 'walletAmount', label: '钱包余额' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'auditStatus',
        label: '审核状态',
        options: [
          { label: '待审核', value: 'PENDING_AUDIT' },
          { label: '已通过', value: 'APPROVED' },
          { label: '已拒绝', value: 'REJECTED' },
        ],
      },
    ],
  },
  products: {
    title: '商品管理',
    searchPlaceholder: '搜索商品 / 商户 / 类目',
    primaryAction: '新增商品',
    secondaryAction: '导出',
    columns: [
      { key: 'title', label: '商品' },
      { key: 'merchantName', label: '商户' },
      { key: 'categoryName', label: '类目' },
      { key: 'productNature', label: '商品属性' },
      { key: 'deliveryType', label: '商品类型' },
      { key: 'auditStatus', label: '审核状态' },
      { key: 'status', label: '上下架' },
      { key: 'minPrice', label: '最低价' },
      { key: 'salesCount', label: '销量' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'auditStatus',
        label: '审核状态',
        options: [
          { label: '待审核', value: 'PENDING_AUDIT' },
          { label: '已通过', value: 'APPROVED' },
          { label: '已拒绝', value: 'REJECTED' },
        ],
      },
      {
        key: 'status',
        label: '上下架',
        options: [
          { label: '已上架', value: 'ON_SHELF' },
          { label: '已下架', value: 'OFF_SHELF' },
          { label: '草稿', value: 'DRAFT' },
        ],
      },
      {
        key: 'productNature',
        label: '有机认证',
        options: [
          { label: '仅看有机认证', value: '有机' },
        ],
      },
      {
        key: 'deliveryType',
        label: '商品类型',
        options: [
          { label: '现货商品', value: '1' },
          { label: '预售商品', value: '2' },
        ],
      },
    ],
  },
  coupons: {
    title: '优惠券管理',
    searchPlaceholder: '搜索券名称 / 券类型',
    primaryAction: '新增优惠券',
    secondaryAction: '导出',
    columns: [
      { key: 'name', label: '券名称' },
      { key: 'type', label: '类型' },
      { key: 'thresholdAmount', label: '使用门槛' },
      { key: 'discountAmount', label: '优惠金额' },
      { key: 'stock', label: '库存' },
      { key: 'issuedStock', label: '已发放' },
      { key: 'remainingStock', label: '剩余' },
      { key: 'validStartAt', label: '开始时间' },
      { key: 'validEndAt', label: '结束时间' },
      { key: 'status', label: '状态' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '启用', value: 'ENABLED' },
          { label: '停用', value: 'DISABLED' },
          { label: '草稿', value: 'DRAFT' },
        ],
      },
      {
        key: 'type',
        label: '类型',
        options: [
          { label: '满减券', value: 'CASHBACK' },
          { label: '新人券', value: 'NEW_USER' },
          { label: '回归券', value: 'RETURNING_USER' },
        ],
      },
    ],
  },
  exchange: {
    title: '兑换中心',
    searchPlaceholder: '搜索兑换项 / 适用范围 / 类目',
    primaryAction: '新增兑换项',
    secondaryAction: '导出',
    columns: [
      { key: 'name', label: '兑换名称' },
      { key: 'type', label: '类型' },
      { key: 'discountAmount', label: '面额' },
      { key: 'thresholdAmount', label: '门槛' },
      { key: 'stock', label: '库存' },
      { key: 'status', label: '状态' },
      { key: 'actions', label: '操作' },
    ],
  },
  activities: {
    title: '活动管理',
    searchPlaceholder: '搜索活动 / 状态 / 类型',
    primaryAction: '新增活动',
    secondaryAction: '导出',
    columns: [
      { key: 'activityName', label: '活动名称' },
      { key: 'activityType', label: '类型' },
      { key: 'status', label: '状态' },
      { key: 'startAt', label: '开始时间' },
      { key: 'endAt', label: '结束时间' },
      { key: 'productCount', label: '关联商品' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '草稿', value: 'DRAFT' },
          { label: '进行中', value: 'RUNNING' },
          { label: '已结束', value: 'ENDED' },
        ],
      },
      {
        key: 'activityType',
        label: '类型',
        options: [
          { label: '秒杀', value: 'SECKILL' },
          { label: '拼团', value: 'GROUP_BUY' },
          { label: '满减', value: 'CASHBACK' },
        ],
      },
    ],
  },
  orders: {
    title: '订单列表',
    searchPlaceholder: '搜索订单号 / 用户 / 商户',
    primaryAction: '订单管理',
    secondaryAction: '导出',
    columns: [
      { key: 'orderNo', label: '订单号' },
      { key: 'userName', label: '用户' },
      { key: 'merchantName', label: '商户' },
      { key: 'status', label: '订单状态' },
      { key: 'payStatus', label: '支付' },
      { key: 'deliveryStatus', label: '发货' },
      { key: 'totalAmount', label: '金额' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '订单状态',
        options: [
          { label: '待支付', value: 'PENDING_PAY' },
          { label: '待发货', value: 'TO_SHIP' },
          { label: '已完成', value: 'COMPLETED' },
        ],
      },
      {
        key: 'payStatus',
        label: '支付状态',
        options: [
          { label: '待支付', value: '0' },
          { label: '已支付', value: '1' },
        ],
      },
      {
        key: 'deliveryStatus',
        label: '发货状态',
        options: [
          { label: '未发货', value: '0' },
          { label: '待发货', value: '1' },
          { label: '已发货', value: '2' },
        ],
      },
    ],
  },
  refunds: {
    title: '售后仲裁',
    searchPlaceholder: '搜索售后单 / 订单号 / 用户',
    primaryAction: '仲裁管理',
    secondaryAction: '导出',
    columns: [
      { key: 'refundNo', label: '售后单号' },
      { key: 'orderNo', label: '订单号' },
      { key: 'userName', label: '用户' },
      { key: 'merchantName', label: '商户' },
      { key: 'amount', label: '退款金额' },
      { key: 'status', label: '状态' },
      { key: 'createdAt', label: '创建时间' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '售后状态',
        options: [
          { label: '待仲裁', value: 'PENDING_ARBITRATION' },
          { label: '商家回复', value: 'MERCHANT_REPLIED' },
          { label: '已通过', value: 'APPROVED' },
        ],
      },
    ],
  },
  withdraws: {
    title: '提现审核',
    searchPlaceholder: '搜索提现单号 / 商户',
    primaryAction: '审核管理',
    secondaryAction: '导出',
    columns: [
      { key: 'withdrawNo', label: '提现单号' },
      { key: 'merchantName', label: '商户' },
      { key: 'amount', label: '提现金额' },
      { key: 'fee', label: '手续费' },
      { key: 'status', label: '状态' },
      { key: 'auditedBy', label: '审核人' },
      { key: 'auditedAt', label: '审核时间' },
      { key: 'createdAt', label: '申请时间' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '待审核', value: 'PENDING' },
          { label: '已通过', value: 'APPROVED' },
          { label: '已拒绝', value: 'REJECTED' },
        ],
      },
    ],
  },
  logistics: {
    title: '物流配置',
    searchPlaceholder: '搜索规则 / 地区 / 模板',
    primaryAction: '规则管理',
    secondaryAction: '导出',
    columns: [
      { key: 'name', label: '规则名称' },
      { key: 'province', label: '适用地区' },
      { key: 'thresholdAmount', label: '包邮门槛' },
      { key: 'freightAmount', label: '运费' },
      { key: 'active', label: '启用' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'active',
        label: '状态',
        options: [
          { label: '启用', value: 'true' },
          { label: '停用', value: 'false' },
        ],
      },
    ],
  },
  chat: {
    title: '客服会话',
    searchPlaceholder: '搜索买家 / 商户 / 场景',
    primaryAction: '会话管理',
    secondaryAction: '刷新',
    columns: [
      { key: 'conversationKey', label: '会话标识' },
      { key: 'merchantName', label: '商户' },
      { key: 'buyerName', label: '买家' },
      { key: 'sceneLabel', label: '场景' },
      { key: 'lastMessageAt', label: '最后消息' },
      { key: 'actions', label: '操作' },
    ],
  },
  messages: {
    title: '公告管理',
    searchPlaceholder: '搜索公告标题 / 摘要',
    primaryAction: '发布新公告',
    secondaryAction: '导出',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'type', label: '公告分类' },
      { key: 'title', label: '标题' },
      { key: 'summary', label: '摘要' },
      { key: 'targetType', label: '发送范围' },
      { key: 'publishAt', label: '发布时间' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'type',
        label: '分类',
        options: [
          { label: '公告', value: 'NOTICE' },
          { label: '系统', value: 'SYSTEM' },
          { label: '活动', value: 'ACTIVITY' },
          { label: '订单', value: 'ORDER' },
        ],
      },
    ],
  },
  leaders: {
    title: '团长管理',
    searchPlaceholder: '搜索团长 / 手机号',
    primaryAction: '新增团长',
    secondaryAction: '刷新',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'realName', label: '姓名' },
      { key: 'mobile', label: '手机号' },
      { key: 'status', label: '状态' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '待审核', value: 'PENDING_AUDIT' },
          { label: '已通过', value: 'APPROVED' },
          { label: '已拒绝', value: 'REJECTED' },
          { label: '已禁用', value: 'DISABLED' },
        ],
      },
    ],
  },
  'pickup-points': {
    title: '自提点管理',
    searchPlaceholder: '搜索自提点 / 地址',
    primaryAction: '新增自提点',
    secondaryAction: '刷新',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: '名称' },
      { key: 'city', label: '城市' },
      { key: 'status', label: '状态' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '启用', value: 'ENABLED' },
          { label: '停用', value: 'DISABLED' },
        ],
      },
    ],
  },
  commissions: {
    title: '佣金管理',
    searchPlaceholder: '搜索团长ID / 状态',
    primaryAction: '批量结算',
    secondaryAction: '刷新',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'leaderId', label: '团长ID' },
      { key: 'commissionAmount', label: '佣金金额' },
      { key: 'status', label: '状态' },
      { key: 'actions', label: '操作' },
    ],
    filters: [
      {
        key: 'status',
        label: '状态',
        options: [
          { label: '待结算', value: 'PENDING_SETTLEMENT' },
          { label: '已结算', value: 'SETTLED' },
          { label: '已取消', value: 'CANCELLED' },
        ],
      },
    ],
  },
};
