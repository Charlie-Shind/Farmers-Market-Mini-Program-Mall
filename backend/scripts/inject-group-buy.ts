/**
 * 注入拼团测试数据（含团 + 成员 + 订单）
 *
 * 用法：
 *   npm run scenario:group:inject
 *   npm run scenario:group:inject -- --reset
 *   npm run scenario:group:inject -- --dry-run
 *
 * 注入场景（5 种状态覆盖）：
 *   scene1: OPEN 刚开团   — 1 成员, 0 订单
 *   scene2: OPEN 差 1 人  — 2 成员, 2 已付
 *   scene3: COMPLETED     — 3 成员, 3 已付 (已成团)
 *   scene4: FAILED        — 1 成员, 0 订单 (已过期)
 *   scene5: 商品启用拼团但无开团 — 待开团
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalIndex = line.indexOf('=');
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

function getArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const idx = process.argv.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}
function hasFlag(name: string): boolean { return process.argv.includes(`--${name}`); }
function log(label: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ flow: label, ...data, ts: new Date().toISOString() }, null, 2));
}

type SkuWithProduct = { id: bigint; skuName: string; imageUrl: string | null; product: { id: bigint; merchantId: bigint; title: string; coverUrl: string | null } };

async function createGroupOrder(
  userId: bigint,
  productId: bigint,
  productTitle: string,
  coverUrl: string | null,
  merchantId: bigint,
  groupBuyId: bigint,
  sku: { id: bigint; skuName: string; imageUrl?: string | null },
  goodsAmount: number,
  addressSnapshot: Record<string, unknown>,
): Promise<string> {
  const orderNo = `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const freightAmount = goodsAmount >= 88 ? 0 : 8;
  const payAmount = goodsAmount + freightAmount;

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        orderNo,
        userId,
        merchantId,
        groupBuyId,
        addressSnapshot,
        goodsAmount: goodsAmount.toFixed(2),
        freightAmount: freightAmount.toFixed(2),
        discountAmount: '0.00',
        payAmount: payAmount.toFixed(2),
        orderStatus: 2,
        payStatus: 1,
        deliveryStatus: 0,
        refundStatus: 0,
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
        items: {
          create: [{
            productId,
            skuId: sku.id,
            productTitle,
            skuName: sku.skuName,
            productImage: coverUrl ?? sku.imageUrl ?? '',
            unitPrice: goodsAmount.toFixed(2),
            quantity: 1,
            lineAmount: goodsAmount.toFixed(2),
          }],
        },
      },
    });
  });
  return orderNo;
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const reset = hasFlag('reset');
  const now = new Date();

  if (reset && !dryRun) {
    // 级联删顺序：order_item → payment_record → delivery_record → order → group_buy_member → group_buy
    const gbOrders = await prisma.order.findMany({ where: { groupBuyId: { not: null } }, select: { id: true, orderNo: true } });
    const ids = gbOrders.map((o) => o.id);
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.paymentRecord.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.deliveryRecord.deleteMany({ where: { orderId: { in: ids } } });
    const ord = await prisma.order.deleteMany({ where: { id: { in: ids } } });
    const mem = await prisma.groupBuyMember.deleteMany({});
    const grp = await prisma.groupBuy.deleteMany({});
    log('reset', { groupBuyDel: grp.count, memberDel: mem.count, orderDel: ord.count });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
    take: 5,
  });
  if (users.length < 3) throw new Error('需要至少 3 个用户，请先运行 npm run prisma:seed');

  const products = await prisma.product.findMany({
    where: { status: 1, auditStatus: 2, deletedAt: null },
    include: { skus: { orderBy: { id: 'asc' } } },
    take: 8,
    orderBy: { id: 'asc' },
  });

  const candidates = products.filter((p) => {
    const sku = p.skus[0];
    return sku && Number(sku.price) > 0;
  });
  if (candidates.length < 5) throw new Error('需要至少 5 个可售商品');

  const address = await prisma.userAddress.findFirst({
    where: { userId: users[0].id, deletedAt: null },
    orderBy: { id: 'asc' },
  });
  const addrSnap = address
    ? { receiverName: address.receiverName, receiverMobile: address.receiverMobile, province: address.province, city: address.city, district: address.district, detailAddress: address.detailAddress, isDefault: address.isDefault }
    : { receiverName: '测试', receiverMobile: '13800000001', province: '广东', city: '深圳', district: '南山', detailAddress: '测试地址 1 号', isDefault: true };

  log('prep', { users: users.map((u) => `${u.nickname ?? u.mobile}`), products: candidates.slice(0, 5).map((p) => p.title) });

  if (dryRun) {
    console.log('[dry-run] scene1: OPEN 1人 0单 / scene2: OPEN 2人 2单 / scene3: COMPLETED 3人 3单 / scene4: FAILED 1人 0单 / scene5: gbEnabled-only');
    return;
  }

  function pick(idx: number) {
    const p = candidates[idx];
    return { product: p, sku: p.skus[0], price: Number(p.skus[0].price) };
  }

  // === Scene 1: OPEN 刚开团 (1 成员, 0 订单) ===
  const s1 = pick(0);
  await prisma.product.update({ where: { id: s1.product.id }, data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.7 } } });
  const g1 = await prisma.groupBuy.create({
    data: {
      groupNo: `GB${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      productId: s1.product.id, skuId: s1.sku.id,
      initiatorId: users[0].id,
      groupPrice: (s1.price * 0.7).toFixed(2), originPrice: s1.price.toFixed(2),
      needed: 3, status: 'OPEN',
      expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      roughArea: '城东附近', latitude: 30.51, longitude: 114.31,
    },
  });
  await prisma.groupBuyMember.create({ data: { groupId: g1.id, userId: users[0].id, isInitiator: true } });
  log('scene1', { title: s1.product.title, groupNo: g1.groupNo, status: 'OPEN', members: 1, orders: 0, desc: '刚开团无人下单' });

  // === Scene 2: OPEN 差 1 人 (2 成员, 2 已付) ===
  const s2 = pick(1);
  await prisma.product.update({ where: { id: s2.product.id }, data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.7 } } });
  const g2 = await prisma.groupBuy.create({
    data: {
      groupNo: `GB${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      productId: s2.product.id, skuId: s2.sku.id,
      initiatorId: users[1].id,
      groupPrice: (s2.price * 0.7).toFixed(2), originPrice: s2.price.toFixed(2),
      needed: 3, status: 'OPEN',
      expireAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
      roughArea: '城西附近', latitude: 30.52, longitude: 114.32,
    },
  });
  await prisma.groupBuyMember.create({ data: { groupId: g2.id, userId: users[1].id, isInitiator: true } });
  const g2o1 = await createGroupOrder(users[1].id, s2.product.id, s2.product.title, s2.product.coverUrl, s2.product.merchantId, g2.id, s2.sku, s2.price * 0.7, addrSnap);
  await prisma.groupBuyMember.create({ data: { groupId: g2.id, userId: users[2].id, isInitiator: false } });
  const g2o2 = await createGroupOrder(users[2].id, s2.product.id, s2.product.title, s2.product.coverUrl, s2.product.merchantId, g2.id, s2.sku, s2.price * 0.7, addrSnap);
  log('scene2', { title: s2.product.title, groupNo: g2.groupNo, status: 'OPEN', members: 2, orders: [g2o1, g2o2], desc: '差1人成团' });

  // === Scene 3: COMPLETED 已成团 (3 成员, 3 已付) ===
  const s3 = pick(2);
  await prisma.product.update({ where: { id: s3.product.id }, data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.7 } } });
  const g3 = await prisma.groupBuy.create({
    data: {
      groupNo: `GB${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      productId: s3.product.id, skuId: s3.sku.id,
      initiatorId: users[0].id,
      groupPrice: (s3.price * 0.7).toFixed(2), originPrice: s3.price.toFixed(2),
      needed: 3, status: 'COMPLETED',
      expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), completedAt: now,
      roughArea: '城南附近', latitude: 30.53, longitude: 114.33,
    },
  });
  await prisma.groupBuyMember.create({ data: { groupId: g3.id, userId: users[0].id, isInitiator: true } });
  const g3o1 = await createGroupOrder(users[0].id, s3.product.id, s3.product.title, s3.product.coverUrl, s3.product.merchantId, g3.id, s3.sku, s3.price * 0.7, addrSnap);
  await prisma.groupBuyMember.create({ data: { groupId: g3.id, userId: users[1].id, isInitiator: false } });
  const g3o2 = await createGroupOrder(users[1].id, s3.product.id, s3.product.title, s3.product.coverUrl, s3.product.merchantId, g3.id, s3.sku, s3.price * 0.7, addrSnap);
  await prisma.groupBuyMember.create({ data: { groupId: g3.id, userId: users[2].id, isInitiator: false } });
  const g3o3 = await createGroupOrder(users[2].id, s3.product.id, s3.product.title, s3.product.coverUrl, s3.product.merchantId, g3.id, s3.sku, s3.price * 0.7, addrSnap);
  log('scene3', { title: s3.product.title, groupNo: g3.groupNo, status: 'COMPLETED', members: 3, orders: [g3o1, g3o2, g3o3], desc: '已成团' });

  // === Scene 4: FAILED 已过期 (1 成员, 0 订单) ===
  const s4 = pick(3);
  await prisma.product.update({ where: { id: s4.product.id }, data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.7 } } });
  const g4 = await prisma.groupBuy.create({
    data: {
      groupNo: `GB${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      productId: s4.product.id, skuId: s4.sku.id,
      initiatorId: users[3]?.id ?? users[0].id,
      groupPrice: (s4.price * 0.7).toFixed(2), originPrice: s4.price.toFixed(2),
      needed: 3, status: 'FAILED',
      expireAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      roughArea: '城北附近', latitude: 30.54, longitude: 114.34,
    },
  });
  await prisma.groupBuyMember.create({ data: { groupId: g4.id, userId: users[3]?.id ?? users[0].id, isInitiator: true } });
  log('scene4', { title: s4.product.title, groupNo: g4.groupNo, status: 'FAILED', members: 1, orders: 0, desc: '已过期未成团' });

  // === Scene 5: 商品启用拼团但无开团 ===
  const s5 = pick(4);
  await prisma.product.update({ where: { id: s5.product.id }, data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.65 } } });
  log('scene5', { title: s5.product.title, groupBuyConfig: 'enabled (discountRate=0.65)', desc: '待开团' });

  // === Assertions ===
  const [gbCount, memCount, ordCount, openC, compC, failC] = await Promise.all([
    prisma.groupBuy.count(),
    prisma.groupBuyMember.count(),
    prisma.order.count({ where: { groupBuyId: { not: null } } }),
    prisma.groupBuy.count({ where: { status: 'OPEN' } }),
    prisma.groupBuy.count({ where: { status: 'COMPLETED' } }),
    prisma.groupBuy.count({ where: { status: 'FAILED' } }),
  ]);

  const assertions = [
    { name: '团数量 >= 4', pass: gbCount >= 4, detail: `actual=${gbCount}` },
    { name: '成员数量 >= 7', pass: memCount >= 7, detail: `actual=${memCount}` },
    { name: '关联订单 >= 5', pass: ordCount >= 5, detail: `actual=${ordCount}` },
    { name: '有 OPEN 团', pass: openC >= 1, detail: `actual=${openC}` },
    { name: '有 COMPLETED 团', pass: compC >= 1, detail: `actual=${compC}` },
    { name: '有 FAILED 团', pass: failC >= 1, detail: `actual=${failC}` },
  ];
  const failedCount = assertions.filter((a) => !a.pass).length;
  log('done', { gbCount, memCount, ordCount, byStatus: { OPEN: openC, COMPLETED: compC, FAILED: failC }, assertions, failed: failedCount });
  if (failedCount > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error('注入失败:', e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
