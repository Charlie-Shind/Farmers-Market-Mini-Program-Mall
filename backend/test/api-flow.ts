import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Section = 'public' | 'auth' | 'product' | 'draft' | 'activity' | 'order' | 'merchant' | 'admin' | 'full';
type JsonRecord = Record<string, unknown>;

type AuthTokens = {
  admin: string;
  user: string;
  merchant: string;
};

type FlowContext = {
  tokens: AuthTokens;
  categoryId: number;
  productId: number;
  productSkuId: number;
  draftId: string;
  draftProductId: number;
  activityId: number;
  orderNo: string;
  addressId: number;
  cartId: number;
  reviewItemId: number;
  refundNo: string;
  adminRefundNo: string;
};

type StepResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const BASE = `http://127.0.0.1:${process.env.BACKEND_PORT ?? 6002}/api`;
const DUMP_RESPONSES = (() => {
  const value = getArg('dump');
  if (value == null) {
    return false;
  }
  return value !== 'false';
})();

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

function normalizeBaseUrl(rawBaseUrl?: string) {
  const fallbackPort = process.env.PORT ?? '6002';
  const defaultBaseUrl = `http://127.0.0.1:${fallbackPort}/api`;
  return (rawBaseUrl ?? defaultBaseUrl).replace(/\/+$/, '');
}

function normalizeSection(value?: string): Section {
  const allowed: Section[] = ['public', 'auth', 'product', 'draft', 'activity', 'order', 'merchant', 'admin', 'full'];
  return allowed.includes(value as Section) ? (value as Section) : 'full';
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

  async step(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      this.results.push({ name, ok: true, detail: 'ok' });
      console.log(`[PASS] ${name}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.results.push({ name, ok: false, detail });
      console.log(`[FAIL] ${name} - ${detail}`);
    }
  }

  summary() {
    const passed = this.results.filter((item) => item.ok).length;
    const failed = this.results.length - passed;
    console.log(`\nSummary: ${passed}/${this.results.length} passed`);
    if (failed > 0) {
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

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}${query}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`request failed: ${method} ${BASE}${path}${query} - ${detail}`);
  }

  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }

  if (DUMP_RESPONSES) {
    const printable = {
      method,
      path,
      status: response.status,
      data,
    };
    console.log(JSON.stringify(printable, null, 2));
  }

  return { status: response.status === 201 ? 200 : response.status, data };
}

async function loginAdmin(ctx: FlowContext) {
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

async function loginUser(ctx: FlowContext, nickname: string, storeAs: keyof AuthTokens = 'user') {
  const code = `${nickname}_${Date.now()}_${randomUUID().slice(0, 6)}`;
  const { status, data } = await request('POST', '/auth/wechat/login', {
    body: { code, nickname, avatarUrl: '' },
  });
  const payload = asObject(unwrap(data));
  const token = asString(payload.accessToken);
  if (status !== 200 || !token) {
    throw new Error(`user login failed: ${status}`);
  }
  ctx.tokens[storeAs] = token;
  return code;
}

async function bootstrapMerchant(ctx: FlowContext) {
  const applyRes = await request('POST', '/merchant/apply', {
    token: ctx.tokens.user,
    body: {
      storeName: '湾源流程测试商店',
      contactName: '测试店长',
      contactMobile: '13900001111',
      qualifications: [],
    },
  });
  const applyPayload = asObject(unwrap(applyRes.data));
  ctx.categoryId = ctx.categoryId || 0;
  const merchantId = asNumber(applyPayload.merchantId, 0);
  if (applyRes.status !== 200 || merchantId <= 0) {
    throw new Error(`merchant apply failed: ${applyRes.status}`);
  }

  const auditRes = await request('POST', `/admin/merchants/${merchantId}/audit`, {
    token: ctx.tokens.admin,
    body: { auditStatus: 3, remark: 'flow approved' },
  });
  if (auditRes.status !== 200) {
    throw new Error(`merchant audit failed: ${auditRes.status}`);
  }

  await loginUser(ctx, 'merchant', 'merchant');
  return merchantId;
}

async function ensureCategory(ctx: FlowContext) {
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

async function publicFlow(ctx: FlowContext, runner: Runner) {
  await runner.step('公开接口-健康状态', async () => {
    const res = await request('GET', '/identity/auth/status');
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开接口-匿名令牌', async () => {
    const res = await request('GET', '/identity/auth/anonymous');
    const payload = asObject(unwrap(res.data));
    if (res.status !== 200 || !asString(payload.token)) {
      throw new Error(`status=${res.status}`);
    }
  });

  await runner.step('公开接口-分类树', async () => {
    const res = await request('GET', '/app/categories');
    const payload = unwrap<unknown[]>(res.data);
    const categoryId = Array.isArray(payload) ? firstLeafCategoryId(payload) : 0;
    if (res.status !== 200 || categoryId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.categoryId = categoryId;
  });

  await runner.step('公开接口-商品列表', async () => {
    const res = await request('GET', '/app/products', { query: { pageSize: 3 } });
    const payload = asObject(unwrap(res.data));
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (res.status !== 200 || items.length === 0) {
      throw new Error(`status=${res.status}`);
    }
    const first = asObject(items[0]);
    ctx.productId = asNumber(first.id, 0);
  });

  await runner.step('公开接口-商品详情', async () => {
    if (ctx.productId <= 0) throw new Error('productId missing');
    const res = await request('GET', `/app/products/${ctx.productId}`);
    const payload = asObject(unwrap(res.data));
    const skus = Array.isArray(payload.skus) ? payload.skus : [];
    const skuId = asNumber(asObject(skus[0]).skuId ?? asObject(skus[0]).id, 0);
    if (res.status !== 200 || skuId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.productSkuId = skuId;
  });

  await runner.step('公开接口-热搜词', async () => {
    const res = await request('GET', '/app/search/hot-keywords');
    if (res.status !== 200) {
      throw new Error(`status=${res.status}`);
    }
  });

  await runner.step('公开接口-秒杀活动', async () => {
    const res = await request('GET', '/app/quick/flash-sale/active');
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开接口-拼团商品', async () => {
    const res = await request('GET', '/app/quick/group-buy/products', { query: { pageSize: 3 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开接口-福利专区', async () => {
    const res = await request('GET', '/app/quick/gift-zone/items', { query: { pageSize: 3 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开接口-原产地专区', async () => {
    const res = await request('GET', '/app/quick/origin-zone/items', { query: { pageSize: 3 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开接口-分类推荐', async () => {
    if (ctx.categoryId <= 0) throw new Error('categoryId missing');
    const res = await request('GET', `/app/categories/${ctx.categoryId}/recommendations`, {
      query: { period: 'day', limit: 3, page: 1 },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开接口-相关商品', async () => {
    if (ctx.productId <= 0) throw new Error('productId missing');
    const res = await request('GET', `/app/products/${ctx.productId}/related`, {
      query: { limit: 3 },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });
}

async function authFlow(ctx: FlowContext, runner: Runner) {
  await runner.step('登录-管理员', async () => {
    await loginAdmin(ctx);
  });

  await runner.step('登录-用户', async () => {
    await loginUser(ctx, 'user');
  });

  await runner.step('商家-申请入驻', async () => {
    const merchantId = await bootstrapMerchant(ctx);
    if (merchantId <= 0) {
      throw new Error('merchantId missing');
    }
  });
}

async function productFlow(ctx: FlowContext, runner: Runner) {
  await ensureCategory(ctx);
  if (!ctx.tokens.merchant) {
    await authFlow(ctx, runner);
  }

  await runner.step('商家-创建商品', async () => {
    const title = `流程商品 ${Date.now()}`;
    const res = await request('POST', '/merchant/products', {
      token: ctx.tokens.merchant,
      body: {
        categoryId: ctx.categoryId,
        title,
        subtitle: '流程测试商品',
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
    const payload = asObject(unwrap(res.data));
    const productId = asNumber(payload.productId, 0);
    if (res.status !== 200 || productId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.productId = productId;
  });

  await runner.step('商家-商品详情', async () => {
    const res = await request('GET', `/merchant/products/${ctx.productId}`, { token: ctx.tokens.merchant });
    const payload = asObject(unwrap(res.data));
    const skus = Array.isArray(payload.skus) ? payload.skus : [];
    const skuId = asNumber(asObject(skus[0]).skuId ?? asObject(skus[0]).id, 0);
    if (res.status !== 200 || skuId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.productSkuId = skuId;
  });

  await runner.step('后台-商品审核', async () => {
    const res = await request('POST', `/admin/products/${ctx.productId}/audit`, {
      token: ctx.tokens.admin,
      body: { auditStatus: 3, remark: 'flow approve' },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-商品上架', async () => {
    const res = await request('PATCH', `/merchant/products/${ctx.productId}/status`, {
      token: ctx.tokens.merchant,
      body: { status: 'ON_SHELF' },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('公开-商品可读', async () => {
    const res = await request('GET', `/app/products/${ctx.productId}`);
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });
}

async function draftFlow(ctx: FlowContext, runner: Runner) {
  await ensureCategory(ctx);
  if (!ctx.tokens.merchant) {
    await authFlow(ctx, runner);
  }

  await runner.step('商家-创建商品草稿', async () => {
    const res = await request('POST', '/merchant/products/drafts', {
      token: ctx.tokens.merchant,
      body: {
        title: `草稿商品 ${Date.now()}`,
        categoryId: ctx.categoryId,
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
          title: `草稿商品 ${Date.now()}`,
          subtitle: '草稿测试',
          coverUrl: '',
          price: '15.60',
          originalPrice: '18.80',
          stock: 15,
          traceCode: `DRAFTTRACE-${Date.now()}`,
          traceDesc: '草稿测试溯源',
        },
        selectedCategory: { id: ctx.categoryId },
        generatedSkuRows: [],
      },
    });
    const payload = asObject(unwrap(res.data));
    ctx.draftId = asString(payload.draftId);
    ctx.draftProductId = asNumber(payload.productId, 0);
    if (res.status !== 200 || !ctx.draftId) {
      throw new Error(`status=${res.status}`);
    }
  });

  await runner.step('商家-读取草稿', async () => {
    const res = await request('GET', `/merchant/products/drafts/${ctx.draftId}`, {
      token: ctx.tokens.merchant,
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-更新草稿', async () => {
    const res = await request('PUT', `/merchant/products/drafts/${ctx.draftId}`, {
      token: ctx.tokens.merchant,
      body: {
        title: `草稿商品 ${Date.now()} - 更新`,
        categoryId: ctx.categoryId,
        coverUrl: '',
        price: '16.60',
        originalPrice: '18.80',
        skus: [
          {
            skuName: '草稿规格',
            skuCode: `DRAFT-${Date.now()}-U`,
            skuImageUrl: '',
            specJson: { label: 'default' },
            price: '16.60',
            originalPrice: '18.80',
            stock: 12,
          },
        ],
        form: {
          title: `草稿商品 ${Date.now()} - 更新`,
          subtitle: '草稿测试更新',
          coverUrl: '',
          price: '16.60',
          originalPrice: '18.80',
          stock: 12,
          traceCode: `DRAFTTRACE-${Date.now()}`,
          traceDesc: '草稿测试更新',
        },
        selectedCategory: { id: ctx.categoryId },
        generatedSkuRows: [],
      },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-发布草稿', async () => {
    const res = await request('POST', `/merchant/products/drafts/${ctx.draftId}/publish`, {
      token: ctx.tokens.merchant,
    });
    const payload = asObject(unwrap(res.data));
    ctx.draftProductId = asNumber(payload.productId, 0);
    if (res.status !== 200 || ctx.draftProductId <= 0) {
      throw new Error(`status=${res.status}`);
    }
  });
}

async function activityFlow(ctx: FlowContext, runner: Runner) {
  await ensureCategory(ctx);
  if (!ctx.tokens.admin || !ctx.tokens.merchant) {
    await authFlow(ctx, runner);
  }

  await runner.step('商家-创建活动', async () => {
    const res = await request('POST', '/merchant/activities', {
      token: ctx.tokens.merchant,
      body: {
        activityName: `商家活动 ${Date.now()}`,
        title: `商家活动 ${Date.now()}`,
        activityType: 'FLASH_SALE',
        status: 'DRAFT',
        startAt: new Date(Date.now() + 60_000).toISOString(),
        endAt: new Date(Date.now() + 3_600_000).toISOString(),
        productCount: 1,
        ruleJson: { type: 'FLASH_SALE', categoryId: ctx.categoryId },
        products: [
          {
            productId: ctx.productId,
            skuId: ctx.productSkuId,
            activityPrice: '9.90',
            activityStock: 5,
            limitPerUser: 1,
            sortOrder: 1,
            status: 'ENABLED',
          },
        ],
      },
    });
    const payload = asObject(unwrap(res.data));
    ctx.activityId = asNumber(payload.activityId, 0);
    if (res.status !== 200 || ctx.activityId <= 0) {
      throw new Error(`status=${res.status}`);
    }
  });

  await runner.step('商家-活动详情', async () => {
    const res = await request('GET', `/merchant/activities/${ctx.activityId}`, { token: ctx.tokens.merchant });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-活动更新', async () => {
    const res = await request('PATCH', `/merchant/activities/${ctx.activityId}`, {
      token: ctx.tokens.merchant,
      body: {
        activityName: `商家活动 ${Date.now()} - 更新`,
        title: `商家活动 ${Date.now()} - 更新`,
        activityType: 'FLASH_SALE',
        status: 'DRAFT',
        startAt: new Date(Date.now() + 60_000).toISOString(),
        endAt: new Date(Date.now() + 3_600_000).toISOString(),
        productCount: 1,
        ruleJson: { type: 'FLASH_SALE', categoryId: ctx.categoryId },
        products: [
          {
            productId: ctx.productId,
            skuId: ctx.productSkuId,
            activityPrice: '8.90',
            activityStock: 4,
            limitPerUser: 1,
            sortOrder: 1,
            status: 'ENABLED',
          },
        ],
      },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-活动列表', async () => {
    const res = await request('GET', '/merchant/activities', { token: ctx.tokens.merchant, query: { pageSize: 5 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-活动候选商品', async () => {
    const res = await request('GET', '/merchant/activities/product-candidates', {
      token: ctx.tokens.merchant,
      query: { keyword: '测试', pageSize: 5 },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-活动创建', async () => {
    const res = await request('POST', '/admin/activities', {
      token: ctx.tokens.admin,
      body: {
        activityName: `后台活动 ${Date.now()}`,
        title: `后台活动 ${Date.now()}`,
        activityType: 'FLASH_SALE',
        status: 'DRAFT',
        startAt: new Date(Date.now() + 60_000).toISOString(),
        endAt: new Date(Date.now() + 3_600_000).toISOString(),
        productCount: 1,
        ruleJson: { type: 'FLASH_SALE', categoryId: ctx.categoryId },
        products: [
          {
            productId: ctx.productId,
            skuId: ctx.productSkuId,
            activityPrice: '7.90',
            activityStock: 4,
            limitPerUser: 1,
            sortOrder: 1,
            status: 'ENABLED',
          },
        ],
      },
    });
    const payload = asObject(unwrap(res.data));
    const adminActivityId = asNumber(payload.activityId, 0);
    if (res.status !== 200 || adminActivityId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.activityId = adminActivityId;
  });

  await runner.step('后台-活动详情', async () => {
    const res = await request('GET', `/admin/activities/${ctx.activityId}`, { token: ctx.tokens.admin });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-活动发布', async () => {
    const res = await request('POST', `/admin/activities/${ctx.activityId}/publish`, { token: ctx.tokens.admin });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-活动暂停', async () => {
    const res = await request('POST', `/admin/activities/${ctx.activityId}/pause`, { token: ctx.tokens.admin });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-活动结束', async () => {
    const res = await request('POST', `/admin/activities/${ctx.activityId}/finish`, { token: ctx.tokens.admin });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });
}

async function orderFlow(ctx: FlowContext, runner: Runner) {
  await ensureCategory(ctx);
  if (!ctx.tokens.user || !ctx.tokens.merchant || !ctx.tokens.admin) {
    await authFlow(ctx, runner);
  }

  await runner.step('用户-创建地址', async () => {
    const res = await request('POST', '/app/addresses', {
      token: ctx.tokens.user,
      body: {
        receiverName: '测试收货人',
        receiverMobile: '13800002222',
        province: '广东省',
        city: '广州市',
        district: '天河区',
        detailAddress: '软件园一路 1 号',
      },
    });
    const payload = asObject(unwrap(res.data));
    const addressId = asNumber(payload.id ?? payload.addressId, 0);
    if (res.status !== 200 || addressId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.addressId = addressId;
  });

  await runner.step('用户-加入购物车', async () => {
    const res = await request('POST', '/app/cart/items', {
      token: ctx.tokens.user,
      body: { skuId: ctx.productSkuId, quantity: 2 },
    });
    const payload = asObject(unwrap(res.data));
    const cartId = asNumber(payload.cartId, 0);
    if (res.status !== 200 || cartId <= 0) {
      throw new Error(`status=${res.status}`);
    }
    ctx.cartId = cartId;
  });

  await runner.step('用户-订单预览', async () => {
    const res = await request('POST', '/app/orders/preview', {
      token: ctx.tokens.user,
      body: { cartIds: [ctx.cartId], addressId: ctx.addressId, deliveryType: 1 },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('用户-创建订单', async () => {
    const res = await request('POST', '/app/orders', {
      token: ctx.tokens.user,
      body: { cartIds: [ctx.cartId], addressId: ctx.addressId, deliveryType: 1 },
    });
    const payload = asObject(unwrap(res.data));
    ctx.orderNo = asString(payload.orderNo);
    if (res.status !== 200 || !ctx.orderNo) {
      throw new Error(`status=${res.status}`);
    }
  });

  await runner.step('支付-创建微信支付', async () => {
    const res = await request('POST', '/app/payments/wechat', {
      token: ctx.tokens.user,
      body: { orderNo: ctx.orderNo },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('支付-回调处理', async () => {
    const res = await request('POST', '/payments/wechat/callback', {
      body: { orderNo: ctx.orderNo, out_trade_no: ctx.orderNo },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-接单', async () => {
    const res = await request('POST', `/merchant/orders/${ctx.orderNo}/accept`, {
      token: ctx.tokens.merchant,
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-发货', async () => {
    const res = await request('POST', `/merchant/orders/${ctx.orderNo}/ship`, {
      token: ctx.tokens.merchant,
      body: { trackingNo: 'SF1234567890', logisticsCompany: '顺丰冷链' },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('用户-确认收货', async () => {
    const res = await request('POST', `/app/orders/${ctx.orderNo}/confirm`, {
      token: ctx.tokens.user,
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('用户-提交评价', async () => {
    const detail = await request('GET', `/app/orders/${ctx.orderNo}`, { token: ctx.tokens.user });
    const detailPayload = asObject(unwrap(detail.data));
    const items = Array.isArray(detailPayload.items) ? detailPayload.items : [];
    const orderItemId = asNumber(asObject(items[0]).orderItemId ?? asObject(items[0]).id, 0);
    if (orderItemId <= 0) {
      throw new Error('orderItemId missing');
    }
    const res = await request('POST', `/app/orders/${ctx.orderNo}/reviews`, {
      token: ctx.tokens.user,
      body: { orderItemId, rating: 5, content: '流程测试评价', images: [] },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
    ctx.reviewItemId = orderItemId;
  });

  await runner.step('用户-发起退款', async () => {
    const res = await request('POST', '/app/refunds', {
      token: ctx.tokens.user,
      body: {
        orderNo: ctx.orderNo,
        orderItemId: ctx.reviewItemId,
        applyType: 1,
        applyReason: '流程测试退款',
        applyImages: [`https://example.com/${ctx.orderNo}.png`],
      },
    });
    const payload = asObject(unwrap(res.data));
    ctx.refundNo = asString(payload.refundNo);
    if (res.status !== 200 || !ctx.refundNo) {
      throw new Error(`status=${res.status}`);
    }
  });

  await runner.step('商家-退款列表与详情', async () => {
    const listRes = await request('GET', '/merchant/refunds', {
      token: ctx.tokens.merchant,
      query: { pageSize: 10 },
    });
    if (listRes.status !== 200) throw new Error(`list=${listRes.status}`);
    const detailRes = await request('GET', `/merchant/refunds/${ctx.refundNo}`, {
      token: ctx.tokens.merchant,
    });
    if (detailRes.status !== 200) throw new Error(`detail=${detailRes.status}`);
  });

  await runner.step('商家-处理退款', async () => {
    const res = await request('POST', `/merchant/refunds/${ctx.refundNo}/process`, {
      token: ctx.tokens.merchant,
      body: { action: 'reject', remark: '流程测试拒绝' },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('创建待仲裁退款', async () => {
    const secondCart = await request('POST', '/app/cart/items', {
      token: ctx.tokens.user,
      body: { skuId: ctx.productSkuId, quantity: 1 },
    });
    const secondCartId = asNumber(asObject(unwrap(secondCart.data)).cartId, 0);
    if (secondCart.status !== 200 || secondCartId <= 0) {
      throw new Error(`second cart failed: ${secondCart.status}`);
    }
    const secondOrder = await request('POST', '/app/orders', {
      token: ctx.tokens.user,
      body: { cartIds: [secondCartId], addressId: ctx.addressId, deliveryType: 1 },
    });
    const secondOrderNo = asString(asObject(unwrap(secondOrder.data)).orderNo);
    if (secondOrder.status !== 200 || !secondOrderNo) {
      throw new Error(`second order failed: ${secondOrder.status}`);
    }
    await request('POST', '/app/payments/wechat', { token: ctx.tokens.user, body: { orderNo: secondOrderNo } });
    await request('POST', '/payments/wechat/callback', { body: { orderNo: secondOrderNo, out_trade_no: secondOrderNo } });
    await request('POST', `/merchant/orders/${secondOrderNo}/accept`, { token: ctx.tokens.merchant });
    await request('POST', `/merchant/orders/${secondOrderNo}/ship`, {
      token: ctx.tokens.merchant,
      body: { trackingNo: 'SF9988776655', logisticsCompany: '顺丰冷链' },
    });
    await request('POST', `/app/orders/${secondOrderNo}/confirm`, { token: ctx.tokens.user });
    const detail = await request('GET', `/app/orders/${secondOrderNo}`, { token: ctx.tokens.user });
    const detailPayload = asObject(unwrap(detail.data));
    const items = Array.isArray(detailPayload.items) ? detailPayload.items : [];
    const orderItemId = asNumber(asObject(items[0]).orderItemId ?? asObject(items[0]).id, 0);
    if (orderItemId <= 0) {
      throw new Error('second orderItemId missing');
    }
    const refund = await request('POST', '/app/refunds', {
      token: ctx.tokens.user,
      body: {
        orderNo: secondOrderNo,
        orderItemId,
        applyType: 1,
        applyReason: '后台仲裁测试',
        applyImages: [],
      },
    });
    ctx.adminRefundNo = asString(asObject(unwrap(refund.data)).refundNo);
    if (refund.status !== 200 || !ctx.adminRefundNo) {
      throw new Error(`refund failed: ${refund.status}`);
    }
  });
}

async function merchantFlow(ctx: FlowContext, runner: Runner) {
  if (!ctx.tokens.merchant) {
    await authFlow(ctx, runner);
  }

  await runner.step('商家-资料', async () => {
    const res = await request('GET', '/merchant/profile', { token: ctx.tokens.merchant });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-工作台', async () => {
    const res = await request('GET', '/merchant/dashboard', { token: ctx.tokens.merchant });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-通知', async () => {
    const res = await request('GET', '/merchant/notices', { token: ctx.tokens.merchant, query: { pageSize: 10 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('商家-钱包', async () => {
    const res = await request('GET', '/merchant/wallet', { token: ctx.tokens.merchant });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });
}

async function adminFlow(ctx: FlowContext, runner: Runner) {
  if (!ctx.tokens.admin) {
    await loginAdmin(ctx);
  }

  await runner.step('后台-退款详情', async () => {
    if (!ctx.adminRefundNo) {
      throw new Error('adminRefundNo missing');
    }
    const res = await request('GET', `/admin/refunds/${ctx.adminRefundNo}`, { token: ctx.tokens.admin });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-退款仲裁', async () => {
    if (!ctx.adminRefundNo) {
      throw new Error('adminRefundNo missing');
    }
    const res = await request('POST', `/admin/refunds/${ctx.adminRefundNo}/arbitrate`, {
      token: ctx.tokens.admin,
      body: { action: 'reject', remark: '流程测试拒绝' },
    });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-活动列表', async () => {
    const res = await request('GET', '/admin/activities', { token: ctx.tokens.admin, query: { pageSize: 5 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });

  await runner.step('后台-商品列表', async () => {
    const res = await request('GET', '/admin/products', { token: ctx.tokens.admin, query: { pageSize: 5 } });
    if (res.status !== 200) throw new Error(`status=${res.status}`);
  });
}

async function runSection(section: Section, ctx: FlowContext, runner: Runner) {
  switch (section) {
    case 'public':
      await publicFlow(ctx, runner);
      break;
    case 'auth':
      await authFlow(ctx, runner);
      break;
    case 'product':
      await productFlow(ctx, runner);
      break;
    case 'draft':
      await draftFlow(ctx, runner);
      break;
    case 'activity':
      await activityFlow(ctx, runner);
      break;
    case 'order':
      await orderFlow(ctx, runner);
      break;
    case 'merchant':
      await merchantFlow(ctx, runner);
      break;
    case 'admin':
      await adminFlow(ctx, runner);
      break;
    case 'full':
      await publicFlow(ctx, runner);
      await authFlow(ctx, runner);
      await productFlow(ctx, runner);
      await draftFlow(ctx, runner);
      await activityFlow(ctx, runner);
      await orderFlow(ctx, runner);
      await merchantFlow(ctx, runner);
      await adminFlow(ctx, runner);
      break;
  }
}

async function main() {
  loadLocalEnv();
  const section = normalizeSection(getArg('section'));
  const runner = new Runner();
  const ctx: FlowContext = {
    tokens: { admin: '', user: '', merchant: '' },
    categoryId: 0,
    productId: 0,
    productSkuId: 0,
    draftId: '',
    draftProductId: 0,
    activityId: 0,
    orderNo: '',
    addressId: 0,
    cartId: 0,
    reviewItemId: 0,
    refundNo: '',
    adminRefundNo: '',
  };

  console.log(`API flow target: ${BASE}`);
  console.log(`Section: ${section}`);
  console.log(`Dump responses: ${DUMP_RESPONSES ? 'yes' : 'no'}`);

  await runSection(section, ctx, runner);
  runner.summary();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
