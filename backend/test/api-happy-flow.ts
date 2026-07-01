import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type JsonRecord = Record<string, unknown>;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type Tokens = {
  admin: string;
  buyer: string;
  merchant: string;
};

type Context = {
  categoryId: number;
  productId: number;
  skuId: number;
  addressId: number;
  cartId: number;
  orderNo: string;
  merchantOrderNo: string;
  orderItemId: number;
  refundNo: string;
  buyerCode: string;
  merchantCode: string;
  tokens: Tokens;
};

type StepResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const BASE = `http://127.0.0.1:${process.env.BACKEND_PORT ?? 6002}/api`;
const DUMP = process.argv.includes('--dump') || (getArg('dump') != null && getArg('dump') !== 'false');

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length);
  }

  const separateIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (separateIndex >= 0 && separateIndex + 1 < process.argv.length) {
    return process.argv[separateIndex + 1];
  }

  return undefined;
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

function unwrap<T = unknown>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as { data?: T }).data as T;
  }
  return payload as T;
}

function firstLeafCategoryId(nodes: unknown[]): number {
  for (const node of nodes) {
    const obj = asObject(node);
    const id = asNumber(obj.id, 0);
    const children = Array.isArray(obj.children) ? obj.children : [];
    if (children.length === 0 && id > 0) {
      return id;
    }
    const nested = firstLeafCategoryId(children);
    if (nested > 0) {
      return nested;
    }
    if (id > 0) {
      return id;
    }
  }
  return 0;
}

class Runner {
  private readonly results: StepResult[] = [];

  async step(name: string, fn: () => Promise<void>): Promise<boolean> {
    try {
      await fn();
      this.results.push({ name, ok: true, detail: 'ok' });
      console.log(`[PASS] ${name}`);
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.results.push({ name, ok: false, detail });
      console.log(`[FAIL] ${name} - ${detail}`);
      process.exitCode = 1;
      return false;
    }
  }

  summary() {
    const passed = this.results.filter((item) => item.ok).length;
    console.log(`\nSummary: ${passed}/${this.results.length} passed`);
    if (passed !== this.results.length) {
      process.exitCode = 1;
    }
  }
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

  const response = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }

  if (DUMP) {
    console.log(
      JSON.stringify(
        {
          method,
          path,
          status: response.status,
          data,
        },
        null,
        2,
      ),
    );
  }

  return { status: response.status === 201 ? 200 : response.status, data };
}

async function loginAdmin(ctx: Context) {
  const { status, data } = await request('POST', '/admin/auth/login', {
    body: { username: 'admin', password: 'admin123456' },
  });
  const payload = asObject(unwrap(data));
  const token = asString(payload.accessToken);
  if (status !== 200 || !token) {
    throw new Error(`admin login failed: ${status}`);
  }
  ctx.tokens.admin = token;
}

async function loginWechat(code: string, nickname: string): Promise<string> {
  const { status, data } = await request('POST', '/identity/auth/wechat/login', {
    body: { code, nickname, avatarUrl: '' },
  });
  const payload = asObject(unwrap(data));
  const token = asString(payload.accessToken);
  if (status !== 200 || !token) {
    throw new Error(`wechat login failed: ${status}`);
  }
  return token;
}

async function ensureCategory(ctx: Context) {
  if (ctx.categoryId > 0) {
    return;
  }
  const { status, data } = await request('GET', '/app/categories');
  const payload = unwrap<unknown[]>(data);
  const categoryId = Array.isArray(payload) ? firstLeafCategoryId(payload) : 0;
  if (status !== 200 || categoryId <= 0) {
    throw new Error(`load categories failed: ${status}`);
  }
  ctx.categoryId = categoryId;
}

async function createMerchant(ctx: Context) {
  const apply = await request('POST', '/merchant/apply', {
    token: ctx.tokens.merchant,
    body: {
      storeName: `流程商家 ${Date.now()}`,
      contactName: '流程店长',
      contactMobile: '13900001111',
      qualifications: [],
    },
  });
  const applyPayload = asObject(unwrap(apply.data));
  const merchantId = asNumber(applyPayload.merchantId, 0);
  if (apply.status !== 200 || merchantId <= 0) {
    throw new Error(`merchant apply failed: ${apply.status}`);
  }

  const audit = await request('POST', `/admin/merchants/${merchantId}/audit`, {
    token: ctx.tokens.admin,
    body: { auditStatus: 3, remark: 'happy flow approve' },
  });
  if (audit.status !== 200) {
    throw new Error(`merchant audit failed: ${audit.status}`);
  }

  ctx.tokens.merchant = await loginWechat(ctx.merchantCode, '流程商家');
}

async function createProduct(ctx: Context) {
  const title = `流程商品 ${Date.now()}`;
  const create = await request('POST', '/merchant/products', {
    token: ctx.tokens.merchant,
    body: {
      categoryId: ctx.categoryId,
      title,
      subtitle: 'happy flow product',
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
    },
  });
  const createPayload = asObject(unwrap(create.data));
  ctx.productId = asNumber(createPayload.productId, 0);
  if (create.status !== 200 || ctx.productId <= 0) {
    throw new Error(`product create failed: ${create.status}`);
  }

  const detail = await request('GET', `/merchant/products/${ctx.productId}`, {
    token: ctx.tokens.merchant,
  });
  const detailPayload = asObject(unwrap(detail.data));
  if (detail.status !== 200) {
    throw new Error(`product detail failed: ${detail.status}`);
  }

  const skus = await request('GET', `/merchant/products/${ctx.productId}/skus`, {
    token: ctx.tokens.merchant,
  });
  const skuPayload = unwrap<unknown[]>(skus.data);
  const skuList = Array.isArray(skuPayload) ? skuPayload : [];
  ctx.skuId = asNumber(asObject(skuList[0]).skuId ?? asObject(skuList[0]).id, 0);
  if (skus.status !== 200 || ctx.skuId <= 0) {
    throw new Error(`product sku list failed: ${skus.status}`);
  }

  const audit = await request('POST', `/admin/products/${ctx.productId}/audit`, {
    token: ctx.tokens.admin,
    body: { auditStatus: 3, remark: 'happy flow approve' },
  });
  if (audit.status !== 200) {
    throw new Error(`product audit failed: ${audit.status}`);
  }

  const onShelf = await request('PATCH', `/merchant/products/${ctx.productId}/status`, {
    token: ctx.tokens.merchant,
    body: { status: 'ON_SHELF' },
  });
  if (onShelf.status !== 200) {
    throw new Error(`product on shelf failed: ${onShelf.status}`);
  }
}

async function browseAndOrder(ctx: Context) {
  const list = await request('GET', '/app/products', { query: { pageSize: 3 } });
  if (list.status !== 200) {
    throw new Error(`product list failed: ${list.status}`);
  }

  const detail = await request('GET', `/app/products/${ctx.productId}`);
  if (detail.status !== 200) {
    throw new Error(`public detail failed: ${detail.status}`);
  }

  const address = await request('POST', '/app/addresses', {
    token: ctx.tokens.buyer,
    body: {
      receiverName: '流程收货人',
      receiverMobile: '13800002222',
      province: '广东省',
      city: '广州市',
      district: '天河区',
      detailAddress: '软件园一路 1 号',
    },
  });
  const addressPayload = asObject(unwrap(address.data));
  ctx.addressId = asNumber(addressPayload.id ?? addressPayload.addressId, 0);
  if (address.status !== 200 || ctx.addressId <= 0) {
    throw new Error(`address create failed: ${address.status}`);
  }

  const cart = await request('POST', '/app/cart/items', {
    token: ctx.tokens.buyer,
    body: { skuId: ctx.skuId, quantity: 2 },
  });
  const cartPayload = asObject(unwrap(cart.data));
  ctx.cartId = asNumber(cartPayload.cartId ?? cartPayload.id, 0);
  if (cart.status !== 200 || ctx.cartId <= 0) {
    throw new Error(`cart create failed: ${cart.status}`);
  }

  const preview = await request('POST', '/app/orders/preview', {
    token: ctx.tokens.buyer,
    body: { cartIds: [ctx.cartId], addressId: ctx.addressId, deliveryType: 1 },
  });
  if (preview.status !== 200) {
    throw new Error(`order preview failed: ${preview.status}`);
  }

  const order = await request('POST', '/app/orders', {
    token: ctx.tokens.buyer,
    body: { cartIds: [ctx.cartId], addressId: ctx.addressId, deliveryType: 1 },
  });
  const orderPayload = asObject(unwrap(order.data));
  ctx.orderNo = asString(orderPayload.orderNo);
  const childOrderNos = Array.isArray(orderPayload.childOrderNos) ? orderPayload.childOrderNos : [];
  ctx.merchantOrderNo = asString(childOrderNos[0]);
  if (order.status !== 200 || !ctx.orderNo) {
    throw new Error(`order create failed: ${order.status}`);
  }
  if (!ctx.merchantOrderNo) {
    throw new Error('merchant order no missing');
  }

  const payment = await request('POST', '/app/payments/wechat', {
    token: ctx.tokens.buyer,
    body: { orderNo: ctx.orderNo },
  });
  if (payment.status !== 200) {
    throw new Error(`wechat payment failed: ${payment.status}`);
  }

  const callback = await request('POST', '/payments/wechat/callback', {
    body: { orderNo: ctx.orderNo, out_trade_no: ctx.orderNo },
  });
  if (callback.status !== 200) {
    throw new Error(`wechat callback failed: ${callback.status}`);
  }
}

async function merchantFulfill(ctx: Context) {
  const orders = await request('GET', '/merchant/orders', {
    token: ctx.tokens.merchant,
    query: { pageSize: 10 },
  });
  if (orders.status !== 200) {
    throw new Error(`merchant orders failed: ${orders.status}`);
  }

  const detail = await request('GET', `/merchant/orders/${ctx.merchantOrderNo}`, {
    token: ctx.tokens.merchant,
  });
  if (detail.status !== 200) {
    throw new Error(`merchant order detail failed: ${detail.status}`);
  }

  const accept = await request('POST', `/merchant/orders/${ctx.merchantOrderNo}/accept`, {
    token: ctx.tokens.merchant,
  });
  if (accept.status !== 200) {
    throw new Error(`order accept failed: ${accept.status}`);
  }

  const ship = await request('POST', `/merchant/orders/${ctx.merchantOrderNo}/ship`, {
    token: ctx.tokens.merchant,
    body: {
      trackingNo: `TRK${Date.now()}`,
      logisticsCompany: '顺丰冷链',
    },
  });
  if (ship.status !== 200) {
    throw new Error(`order ship failed: ${ship.status}`);
  }
}

async function buyerFinishAndRefund(ctx: Context) {
  const targetOrderNo = ctx.merchantOrderNo || ctx.orderNo;

  const detail = await request('GET', `/app/orders/${targetOrderNo}`, {
    token: ctx.tokens.buyer,
  });
  const detailPayload = asObject(unwrap(detail.data));
  const items = Array.isArray(detailPayload.items) ? detailPayload.items : [];
  ctx.orderItemId = asNumber(asObject(items[0]).orderItemId ?? asObject(items[0]).id, 0);
  if (detail.status !== 200 || ctx.orderItemId <= 0) {
    throw new Error(`order detail failed: ${detail.status}`);
  }

  const confirm = await request('POST', `/app/orders/${targetOrderNo}/confirm`, {
    token: ctx.tokens.buyer,
  });
  if (confirm.status !== 200) {
    throw new Error(`order confirm failed: ${confirm.status}`);
  }

  const review = await request('POST', `/app/orders/${targetOrderNo}/reviews`, {
    token: ctx.tokens.buyer,
    body: {
      reviews: [
        {
          orderItemId: ctx.orderItemId,
          rating: 5,
          content: '流程测试评价',
          images: [],
        },
      ],
    },
  });
  if (review.status !== 200) {
    throw new Error(`order review failed: ${review.status}`);
  }

  const refund = await request('POST', '/app/refunds', {
    token: ctx.tokens.buyer,
    body: {
      orderNo: targetOrderNo,
      orderItemId: ctx.orderItemId,
      applyType: 1,
      applyReason: '流程测试退款',
      applyImages: [],
    },
  });
  const refundPayload = asObject(unwrap(refund.data));
  ctx.refundNo = asString(refundPayload.refundNo);
  if (refund.status !== 200 || !ctx.refundNo) {
    throw new Error(`refund apply failed: ${refund.status}`);
  }
}

async function merchantHandleRefund(ctx: Context) {
  const list = await request('GET', '/merchant/refunds', {
    token: ctx.tokens.merchant,
    query: { pageSize: 10 },
  });
  if (list.status !== 200) {
    throw new Error(`merchant refund list failed: ${list.status}`);
  }

  const detail = await request('GET', `/merchant/refunds/${ctx.refundNo}`, {
    token: ctx.tokens.merchant,
  });
  if (detail.status !== 200) {
    throw new Error(`merchant refund detail failed: ${detail.status}`);
  }

  const process = await request('POST', `/merchant/refunds/${ctx.refundNo}/process`, {
    token: ctx.tokens.merchant,
    body: { action: 'reject', remark: 'happy flow reject' },
  });
  if (process.status !== 200) {
    throw new Error(`merchant refund process failed: ${process.status}`);
  }
}

async function main() {
  loadLocalEnv();

  const ctx: Context = {
    categoryId: 0,
    productId: 0,
    skuId: 0,
    addressId: 0,
    cartId: 0,
    orderNo: '',
    merchantOrderNo: '',
    orderItemId: 0,
    refundNo: '',
    buyerCode: `buyer_${Date.now()}_${randomUUID().slice(0, 6)}`,
    merchantCode: `merchant_${Date.now()}_${randomUUID().slice(0, 6)}`,
    tokens: { admin: '', buyer: '', merchant: '' },
  };
  const runner = new Runner();

  console.log(`API happy flow target: ${BASE}`);
  console.log(`Dump responses: ${DUMP ? 'yes' : 'no'}`);

  if (!(await runner.step('登录-管理员', async () => {
    await loginAdmin(ctx);
  }))) return runner.summary();

  if (!(await runner.step('登录-买家', async () => {
    ctx.tokens.buyer = await loginWechat(ctx.buyerCode, '流程买家');
  }))) return runner.summary();

  if (!(await runner.step('登录-商家申请人', async () => {
    ctx.tokens.merchant = await loginWechat(ctx.merchantCode, '流程商家申请人');
  }))) return runner.summary();

  if (!(await runner.step('读取分类', async () => {
    await ensureCategory(ctx);
  }))) return runner.summary();

  if (!(await runner.step('商家申请入驻', async () => {
    await createMerchant(ctx);
  }))) return runner.summary();

  if (!(await runner.step('商家创建商品', async () => {
    await createProduct(ctx);
  }))) return runner.summary();

  if (!(await runner.step('买家下单支付', async () => {
    await browseAndOrder(ctx);
  }))) return runner.summary();

  if (!(await runner.step('商家接单发货', async () => {
    await merchantFulfill(ctx);
  }))) return runner.summary();

  if (!(await runner.step('买家确认并退款', async () => {
    await buyerFinishAndRefund(ctx);
  }))) return runner.summary();

  if (!(await runner.step('商家处理退款', async () => {
    await merchantHandleRefund(ctx);
  }))) return runner.summary();

  console.log(
    JSON.stringify(
      {
        ok: true,
        buyerCode: ctx.buyerCode,
        merchantCode: ctx.merchantCode,
        categoryId: ctx.categoryId,
        productId: ctx.productId,
        skuId: ctx.skuId,
        orderNo: ctx.orderNo,
        refundNo: ctx.refundNo,
      },
      null,
      2,
    ),
  );

  runner.summary();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
