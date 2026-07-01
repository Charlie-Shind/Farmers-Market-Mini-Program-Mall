type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  message?: string;
  [key: string]: unknown;
};

type JsonRecord = Record<string, unknown>;

type AuthTokens = {
  admin: string;
  user: string;
  merchant: string;
};

type TestContext = {
  tokens: AuthTokens;
  categoryId: number;
  productId: number;
  productSkuId: number;
  draftId: string;
  draftProductId: number;
  activityId: number;
  activityDraftId: string;
  orderNo: string;
  orderItemId: number;
  refundNo: string;
  merchantWalletBalance: number;
};

const BASE = `http://127.0.0.1:${process.env.BACKEND_PORT ?? 6002}/api`;
const fetchFn: typeof fetch = globalThis.fetch;
const isOkStatus = (status: number) => status === 200 || status === 201;

class Recorder {
  private readonly rows: Array<{ name: string; passed: boolean; detail?: string }> = [];

  check(name: string, passed: boolean, detail?: string) {
    this.rows.push({ name, passed, detail });
    const icon = passed ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${name}${detail ? ` - ${detail}` : ''}`);
  }

  summary() {
    const passed = this.rows.filter((row) => row.passed).length;
    const failed = this.rows.length - passed;
    console.log(`\nSummary: ${passed}/${this.rows.length} passed`);
    if (failed > 0) {
      console.log(`Failed: ${failed}`);
      process.exitCode = 1;
    }
  }
}

const recorder = new Recorder();

function unwrap<T = unknown>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? (value as JsonRecord) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isFinite(num) ? num : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function firstNumberFromTree(nodes: unknown[]): number {
  for (const node of nodes) {
    const obj = asObject(node);
    const id = asNumber(obj.id, 0);
    const children = Array.isArray(obj.children) ? obj.children : [];
    if (id > 0 && children.length === 0) {
      return id;
    }
    const nested = firstNumberFromTree(children);
    if (nested > 0) {
      return nested;
    }
    if (id > 0) {
      return id;
    }
  }
  return 0;
}

async function request<T = unknown>(
  method: Method,
  path: string,
  options: { token?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<{ status: number; data: T | null }> {
  const query = options.query
    ? `?${Object.entries(options.query)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')}`
    : '';
  const res = await fetchFn(`${BASE}${path}${query}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status === 201 ? 200 : res.status, data };
}

async function loginAdmin(recorderToken: Recorder): Promise<string> {
  const { status, data } = await request('POST', '/admin/auth/login', {
    body: { username: 'admin', password: 'admin123456' },
  });
  const payload = unwrap<JsonRecord>(data);
  const token = asString(payload.accessToken);
  recorderToken.check('管理员登录', isOkStatus(status) && Boolean(token), `status=${status}`);
  return token;
}

async function loginUserWithCode(code: string, nickname: string, recorderToken: Recorder): Promise<string> {
  const { status, data } = await request('POST', '/auth/wechat/login', {
    body: { code, nickname, avatarUrl: '' },
  });
  const payload = unwrap<JsonRecord>(data);
  const token = asString(payload.accessToken);
  recorderToken.check(`${nickname} 登录`, isOkStatus(status) && Boolean(token), `status=${status}`);
  return token;
}

async function loginUser(codePrefix: string, nickname: string, recorderToken: Recorder): Promise<{ token: string; code: string }> {
  const code = `${codePrefix}_${Date.now()}`;
  const token = await loginUserWithCode(code, nickname, recorderToken);
  return { token, code };
}

async function bootstrapMerchant(tokens: AuthTokens, userCode: string, recorderToken: Recorder): Promise<number> {
  const { status, data } = await request('POST', '/merchant/apply', {
    token: tokens.user,
    body: {
      storeName: '湾源集成测试商店',
      contactName: '测试店长',
      contactMobile: '13900001111',
      qualifications: [],
    },
  });
  const payload = unwrap<JsonRecord>(data);
  const merchantId = asNumber(payload.merchantId, 0);
  recorderToken.check('商户申请提交', isOkStatus(status) && merchantId > 0, `status=${status}, merchantId=${merchantId || 'N/A'}`);
  const audit = await request('POST', `/admin/merchants/${merchantId}/audit`, {
    token: tokens.admin,
    body: { auditStatus: 3, remark: 'integration approved' },
  });
  recorderToken.check('商户审核通过', isOkStatus(audit.status), `status=${audit.status}`);
  const relogin = await loginUserWithCode(userCode, '测试商家', recorderToken);
  tokens.merchant = relogin;
  return merchantId;
}

async function pickCategoryId(tokens: AuthTokens): Promise<number> {
  const { status, data } = await request('GET', '/app/categories');
  const payload = unwrap<unknown[]>(data);
  const categoryId = Array.isArray(payload) ? firstNumberFromTree(payload) : 0;
  recorder.check('读取分类树', status === 200 && categoryId > 0, `status=${status}, categoryId=${categoryId || 'N/A'}`);
  return categoryId;
}

async function createProduct(tokens: AuthTokens, categoryId: number, titlePrefix: string) {
  const title = `${titlePrefix} ${Date.now()}`;
  const body = {
    categoryId,
    title,
    subtitle: '集成测试商品',
    coverUrl: '',
    price: '19.90',
    originalPrice: '29.90',
    stock: 20,
    skus: [
      {
        skuName: '标准装',
        skuCode: `SKU-${Date.now()}`,
        price: '19.90',
        originalPrice: '29.90',
        stock: 20,
      },
    ],
  };
  const created = await request('POST', '/merchant/products', {
    token: tokens.merchant,
    body,
  });
  const createdPayload = unwrap<JsonRecord>(created.data);
  const productId = asNumber(createdPayload.productId, 0);
  recorder.check('创建商品', created.status === 200 && productId > 0, `status=${created.status}, productId=${productId || 'N/A'}`);

  const detail = await request('GET', `/merchant/products/${productId}`, { token: tokens.merchant });
  const detailPayload = unwrap<JsonRecord>(detail.data);
  const skus = Array.isArray(detailPayload.skus) ? detailPayload.skus : [];
  const skuId = asNumber(asObject(skus[0]).skuId ?? asObject(skus[0]).id, 0);
  recorder.check('商品详情可读', detail.status === 200 && skuId > 0, `status=${detail.status}, skuId=${skuId || 'N/A'}`);

  const audit = await request('POST', `/admin/products/${productId}/audit`, {
    token: tokens.admin,
    body: { auditStatus: 3, remark: 'product approved' },
  });
  recorder.check('商品审核通过', audit.status === 200, `status=${audit.status}`);

  const onShelf = await request('PATCH', `/merchant/products/${productId}/status`, {
    token: tokens.merchant,
    body: { status: 'ON_SHELF' },
  });
  recorder.check('商品上架', onShelf.status === 200, `status=${onShelf.status}`);

  const publicDetail = await request('GET', `/app/products/${productId}`);
  const publicPayload = unwrap<JsonRecord>(publicDetail.data);
  const publicSkus = Array.isArray(publicPayload.skus) ? publicPayload.skus : [];
  recorder.check('C 端商品详情可读', publicDetail.status === 200 && publicSkus.length > 0, `status=${publicDetail.status}`);

  return { productId, skuId, title };
}

async function createProductDraft(tokens: AuthTokens, categoryId: number, titlePrefix: string) {
  const title = `${titlePrefix} ${Date.now()}`;
  const draftBody = {
    title,
    categoryId,
    coverUrl: '',
    price: '15.60',
    originalPrice: '18.80',
    skus: [
      {
        skuName: '草稿规格',
        skuCode: `DRAFT-${Date.now()}`,
        skuImageUrl: '',
        specJson: { label: 'default' },
        price: '15.60',
        originalPrice: '18.80',
        stock: 15,
      },
    ],
    form: {
      title,
      subtitle: '草稿测试商品',
      coverUrl: '',
      price: '15.60',
      originalPrice: '18.80',
      stock: 15,
      traceCode: `DRAFTTRACE-${Date.now()}`,
      traceDesc: '草稿发布溯源',
    },
    selectedCategory: { id: categoryId },
    generatedSkuRows: [],
  };
  const created = await request('POST', '/merchant/products/drafts', {
    token: tokens.merchant,
    body: draftBody,
  });
  const createdPayload = unwrap<JsonRecord>(created.data);
  const draftId = asString(createdPayload.draftId);
  recorder.check('创建商品草稿', created.status === 200 && Boolean(draftId), `status=${created.status}, draftId=${draftId || 'N/A'}`);

  const detail = await request('GET', `/merchant/products/drafts/${draftId}`, { token: tokens.merchant });
  const detailPayload = unwrap<JsonRecord>(detail.data);
  recorder.check('读取商品草稿', detail.status === 200 && asString(detailPayload.draftId) === draftId, `status=${detail.status}`);

  const update = await request('PUT', `/merchant/products/drafts/${draftId}`, {
    token: tokens.merchant,
    body: {
      ...draftBody,
      title: `${title} - 已更新`,
      form: { ...draftBody.form, title: `${title} - 已更新` },
    },
  });
  recorder.check('更新商品草稿', update.status === 200, `status=${update.status}`);

  const publish = await request('POST', `/merchant/products/drafts/${draftId}/publish`, { token: tokens.merchant });
  const publishPayload = unwrap<JsonRecord>(publish.data);
  const draftProductId = asNumber(publishPayload.productId, 0);
  recorder.check('发布商品草稿', publish.status === 200 && draftProductId > 0, `status=${publish.status}, productId=${draftProductId || 'N/A'}`);

  return { draftId, draftProductId };
}

async function createActivity(tokens: AuthTokens, categoryId: number, productId: number, skuId: number, titlePrefix: string) {
  const activityTitle = `${titlePrefix} ${Date.now()}`;
  const payload = {
    activityName: activityTitle,
    title: activityTitle,
    activityType: 'FLASH_SALE',
    status: 'DRAFT',
    startAt: new Date(Date.now() + 60_000).toISOString(),
    endAt: new Date(Date.now() + 3_600_000).toISOString(),
    productCount: 1,
    ruleJson: {
      type: 'FLASH_SALE',
      categoryId,
    },
    remark: 'integration activity',
    products: [
      {
        productId,
        skuId,
        activityPrice: '9.90',
        activityStock: 5,
        limitPerUser: 1,
        sortOrder: 1,
        status: 'ENABLED',
      },
    ],
  };
  const created = await request('POST', '/merchant/activities', {
    token: tokens.merchant,
    body: payload,
  });
  const createdPayload = unwrap<JsonRecord>(created.data);
  const activityId = asNumber(createdPayload.activityId, 0);
  recorder.check('创建活动', created.status === 200 && activityId > 0, `status=${created.status}, activityId=${activityId || 'N/A'}`);

  const detail = await request('GET', `/merchant/activities/${activityId}`, { token: tokens.merchant });
  const detailPayload = unwrap<JsonRecord>(detail.data);
  recorder.check('读取活动详情', detail.status === 200 && asNumber(detailPayload.activityId, 0) === activityId, `status=${detail.status}`);

  const candidates = await request('GET', '/merchant/activities/product-candidates', {
    token: tokens.merchant,
    query: { keyword: titlePrefix, pageSize: 5 },
  });
  const candidatePayload = unwrap<JsonRecord>(candidates.data);
  recorder.check('活动选品列表', candidates.status === 200 && Array.isArray(candidatePayload.items), `status=${candidates.status}`);

  const update = await request('PATCH', `/merchant/activities/${activityId}`, {
    token: tokens.merchant,
    body: {
      ...payload,
      activityName: `${activityTitle} - 已更新`,
      remark: 'updated remark',
    },
  });
  recorder.check('更新活动', update.status === 200, `status=${update.status}`);

  const publish = await request('POST', `/merchant/activities/${activityId}/publish`, { token: tokens.merchant });
  recorder.check('发布活动', publish.status === 200, `status=${publish.status}`);

  const publicList = await request('GET', '/app/activities', { query: { pageSize: 5 } });
  const publicListPayload = unwrap<JsonRecord>(publicList.data);
  recorder.check('C 端活动列表', publicList.status === 200 && Array.isArray(publicListPayload.items), `status=${publicList.status}`);

  const publicDetail = await request('GET', `/app/activities/${activityId}`);
  recorder.check('C 端活动详情', publicDetail.status === 200, `status=${publicDetail.status}`);

  const publicProducts = await request('GET', `/app/activities/${activityId}/products`);
  const publicProductsPayload = unwrap<JsonRecord>(publicProducts.data);
  recorder.check('C 端活动商品', publicProducts.status === 200 && Array.isArray(publicProductsPayload?.items), `status=${publicProducts.status}`);

  const pause = await request('POST', `/merchant/activities/${activityId}/pause`, { token: tokens.merchant });
  recorder.check('暂停活动', pause.status === 200, `status=${pause.status}`);

  const finish = await request('POST', `/merchant/activities/${activityId}/finish`, { token: tokens.merchant });
  recorder.check('结束活动', finish.status === 200, `status=${finish.status}`);

  const copy = await request('POST', `/merchant/activities/${activityId}/copy`, { token: tokens.merchant });
  const copyPayload = unwrap<JsonRecord>(copy.data);
  recorder.check('复制活动', copy.status === 200 && asNumber(copyPayload.activityId, 0) > 0, `status=${copy.status}`);

  const stats = await request('GET', `/merchant/activities/${activityId}/statistics`, { token: tokens.merchant });
  const statsPayload = unwrap<JsonRecord>(stats.data);
  recorder.check('活动统计', stats.status === 200 && Array.isArray(statsPayload.products), `status=${stats.status}`);

  return activityId;
}

async function createOrderAndAfterSales(tokens: AuthTokens, productId: number, skuId: number) {
  const address = await request('POST', '/app/addresses', {
    token: tokens.user,
    body: {
      receiverName: '测试收货人',
      receiverMobile: '13800002222',
      province: '广东省',
      city: '广州市',
      district: '天河区',
      detailAddress: '软件园一路 1 号',
    },
  });
  const addressPayload = unwrap<JsonRecord>(address.data);
  const addressId = asNumber(addressPayload.id, 0);
  recorder.check('创建收货地址', address.status === 200 && addressId > 0, `status=${address.status}`);

  const cart = await request('POST', '/app/cart/items', {
    token: tokens.user,
    body: { skuId, quantity: 2 },
  });
  const cartPayload = unwrap<JsonRecord>(cart.data);
  const cartId = asNumber(cartPayload.cartId, 0);
  recorder.check('加入购物车', cart.status === 200 && cartId > 0, `status=${cart.status}`);

  const previewBody = { cartIds: [cartId], addressId, deliveryType: 1 };
  const preview = await request('POST', '/app/orders/preview', { token: tokens.user, body: previewBody });
  const previewPayload = unwrap<JsonRecord>(preview.data);
  recorder.check('预览订单', preview.status === 200 && Boolean(previewPayload.summary), `status=${preview.status}`);

  const createdOrder = await request('POST', '/app/orders', { token: tokens.user, body: previewBody });
  const createdOrderPayload = unwrap<JsonRecord>(createdOrder.data);
  const orderNo = asString(createdOrderPayload.orderNo);
  const childOrderNos = Array.isArray(createdOrderPayload.childOrderNos)
    ? createdOrderPayload.childOrderNos.filter((item) => typeof item === 'string') as string[]
    : [];
  const orderDetailNo = childOrderNos[0] ?? orderNo;
  recorder.check('创建订单', createdOrder.status === 200 && Boolean(orderNo), `status=${createdOrder.status}, orderNo=${orderNo || 'N/A'}`);

  const pay = await request('POST', '/app/payments/wechat', { token: tokens.user, body: { orderNo } });
  const payPayload = unwrap<JsonRecord>(pay.data);
  recorder.check('拉起支付', pay.status === 200 && Boolean(payPayload.prepayId), `status=${pay.status}`);

  const callback = await request('POST', '/payments/wechat/callback', {
    body: { orderNo, out_trade_no: orderNo },
  });
  const callbackPayload = unwrap<JsonRecord>(callback.data);
  recorder.check('支付回调', callback.status === 200 && Boolean(callbackPayload.processed), `status=${callback.status}`);

  const accept = await request('POST', `/merchant/orders/${orderNo}/accept`, { token: tokens.merchant });
  recorder.check('商家接单', accept.status === 200, `status=${accept.status}`);

  const ship = await request('POST', `/merchant/orders/${orderNo}/ship`, {
    token: tokens.merchant,
    body: { trackingNo: 'SF1234567890', logisticsCompany: '顺丰冷链' },
  });
  recorder.check('商家发货', ship.status === 200, `status=${ship.status}`);

  const confirm = await request('POST', `/app/orders/${orderNo}/confirm`, { token: tokens.user });
  recorder.check('用户确认收货', confirm.status === 200, `status=${confirm.status}`);

  const orderDetail = await request('GET', `/admin/orders/${orderDetailNo}`, { token: tokens.admin });
  const orderDetailPayload = unwrap<JsonRecord>(orderDetail.data);
  const items = Array.isArray(orderDetailPayload.items) ? orderDetailPayload.items : [];
  const orderItemId = asNumber(asObject(items[0]).orderItemId ?? asObject(items[0]).id, 0);
  recorder.check('订单详情', orderDetail.status === 200 && orderItemId > 0, `status=${orderDetail.status}`);

  const review = await request('POST', `/app/orders/${orderDetailNo}/reviews`, {
    token: tokens.user,
    body: {
      orderItemId,
      rating: 5,
      content: '集成测试评价',
      images: [],
    },
  });
  recorder.check('提交订单评价', review.status === 200, `status=${review.status}`);

  const reviewList = await request('GET', `/app/orders/${orderDetailNo}/reviews`, { token: tokens.user });
  const reviewListPayload = unwrap<unknown>(reviewList.data);
  recorder.check('查询订单评价', reviewList.status === 200 && Array.isArray(reviewListPayload), `status=${reviewList.status}`);

  const refundApply = await request('POST', '/app/refunds', {
    token: tokens.user,
    body: {
      orderNo: orderDetailNo,
      orderItemId,
      applyType: 1,
      applyReason: '集成测试退款',
      applyImages: ['https://example.com/refund-1.png'],
    },
  });
  const refundPayload = unwrap<JsonRecord>(refundApply.data);
  const refundNo = asString(refundPayload.refundNo);
  recorder.check('发起退款', refundApply.status === 200 && Boolean(refundNo), `status=${refundApply.status}, refundNo=${refundNo || 'N/A'}`);

  const refundList = await request('GET', '/app/refunds', { token: tokens.user, query: { pageSize: 10 } });
  const refundListPayload = unwrap<JsonRecord>(refundList.data);
  recorder.check('查询退款列表', refundList.status === 200 && Array.isArray(refundListPayload.items), `status=${refundList.status}`);

  const refundDetail = await request('GET', `/app/refunds/${refundNo}`, { token: tokens.user });
  recorder.check('查询退款详情', refundDetail.status === 200, `status=${refundDetail.status}`);

  const supplement = await request('POST', `/app/refunds/${refundNo}/supplement`, {
    token: tokens.user,
    body: {
      applyReason: '补充图片说明',
      applyImages: ['https://example.com/refund-2.png'],
    },
  });
  recorder.check('补充退款材料', supplement.status === 200, `status=${supplement.status}`);

  const cancelRefund = await request('POST', `/app/refunds/${refundNo}/cancel`, { token: tokens.user });
  recorder.check('撤销退款申请', cancelRefund.status === 200, `status=${cancelRefund.status}`);

  const secondCart = await request('POST', '/app/cart/items', {
    token: tokens.user,
    body: { skuId, quantity: 1 },
  });
  const secondCartId = asNumber(unwrap<JsonRecord>(secondCart.data).cartId, 0);
  const secondOrder = await request('POST', '/app/orders', {
    token: tokens.user,
    body: { cartIds: [secondCartId], addressId, deliveryType: 1 },
  });
  const secondOrderNo = asString(unwrap<JsonRecord>(secondOrder.data).orderNo);
  const secondChildOrderNos = Array.isArray(unwrap<JsonRecord>(secondOrder.data).childOrderNos)
    ? (unwrap<JsonRecord>(secondOrder.data).childOrderNos as unknown[]).filter((item) => typeof item === 'string') as string[]
    : [];
  const secondOrderDetailNo = secondChildOrderNos[0] ?? secondOrderNo;
  await request('POST', '/app/payments/wechat', { token: tokens.user, body: { orderNo: secondOrderNo } });
  await request('POST', '/payments/wechat/callback', { body: { orderNo: secondOrderNo, out_trade_no: secondOrderNo } });
  await request('POST', `/merchant/orders/${secondOrderNo}/accept`, { token: tokens.merchant });
  await request('POST', `/merchant/orders/${secondOrderNo}/ship`, {
    token: tokens.merchant,
    body: { trackingNo: 'SF9988776655', logisticsCompany: '顺丰冷链' },
  });
  await request('POST', `/app/orders/${secondOrderNo}/confirm`, { token: tokens.user });
  const secondDetail = await request('GET', `/app/orders/${secondOrderDetailNo}`, { token: tokens.user });
  const secondDetailPayload = unwrap<JsonRecord>(secondDetail.data);
  const secondItems = Array.isArray(secondDetailPayload.items) ? (secondDetailPayload.items as unknown[]) : [];
  const secondOrderItemId = asNumber(asObject(secondItems[0]).orderItemId ?? asObject(secondItems[0]).id, 0);
  const secondRefund = await request('POST', '/app/refunds', {
    token: tokens.user,
    body: {
      orderNo: secondOrderDetailNo,
      orderItemId: secondOrderItemId,
      applyType: 1,
      applyReason: '商家端退款测试',
      applyImages: [],
    },
  });
  const secondRefundNo = asString(unwrap<JsonRecord>(secondRefund.data).refundNo);
  recorder.check('第二笔退款创建', secondRefund.status === 200 && Boolean(secondRefundNo), `status=${secondRefund.status}`);

  const merchantRefundList = await request('GET', '/merchant/refunds', {
    token: tokens.merchant,
    query: { pageSize: 10 },
  });
  const merchantRefundListPayload = unwrap<JsonRecord>(merchantRefundList.data);
  recorder.check('商家退款列表', merchantRefundList.status === 200 && Array.isArray(merchantRefundListPayload.items), `status=${merchantRefundList.status}`);

  const merchantRefundDetail = await request('GET', `/merchant/refunds/${secondRefundNo}`, { token: tokens.merchant });
  recorder.check('商家退款详情', merchantRefundDetail.status === 200, `status=${merchantRefundDetail.status}`);

  const merchantReject = await request('POST', `/merchant/refunds/${secondRefundNo}/process`, {
    token: tokens.merchant,
    body: { action: 'reject', remark: '材料不完整' },
  });
  recorder.check('商家处理退款', merchantReject.status === 200, `status=${merchantReject.status}`);

  const wallet = await request('GET', '/merchant/wallet', { token: tokens.merchant });
  const walletPayload = unwrap<JsonRecord>(wallet.data);
  const balance = asNumber(walletPayload.availableBalance ?? walletPayload.balance ?? walletPayload.available, 0);
  recorder.check('读取商家钱包', wallet.status === 200, `status=${wallet.status}`);

  if (balance > 0) {
    const withdraw = await request('POST', '/merchant/withdraws', {
      token: tokens.merchant,
      body: { amount: '1.00', fee: '0.00', remark: '集成测试提现' },
    });
    const withdrawPayload = unwrap<JsonRecord>(withdraw.data);
    recorder.check('创建提现申请', withdraw.status === 200 && Boolean(withdrawPayload.withdrawNo), `status=${withdraw.status}`);
  } else {
    recorder.check('创建提现申请', true, '钱包余额不足，跳过创建但保留列表检查');
  }

  const withdrawList = await request('GET', '/merchant/withdraws', { token: tokens.merchant, query: { pageSize: 10 } });
  const withdrawListPayload = unwrap<unknown>(withdrawList.data);
  recorder.check('提现列表', withdrawList.status === 200 && Array.isArray(withdrawListPayload), `status=${withdrawList.status}`);

  const deliverySetting = await request('PUT', '/merchant/delivery/settings', {
    token: tokens.merchant,
    body: {
      senderName: '测试发货人',
      senderMobile: '13900002222',
      senderAddress: '广州市天河区测试仓',
      defaultCompany: '顺丰冷链',
      coldChainEnabled: true,
      restrictedRegions: ['西藏自治区'],
    },
  });
  recorder.check('更新配送设置', deliverySetting.status === 200, `status=${deliverySetting.status}`);

  const deliveryTemplate = await request('POST', '/merchant/delivery/templates', {
    token: tokens.merchant,
    body: {
      name: '默认模板',
      province: '广东省',
      thresholdAmount: '99.00',
      freightAmount: '8.00',
      active: true,
    },
  });
  const deliveryTemplatePayload = unwrap<JsonRecord>(deliveryTemplate.data);
  const templateId = asNumber(deliveryTemplatePayload.id ?? deliveryTemplatePayload.templateId, 0);
  recorder.check('创建运费模板', deliveryTemplate.status === 200 && templateId > 0, `status=${deliveryTemplate.status}`);

  const deliveryTemplates = await request('GET', '/merchant/delivery/templates', { token: tokens.merchant });
  const deliveryTemplatesPayload = unwrap<JsonRecord>(deliveryTemplates.data);
  recorder.check('运费模板列表', deliveryTemplates.status === 200 && Array.isArray(deliveryTemplatesPayload.items ?? deliveryTemplatesPayload), `status=${deliveryTemplates.status}`);

  const notices = await request('GET', '/merchant/notices', { token: tokens.merchant, query: { pageSize: 10 } });
  const noticesPayload = unwrap<JsonRecord>(notices.data);
  recorder.check('商家通知列表', notices.status === 200 && Array.isArray(noticesPayload.items), `status=${notices.status}`);

  const readAll = await request('POST', '/merchant/notices/read-all', { token: tokens.merchant });
  recorder.check('通知一键已读', readAll.status === 200, `status=${readAll.status}`);

  const feedback = await request('POST', '/app/feedback', {
    token: tokens.user,
    body: { type: 'SERVICE', content: '集成测试反馈', images: ['https://example.com/feedback.png'] },
  });
  const feedbackPayload = unwrap<JsonRecord>(feedback.data);
  recorder.check('提交反馈', feedback.status === 200 && Boolean(feedbackPayload.feedbackId), `status=${feedback.status}`);

  const feedbackList = await request('GET', '/app/feedback/my', { token: tokens.user, query: { pageSize: 10 } });
  const feedbackListPayload = unwrap<JsonRecord>(feedbackList.data);
  recorder.check('反馈列表', feedbackList.status === 200 && Array.isArray(feedbackListPayload.items), `status=${feedbackList.status}`);
}

async function runSmokeSuite() {
  console.log(`Smoke target: ${BASE}`);
  const adminToken = await loginAdmin(recorder);
  const userSession = await loginUser('smoke_user', '冒烟用户', recorder);
  const tokens: AuthTokens = {
    admin: adminToken,
    user: userSession.token,
    merchant: '',
  };
  await bootstrapMerchant(tokens, userSession.code, recorder);
  const categoryId = await pickCategoryId(tokens);
  const product = await createProduct(tokens, categoryId, '冒烟商品');
  const draft = await createProductDraft(tokens, categoryId, '冒烟草稿');
  recorder.check('草稿发布生成商品', draft.draftProductId > 0, `draftProductId=${draft.draftProductId}`);
  const activity = await createActivity(tokens, categoryId, product.productId, product.skuId, '冒烟活动');
  recorder.check('活动链路完成', activity > 0, `activityId=${activity}`);
  await createOrderAndAfterSales(tokens, product.productId, product.skuId);

  const merchantProducts = await request('GET', '/merchant/products', { token: tokens.merchant, query: { pageSize: 5 } });
  const merchantProductsPayload = unwrap<JsonRecord>(merchantProducts.data);
  recorder.check('商家商品列表', merchantProducts.status === 200 && Array.isArray(merchantProductsPayload.items), `status=${merchantProducts.status}`);

  const merchantDrafts = await request('GET', '/merchant/products/drafts', { token: tokens.merchant, query: { pageSize: 5 } });
  const merchantDraftsPayload = unwrap<JsonRecord>(merchantDrafts.data);
  recorder.check('商家草稿列表', merchantDrafts.status === 200 && Array.isArray(merchantDraftsPayload.items), `status=${merchantDrafts.status}`);

  const merchantActivities = await request('GET', '/merchant/activities', { token: tokens.merchant, query: { pageSize: 5 } });
  const merchantActivitiesPayload = unwrap<JsonRecord>(merchantActivities.data);
  recorder.check('商家活动列表', merchantActivities.status === 200 && Array.isArray(merchantActivitiesPayload.items), `status=${merchantActivities.status}`);

  const merchantRefunds = await request('GET', '/merchant/refunds', { token: tokens.merchant, query: { pageSize: 5 } });
  const merchantRefundsPayload = unwrap<JsonRecord>(merchantRefunds.data);
  recorder.check('商家退款列表', merchantRefunds.status === 200 && Array.isArray(merchantRefundsPayload.items), `status=${merchantRefunds.status}`);

  const publicProducts = await request('GET', '/app/products', { query: { pageSize: 5 } });
  const publicProductsPayload = unwrap<JsonRecord>(publicProducts.data);
  recorder.check('C 端商品列表', publicProducts.status === 200 && Array.isArray(publicProductsPayload.items), `status=${publicProducts.status}`);

  const publicActivities = await request('GET', '/app/activities', { query: { pageSize: 5 } });
  const publicActivitiesPayload = unwrap<JsonRecord>(publicActivities.data);
  recorder.check('C 端活动列表', publicActivities.status === 200 && Array.isArray(publicActivitiesPayload.items), `status=${publicActivities.status}`);

  const publicRefunds = await request('GET', '/app/refunds', { token: tokens.user, query: { pageSize: 5 } });
  const publicRefundsPayload = unwrap<JsonRecord>(publicRefunds.data);
  recorder.check('C 端退款列表', publicRefunds.status === 200 && Array.isArray(publicRefundsPayload.items), `status=${publicRefunds.status}`);

  const notices = await request('GET', '/merchant/notices', { token: tokens.merchant, query: { pageSize: 5 } });
  const noticesPayload = unwrap<JsonRecord>(notices.data);
  recorder.check('商家通知列表', notices.status === 200 && Array.isArray(noticesPayload.items), `status=${notices.status}`);
}

async function runIntegrationSuite() {
  console.log(`Integration target: ${BASE}`);
  const adminToken = await loginAdmin(recorder);
  const userSession = await loginUser('integration_user', '集成用户', recorder);
  const tokens: AuthTokens = {
    admin: adminToken,
    user: userSession.token,
    merchant: '',
  };
  await bootstrapMerchant(tokens, userSession.code, recorder);
  const categoryId = await pickCategoryId(tokens);
  const product = await createProduct(tokens, categoryId, '集成商品');
  const draft = await createProductDraft(tokens, categoryId, '集成草稿');
  const activity = await createActivity(tokens, categoryId, product.productId, product.skuId, '集成活动');
  await createOrderAndAfterSales(tokens, product.productId, product.skuId);

  const merchantProfileUpdate = await request('PATCH', '/merchant/profile', {
    token: tokens.merchant,
    body: {
      storeName: '湾源集成测试商店 V2',
      contactName: '测试店长',
      contactMobile: '13900001111',
    },
  });
  recorder.check('更新商家资料', merchantProfileUpdate.status === 200, `status=${merchantProfileUpdate.status}`);

  const merchantNotices = await request('GET', '/merchant/notices', { token: tokens.merchant, query: { pageSize: 10 } });
  const merchantNoticePayload = unwrap<JsonRecord>(merchantNotices.data);
  recorder.check('商家通知可查', merchantNotices.status === 200 && Array.isArray(merchantNoticePayload.items), `status=${merchantNotices.status}`);

  const merchantDelivery = await request('GET', '/merchant/delivery/settings', { token: tokens.merchant });
  recorder.check('读取配送设置', merchantDelivery.status === 200, `status=${merchantDelivery.status}`);

  const productDraftDetail = await request('GET', `/merchant/products/drafts/${draft.draftId}`, { token: tokens.merchant });
  recorder.check('商品草稿详情复读', productDraftDetail.status === 200, `status=${productDraftDetail.status}`);

  const draftList = await request('GET', '/merchant/products/drafts', { token: tokens.merchant, query: { pageSize: 10 } });
  const draftListPayload = unwrap<JsonRecord>(draftList.data);
  recorder.check('商品草稿列表', draftList.status === 200 && Array.isArray(draftListPayload.items), `status=${draftList.status}`);

  const activityDraft = await request('POST', '/merchant/activities/drafts', {
    token: tokens.merchant,
    body: {
      title: '活动草稿测试',
      activityType: 'FLASH_SALE',
      form: {
        title: '活动草稿测试',
        coverUrl: '',
        price: '19.90',
        originalPrice: '29.90',
      },
      selectedCategory: { id: categoryId },
      products: [
        {
          productId: product.productId,
          skuId: product.skuId,
          activityPrice: '9.90',
        },
      ],
    },
  });
  const activityDraftPayload = unwrap<JsonRecord>(activityDraft.data);
  const activityDraftId = asString(activityDraftPayload.draftId);
  recorder.check('活动草稿创建', activityDraft.status === 200 && Boolean(activityDraftId), `status=${activityDraft.status}`);

  const activityDraftDetail = await request('GET', `/merchant/activities/drafts/${activityDraftId}`, { token: tokens.merchant });
  recorder.check('活动草稿读取', activityDraftDetail.status === 200, `status=${activityDraftDetail.status}`);

  const activityDraftUpdate = await request('PUT', `/merchant/activities/drafts/${activityDraftId}`, {
    token: tokens.merchant,
    body: {
      title: '活动草稿测试 - 更新',
      activityType: 'FLASH_SALE',
      form: {
        title: '活动草稿测试 - 更新',
        coverUrl: '',
        price: '18.90',
        originalPrice: '29.90',
      },
      selectedCategory: { id: categoryId },
      products: [
        {
          productId: product.productId,
          skuId: product.skuId,
          activityPrice: '8.90',
        },
      ],
    },
  });
  recorder.check('活动草稿更新', activityDraftUpdate.status === 200, `status=${activityDraftUpdate.status}`);

  const activityDraftPublish = await request('POST', `/merchant/activities/drafts/${activityDraftId}/publish`, { token: tokens.merchant });
  const activityDraftPublishPayload = unwrap<JsonRecord>(activityDraftPublish.data);
  const activityDraftPublishedId = asNumber(activityDraftPublishPayload.activityId, 0);
  recorder.check('活动草稿发布', activityDraftPublish.status === 200 && activityDraftPublishedId > 0, `status=${activityDraftPublish.status}`);

  const activityDraftList = await request('GET', '/merchant/activities/drafts', { token: tokens.merchant, query: { pageSize: 10 } });
  const activityDraftListPayload = unwrap<JsonRecord>(activityDraftList.data);
  recorder.check('活动草稿列表', activityDraftList.status === 200 && Array.isArray(activityDraftListPayload.items), `status=${activityDraftList.status}`);

  const merchantActivityDetail = await request('GET', `/merchant/activities/${activity}`, { token: tokens.merchant });
  recorder.check('商家活动详情', merchantActivityDetail.status === 200, `status=${merchantActivityDetail.status}`);

  const merchantCandidates = await request('GET', '/merchant/activities/product-candidates', {
    token: tokens.merchant,
    query: { pageSize: 5, keyword: '集成' },
  });
  const merchantCandidatesPayload = unwrap<JsonRecord>(merchantCandidates.data);
  recorder.check('商家活动候选商品', merchantCandidates.status === 200 && Array.isArray(merchantCandidatesPayload.items), `status=${merchantCandidates.status}`);

  const merchantReviews = await request('GET', '/merchant/reviews', { token: tokens.merchant, query: { pageSize: 10 } });
  const merchantReviewsPayload = unwrap<JsonRecord>(merchantReviews.data);
  recorder.check('商家评价列表', merchantReviews.status === 200 && Array.isArray(merchantReviewsPayload.items), `status=${merchantReviews.status}`);

  const myReviews = await request('GET', '/app/reviews/my', { token: tokens.user, query: { pageSize: 10 } });
  const myReviewsPayload = unwrap<JsonRecord>(myReviews.data);
  recorder.check('C 端我的评价', myReviews.status === 200 && Array.isArray(myReviewsPayload.items), `status=${myReviews.status}`);

  const myFeedback = await request('GET', '/app/feedback/my', { token: tokens.user, query: { pageSize: 10 } });
  const myFeedbackPayload = unwrap<JsonRecord>(myFeedback.data);
  recorder.check('C 端我的反馈', myFeedback.status === 200 && Array.isArray(myFeedbackPayload.items), `status=${myFeedback.status}`);

  const merchantLogistics = await request('GET', '/merchant/logistics/companies', { token: tokens.merchant });
  const merchantLogisticsPayload = unwrap<unknown[]>(merchantLogistics.data);
  recorder.check('物流公司列表', merchantLogistics.status === 200 && Array.isArray(merchantLogisticsPayload), `status=${merchantLogistics.status}`);

  const publicActivityList = await request('GET', '/app/activities', { query: { pageSize: 5 } });
  const publicActivityListPayload = unwrap<JsonRecord>(publicActivityList.data);
  recorder.check('公开活动列表复读', publicActivityList.status === 200 && Array.isArray(publicActivityListPayload.items), `status=${publicActivityList.status}`);

  const publicActivityDetail = await request('GET', `/app/activities/${activity}`);
  recorder.check('公开活动详情复读', publicActivityDetail.status === 200, `status=${publicActivityDetail.status}`);

  const publicActivityProducts = await request('GET', `/app/activities/${activity}/products`);
  const publicActivityProductsPayload = unwrap<JsonRecord>(publicActivityProducts.data);
  recorder.check('公开活动商品复读', publicActivityProducts.status === 200 && Array.isArray(publicActivityProductsPayload.items), `status=${publicActivityProducts.status}`);

  const merchantWallet = await request('GET', '/merchant/wallet', { token: tokens.merchant });
  const merchantWalletPayload = unwrap<JsonRecord>(merchantWallet.data);
  const balance = asNumber(merchantWalletPayload.availableBalance ?? merchantWalletPayload.balance, 0);
  recorder.check('商家钱包读取', merchantWallet.status === 200, `status=${merchantWallet.status}, balance=${balance.toFixed(2)}`);

  const merchantDashboard = await request('GET', '/merchant/dashboard', { token: tokens.merchant });
  recorder.check('商家看板', merchantDashboard.status === 200, `status=${merchantDashboard.status}`);

  const merchantOrders = await request('GET', '/merchant/orders', { token: tokens.merchant, query: { pageSize: 10 } });
  const merchantOrdersPayload = unwrap<JsonRecord>(merchantOrders.data);
  recorder.check('商家订单列表', merchantOrders.status === 200 && Array.isArray(merchantOrdersPayload.items), `status=${merchantOrders.status}`);

  const appOrders = await request('GET', '/app/orders', { token: tokens.user, query: { pageSize: 10 } });
  const appOrdersPayload = unwrap<JsonRecord>(appOrders.data);
  recorder.check('C 端订单列表', appOrders.status === 200 && Array.isArray(appOrdersPayload.items), `status=${appOrders.status}`);

  const merchantActivityStats = await request('GET', `/merchant/activities/${activity}/statistics`, { token: tokens.merchant });
  const merchantActivityStatsPayload = unwrap<JsonRecord>(merchantActivityStats.data);
  recorder.check('活动统计再验证', merchantActivityStats.status === 200 && Array.isArray(merchantActivityStatsPayload.products), `status=${merchantActivityStats.status}`);

  const merchantProfile = await request('GET', '/merchant/profile', { token: tokens.merchant });
  recorder.check('商家资料读取', merchantProfile.status === 200, `status=${merchantProfile.status}`);
}

async function main() {
  const mode = String(process.argv[2] ?? 'smoke').toLowerCase();
  try {
    if (mode === 'integration') {
      await runIntegrationSuite();
    } else {
      await runSmokeSuite();
    }
  } catch (error) {
    console.error('Test suite crashed:', error);
    process.exitCode = 1;
  } finally {
    recorder.summary();
  }
}

void main();
