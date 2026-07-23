/**
 * 团长自提佣金端到端（绕过微信 jscode2session：本地签发 JWT）
 *
 * 用法（backend 目录）:
 *   npx ts-node --project tsconfig.scripts.json scripts/leader-pickup-commission-flow.ts
 *   FINISH_MODE=confirm|pickup BACKEND_PORT=6002 ...
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type JsonRecord = Record<string, unknown>;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function loadEnvFile(fileName: string) {
  const envPath = join(process.cwd(), fileName);
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const BASE = `http://127.0.0.1:${process.env.BACKEND_PORT ?? process.env.PORT ?? 6002}/api`;
const FINISH_MODE = (process.env.FINISH_MODE ?? 'confirm').toLowerCase();
const COMMISSION_RATE = Number(process.env.COMMISSION_RATE ?? '0.08');
const JWT_SECRET = String(process.env.JWT_SECRET ?? '').trim();
const DATABASE_URL = String(process.env.DATABASE_URL ?? '').trim();

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

const prisma = new PrismaClient({ adapter: new PrismaPg(DATABASE_URL) });

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

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signAccessToken(openid: string, role: string) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: openid,
      role,
      tokenType: 'access',
      iat: now,
      exp: now + 7 * 24 * 3600,
    }),
  );
  const data = `${header}.${payload}`;
  const sig = createHmac('sha256', JWT_SECRET).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

function firstLeafCategoryId(nodes: unknown[]): number {
  for (const node of nodes) {
    const obj = asObject(node);
    const id = asNumber(obj.id, 0);
    const children = Array.isArray(obj.children) ? obj.children : [];
    if (children.length === 0 && id > 0) return id;
    const nested = firstLeafCategoryId(children);
    if (nested > 0) return nested;
    if (id > 0) return id;
  }
  return 0;
}

async function request(
  method: Method,
  path: string,
  options: { token?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<{ status: number; data: unknown }> {
  const query = options.query
    ? `?${Object.entries(options.query)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')}`
    : '';
  const response = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { status: response.status === 201 ? 200 : response.status, data };
}

function assertOk(step: string, status: number, cond: boolean, detail?: unknown) {
  if (status !== 200 || !cond) {
    throw new Error(`${step} failed: status=${status} detail=${JSON.stringify(detail)}`);
  }
}

async function ensureRole(code: string, name: string) {
  return prisma.role.upsert({
    where: { code },
    create: { code, name, status: 1 },
    update: { status: 1, name },
  });
}

async function ensureUserWithRoles(openid: string, nickname: string, roleCodes: string[]) {
  const user = await prisma.user.upsert({
    where: { openid },
    create: {
      openid,
      nickname,
      status: 1,
      accountNo: `U${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 32),
    },
    update: { nickname, status: 1, deletedAt: null },
  });

  for (const code of roleCodes) {
    const role = await ensureRole(code, code);
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });
  }

  return user;
}

async function loginAdmin() {
  const captchaRes = await request('GET', '/admin/auth/captcha');
  const captchaPayload = asObject(unwrap(captchaRes.data));
  const captchaId = asString(captchaPayload.captchaId);
  const image = asString(captchaPayload.image);
  const svg = Buffer.from(image.replace(/^data:image\/svg\+xml;base64,/, ''), 'base64').toString('utf8');
  const match = svg.match(/letter-spacing="6">([A-Z0-9]{4})</i);
  const captchaCode = match?.[1] ?? '';
  assertOk('captcha', captchaRes.status, !!captchaId && !!captchaCode, captchaPayload);

  const { status, data } = await request('POST', '/admin/auth/login', {
    body: {
      username: 'admin',
      password: 'admin123456',
      captchaId,
      captchaCode,
    },
  });
  const token = asString(asObject(unwrap(data)).accessToken);
  assertOk('admin login', status, !!token, data);
  return token;
}

async function main() {
  const stamp = Date.now();
  const results: Array<{ name: string; ok: boolean; detail: string }> = [];
  const step = async (name: string, fn: () => Promise<string | void>) => {
    try {
      const detail = (await fn()) || 'ok';
      results.push({ name, ok: true, detail: String(detail) });
      console.log(`[PASS] ${name} - ${detail}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({ name, ok: false, detail });
      console.log(`[FAIL] ${name} - ${detail}`);
      throw error;
    }
  };

  console.log(`BASE=${BASE}`);
  console.log(`FINISH_MODE=${FINISH_MODE} COMMISSION_RATE=${COMMISSION_RATE}`);

  let adminToken = '';
  let leaderToken = '';
  let buyerToken = '';
  let merchantToken = '';
  let leaderId = 0;
  let pickupPointId = 0;
  let categoryId = 0;
  let productId = 0;
  let skuId = 0;
  let addressId = 0;
  let cartId = 0;
  let parentOrderNo = '';
  let childOrderNo = '';
  let payAmount = 0;
  const leaderOpenid = `flow_leader_${stamp}`;
  const buyerOpenid = `flow_buyer_${stamp}`;
  const merchantOpenid = `flow_merchant_${stamp}`;

  try {
    await step('管理员登录', async () => {
      adminToken = await loginAdmin();
    });

    await step('准备三端用户并签发 JWT', async () => {
      await ensureUserWithRoles(leaderOpenid, '流程团长', ['USER', 'LEADER']);
      await ensureUserWithRoles(buyerOpenid, '流程买家', ['USER']);
      await ensureUserWithRoles(merchantOpenid, '流程商家', ['USER', 'MERCHANT']);
      leaderToken = signAccessToken(leaderOpenid, 'USER');
      buyerToken = signAccessToken(buyerOpenid, 'USER');
      merchantToken = signAccessToken(merchantOpenid, 'USER');
      return 'jwt minted';
    });

    await step('团长申请', async () => {
      // 申请时角色仍是 USER
      leaderToken = signAccessToken(leaderOpenid, 'USER');
      const { status, data } = await request('POST', '/app/leaders/apply', {
        token: leaderToken,
        body: {
          realName: '测试团长',
          mobile: `138${String(stamp).slice(-8)}`,
          idCardNo: '110101199001011234',
        },
      });
      const payload = asObject(unwrap(data));
      leaderId = asNumber(payload.id, 0);
      assertOk('apply', status, leaderId > 0, data);
      return `leaderId=${leaderId}`;
    });

    await step('后台审核并设置佣金比例', async () => {
      const audit = await request('POST', `/admin/leaders/${leaderId}/audit`, {
        token: adminToken,
        body: { status: 'APPROVED', commissionRate: COMMISSION_RATE },
      });
      assertOk('audit', audit.status, true, audit.data);

      // 兼容旧服务端未在 audit 写入比例的情况
      const update = await request('PUT', `/admin/leaders/${leaderId}`, {
        token: adminToken,
        body: { commissionRate: COMMISSION_RATE },
      });
      assertOk('set rate', update.status, true, update.data);

      const detail = await request('GET', `/admin/leaders/${leaderId}`, { token: adminToken });
      const payload = asObject(unwrap(detail.data));
      const rate = asNumber(payload.commissionRate, -1);
      assertOk('verify rate', detail.status, Math.abs(rate - COMMISSION_RATE) < 1e-6, payload);
      return `rate=${rate}`;
    });

    await step('团长设置自提点', async () => {
      leaderToken = signAccessToken(leaderOpenid, 'LEADER');
      const { status, data } = await request('PUT', '/app/leaders/my-pickup-point', {
        token: leaderToken,
        body: {
          storeName: `自提点-${stamp}`,
          province: '广东省',
          city: '广州市',
          district: '天河区',
          detailAddress: `团长驿站 ${stamp} 号`,
          latitude: 23.1291,
          longitude: 113.2644,
          businessHours: '09:00-21:00',
        },
      });
      const payload = asObject(unwrap(data));
      pickupPointId = asNumber(payload.id, 0);
      assertOk('upsert pickup', status, pickupPointId > 0, data);
      return `pickupPointId=${pickupPointId}`;
    });

    await step('用户可见自提点列表(items)', async () => {
      const { status, data } = await request('GET', '/app/leaders/pickup-points', {
        query: { pageSize: 50 },
      });
      const payload = asObject(unwrap(data));
      const items = Array.isArray(payload.items) ? payload.items : [];
      const found = items.some((item) => asNumber(asObject(item).id) === pickupPointId);
      assertOk('list pickup points', status, found, {
        total: payload.total,
        hasListField: Array.isArray(payload.list),
        found,
      });
      return `items=${items.length} found=${found}`;
    });

    await step('商家入驻并上架商品', async () => {
      const cats = await request('GET', '/app/categories');
      categoryId = firstLeafCategoryId(Array.isArray(unwrap(cats.data)) ? (unwrap(cats.data) as unknown[]) : []);
      assertOk('category', cats.status, categoryId > 0, cats.data);

      merchantToken = signAccessToken(merchantOpenid, 'USER');
      const apply = await request('POST', '/merchant/apply', {
        token: merchantToken,
        body: {
          storeName: `团长流程商家 ${stamp}`,
          contactName: '店长',
          contactMobile: `139${String(stamp).slice(-8)}`,
          qualifications: [],
        },
      });
      const merchantId = asNumber(asObject(unwrap(apply.data)).merchantId, 0);
      assertOk('merchant apply', apply.status, merchantId > 0, apply.data);

      const auditM = await request('POST', `/admin/merchants/${merchantId}/audit`, {
        token: adminToken,
        body: { auditStatus: 3, remark: 'leader flow approve' },
      });
      assertOk('merchant audit', auditM.status, true, auditM.data);
      merchantToken = signAccessToken(merchantOpenid, 'MERCHANT');

      const create = await request('POST', '/merchant/products', {
        token: merchantToken,
        body: {
          categoryId,
          title: `团长自提商品 ${stamp}`,
          subtitle: 'leader pickup flow',
          coverUrl: '',
          price: '20.00',
          originalPrice: '30.00',
          stock: 50,
          skus: [
            {
              skuName: '标准装',
              skuCode: `SKU-LP-${stamp}`,
              price: '20.00',
              originalPrice: '30.00',
              stock: 50,
            },
          ],
        },
      });
      productId = asNumber(asObject(unwrap(create.data)).productId, 0);
      assertOk('product create', create.status, productId > 0, create.data);

      const skus = await request('GET', `/merchant/products/${productId}/skus`, { token: merchantToken });
      const skuList = Array.isArray(unwrap(skus.data)) ? (unwrap(skus.data) as unknown[]) : [];
      skuId = asNumber(asObject(skuList[0]).skuId ?? asObject(skuList[0]).id, 0);
      assertOk('sku', skus.status, skuId > 0, skus.data);

      const auditP = await request('POST', `/admin/products/${productId}/audit`, {
        token: adminToken,
        body: { auditStatus: 3, remark: 'leader flow approve' },
      });
      assertOk('product audit', auditP.status, true, auditP.data);
      // 平台审核通过会直接上架；勿再调商户 ON_SHELF（会把状态打回待审）
      return `productId=${productId} skuId=${skuId}`;
    });

    await step('买家自提下单并支付', async () => {
      const address = await request('POST', '/app/addresses', {
        token: buyerToken,
        body: {
          receiverName: '自提买家',
          receiverMobile: '13800002222',
          province: '广东省',
          city: '广州市',
          district: '天河区',
          detailAddress: '软件园一路 1 号',
        },
      });
      addressId = asNumber(asObject(unwrap(address.data)).id ?? asObject(unwrap(address.data)).addressId, 0);
      assertOk('address', address.status, addressId > 0, address.data);

      const cart = await request('POST', '/app/cart/items', {
        token: buyerToken,
        body: { skuId, quantity: 1 },
      });
      cartId = asNumber(asObject(unwrap(cart.data)).cartId ?? asObject(unwrap(cart.data)).id, 0);
      assertOk('cart', cart.status, cartId > 0, cart.data);

      const order = await request('POST', '/app/orders', {
        token: buyerToken,
        body: {
          cartIds: [cartId],
          addressId,
          deliveryType: 3,
          pickupPointId,
        },
      });
      const orderPayload = asObject(unwrap(order.data));
      parentOrderNo = asString(orderPayload.orderNo);
      const childOrderNos = Array.isArray(orderPayload.childOrderNos) ? orderPayload.childOrderNos : [];
      childOrderNo = asString(childOrderNos[0]) || parentOrderNo;
      payAmount = asNumber(orderPayload.payAmount, 0);
      assertOk('create order', order.status, !!parentOrderNo && !!childOrderNo, order.data);

      const dbOrder = await prisma.order.findFirst({
        where: { orderNo: childOrderNo, isParent: false },
      });
      assertOk(
        'order pickup meta(db)',
        200,
        !!dbOrder &&
          Number(dbOrder.leaderId ?? 0) === leaderId &&
          Number(dbOrder.pickupPointId ?? 0) === pickupPointId,
        dbOrder,
      );
      payAmount = Number(dbOrder!.payAmount);

      const payment = await request('POST', '/app/payments/wechat', {
        token: buyerToken,
        body: { orderNo: parentOrderNo },
      });
      assertOk('payment', payment.status, true, payment.data);

      const callback = await request('POST', '/payments/wechat/callback', {
        body: { orderNo: parentOrderNo, out_trade_no: parentOrderNo },
      });
      assertOk('callback', callback.status, true, callback.data);
      return `order=${childOrderNo} payAmount=${payAmount}`;
    });

    await step('商家接单发货', async () => {
      const accept = await request('POST', `/merchant/orders/${childOrderNo}/accept`, {
        token: merchantToken,
      });
      assertOk('accept', accept.status, true, accept.data);

      const ship = await request('POST', `/merchant/orders/${childOrderNo}/ship`, {
        token: merchantToken,
        body: { trackingNo: `TRK${stamp}`, logisticsCompany: '自提配送' },
      });
      assertOk('ship', ship.status, true, ship.data);
    });

    await step(FINISH_MODE === 'pickup' ? '团长核销完结' : '买家确认收货完结', async () => {
      if (FINISH_MODE === 'pickup') {
        const pickup = await request('POST', `/app/leaders/orders/${childOrderNo}/pickup`, {
          token: leaderToken,
        });
        assertOk('leader pickup', pickup.status, true, pickup.data);
        return 'pickup verified';
      }
      const confirm = await request('POST', `/app/orders/${childOrderNo}/confirm`, {
        token: buyerToken,
      });
      assertOk('confirm', confirm.status, true, confirm.data);
      return 'buyer confirmed';
    });

    await step('校验团长佣金比例与金额', async () => {
      const { status, data } = await request('GET', '/app/leaders/commissions', {
        token: leaderToken,
        query: { pageSize: 20 },
      });
      const payload = asObject(unwrap(data));
      const items = Array.isArray(payload.items) ? payload.items : [];
      const hit = items.map((item) => asObject(item)).find((item) => asString(item.orderNo) === childOrderNo);

      const dbCommission = await prisma.leaderCommission.findFirst({
        where: { orderNo: childOrderNo, leaderId: BigInt(leaderId) },
      });

      assertOk('commission exists', status, !!hit || !!dbCommission, { items, dbCommission, childOrderNo });

      const amount = hit ? asNumber(hit.amount, -1) : Number(dbCommission!.commissionAmount);
      const rate = dbCommission ? Number(dbCommission.commissionRate) : COMMISSION_RATE;
      const expected = Number((payAmount * COMMISSION_RATE).toFixed(2));
      assertOk('commission amount/rate', 200, Math.abs(amount - expected) < 0.011 && Math.abs(rate - COMMISSION_RATE) < 1e-6, {
        amount,
        expected,
        rate,
        payAmount,
        hit,
        dbCommission,
      });
      return `amount=${amount} expected=${expected} rate=${rate}`;
    });
  } catch {
    // logged
  } finally {
    await prisma.$disconnect();
  }

  const passed = results.filter((item) => item.ok).length;
  console.log(`\nSummary: ${passed}/${results.length} passed`);
  console.log(
    JSON.stringify(
      {
        ok: passed === results.length,
        finishMode: FINISH_MODE,
        leaderId,
        pickupPointId,
        childOrderNo,
        payAmount,
        commissionRate: COMMISSION_RATE,
        results,
      },
      null,
      2,
    ),
  );
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
