import { Prisma, PrismaClient } from '@prisma/client';
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
const DEFAULT_OPENID = 'seed_user_001';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const separateIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (separateIndex >= 0 && separateIndex + 1 < process.argv.length)
    return process.argv[separateIndex + 1];
  return undefined;
}

function toOrderNo() { return `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`; }
function now() { return new Date(); }
function log(label: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ flow: label, ...data, ts: now().toISOString() }, null, 2));
}

// ====== Flow 1: 创建订单 ======
async function flowCreateOrder() {
  const count = Math.min(Math.max(Number(getArg('count') ?? '3') || 3, 1), 10);
  const user = await prisma.user.findFirst({ where: { openid: DEFAULT_OPENID } });
  if (!user) throw new Error(`User not found: ${DEFAULT_OPENID}. Run seed first.`);

  const address = await prisma.userAddress.findFirst({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  if (!address) throw new Error('No address found. Run seed first.');

  const skus = await prisma.productSku.findMany({
    where: { status: 1, stock: { gt: 1 }, product: { status: 1, auditStatus: 2, deletedAt: null } },
    include: { product: true },
    take: count,
    orderBy: { id: 'asc' },
  });
  if (!skus.length) throw new Error('No saleable SKU found. Run seed first.');

  const results: string[] = [];

  for (const sku of skus.slice(0, count)) {
    const goodsAmount = Number(sku.price);
    const freightAmount = goodsAmount >= 99 ? 0 : 8;
    const payAmount = goodsAmount + freightAmount;
    const orderNo = toOrderNo();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo, userId: user.id, merchantId: sku.product.merchantId,
          addressSnapshot: {
            receiverName: address.receiverName, receiverMobile: address.receiverMobile,
            province: address.province, city: address.city, district: address.district,
            detailAddress: address.detailAddress, isDefault: address.isDefault,
          },
          goodsAmount, freightAmount, discountAmount: 0, payAmount,
          orderStatus: 1, payStatus: 0, deliveryStatus: 0, refundStatus: 0,
          expireAt: new Date(now().getTime() + 30 * 60 * 1000),
          items: {
            create: {
              productId: sku.productId, skuId: sku.id,
              productTitle: sku.product.title, skuName: sku.skuName,
              productImage: sku.imageUrl || sku.product.coverUrl,
              unitPrice: sku.price, quantity: 1, lineAmount: goodsAmount,
            },
          },
        },
      });
      await tx.productSku.update({
        where: { id: sku.id },
        data: { stock: { decrement: 1 }, lockedStock: { increment: 1 } },
      });
      return created;
    });

    results.push(order.orderNo);
    log('create_order', { orderNo: order.orderNo, productTitle: sku.product.title, payAmount });
  }

  return results;
}

// ====== Flow 2: 支付订单 ======
async function flowPayOrders(orderNos: string[]) {
  const results: string[] = [];

  for (const orderNo of orderNos) {
    const order = await prisma.order.findFirst({
      where: { orderNo, payStatus: 0, orderStatus: 1 },
      select: { id: true, orderNo: true, userId: true, merchantId: true, payAmount: true, isParent: true },
    });
    if (!order) {
      log('pay_order_skip', { orderNo, reason: 'not_found_or_already_paid' });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const childOrders = order.isParent
        ? await tx.order.findMany({ where: { parentOrderNo: orderNo, payStatus: 0, orderStatus: 1 }, select: { id: true, orderNo: true, payAmount: true } })
        : [];

      const allOrders = [order, ...childOrders];
      const paidAt = now();

      for (const o of allOrders) {
        await tx.order.update({
          where: { id: o.id },
          data: { payStatus: 1, paidAt },
        });
      }

      const totalPayAmount = allOrders.reduce((sum, o) => sum + Number(o.payAmount), 0);

      const payNo = `PAY${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      await tx.paymentRecord.create({
        data: {
          payNo, orderNo: order.orderNo, orderId: order.id, userId: order.userId,
          payChannel: 1, amount: totalPayAmount, payStatus: 1, paidAt,
          transactionId: `TXN${Date.now()}`, callbackData: { source: 'scenario-test-data' },
        },
      });

      if (childOrders.length) {
        for (const child of childOrders) {
          await tx.paymentRecord.create({
            data: {
              payNo: `${payNo}_${child.orderNo}`, orderNo: child.orderNo, orderId: child.id,
              userId: order.userId, payChannel: 1, amount: child.payAmount, payStatus: 1, paidAt,
              transactionId: `TXN${Date.now()}_${child.orderNo}`, callbackData: { source: 'scenario-test-data', parentPayNo: payNo },
            },
          });
        }
      }

      await tx.merchantWallet.upsert({
        where: { merchantId: order.merchantId },
        create: { merchantId: order.merchantId, availableBalance: totalPayAmount, frozenBalance: 0, totalIncome: totalPayAmount, totalWithdrawn: 0 },
        update: { availableBalance: { increment: totalPayAmount }, totalIncome: { increment: totalPayAmount } },
      });
    });

    results.push(orderNo);
    log('pay_order', { orderNo, payAmount: Number(order.payAmount) });
  }

  return results;
}

// ====== Flow 3: 发货 + 完成 ======
async function flowShipAndComplete(orderNos: string[]) {
  const results: string[] = [];

  for (const orderNo of orderNos) {
    const order = await prisma.order.findFirst({
      where: { orderNo, payStatus: 1, orderStatus: 2, deliveryStatus: 1 },
      select: { id: true, orderNo: true },
    });
    if (!order) {
      // 尝试先接单再发货
      const accepted = await prisma.order.updateMany({
        where: { orderNo, payStatus: 1, orderStatus: 1, deliveryStatus: 0 },
        data: { orderStatus: 2 },
      });
      if (accepted.count === 0) {
        log('ship_skip', { orderNo, reason: 'not_paid_or_not_pending' });
        continue;
      }
    }

    const shippedOrder = await prisma.order.findFirst({
      where: { orderNo, payStatus: 1, deliveryStatus: { in: [0, 1] } },
      select: { id: true, orderNo: true },
    });
    if (!shippedOrder) { log('ship_skip', { orderNo, reason: 'not_found' }); continue; }

    const shippedAt = now();
    const merchantId = (await prisma.order.findUnique({ where: { id: shippedOrder.id }, select: { merchantId: true } }))!.merchantId;
    await prisma.$transaction(async (tx) => {
      await tx.deliveryRecord.create({
        data: {
          orderId: shippedOrder.id,
          merchantId,
          logisticsCompany: '顺丰速运',
          trackingNo: `SF${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          shippedAt,
          deliveryStatus: 1,
        },
      });
      await tx.order.update({
        where: { id: shippedOrder.id },
        data: { deliveryStatus: 2, orderStatus: 3, completedAt: shippedAt },
      });
    });

    results.push(orderNo);
    log('ship_and_complete', { orderNo, shippedAt: shippedAt.toISOString() });
  }

  return results;
}

// ====== Flow 4: 创建系统消息（通知数据） ======
async function flowSystemMessages() {
  const merchant = await prisma.merchant.findFirst({
    where: { deletedAt: null, status: 1 },
    orderBy: { id: 'asc' },
  });
  if (!merchant) throw new Error('No merchant found. Run seed first.');

  const user = await prisma.user.findFirst({ where: { openid: DEFAULT_OPENID } });
  if (!user) throw new Error(`User not found: ${DEFAULT_OPENID}`);

  const messages = [
    { title: '平台公告：系统升级通知', summary: '平台将于本周六凌晨2:00-4:00进行系统升级，期间部分功能可能暂时不可用。', bizType: 'SYSTEM' },
    { title: '重要通知：新功能上线', summary: '商品溯源功能已上线，请在商品编辑页填写溯源码和溯源说明，提升买家信任度。', bizType: 'SYSTEM' },
    { title: '运营提示：夏季促销活动报名', summary: '夏季农产品促销活动已开放报名，符合条件的商家可前往活动管理页创建促销活动。', bizType: 'AUDIT' },
    { title: '审核通知：店铺认证通过', summary: '您的店铺资质认证已审核通过，现在可以正常发布商品和接收订单。', bizType: 'AUDIT' },
    { title: '安全提醒：请更新店铺密码', summary: '为了保障您的账户安全，建议定期更新登录密码并开启二次验证。', bizType: 'SYSTEM' },
  ];

  const results: number[] = [];
  for (const msg of messages) {
    const existing = await prisma.systemMessage.findFirst({ where: { title: msg.title } });
    if (existing) {
      log('msg_skip', { title: msg.title, reason: 'already_exists' });
      continue;
    }

    const created = await prisma.systemMessage.create({
      data: {
        type: 'NOTICE',
        title: msg.title,
        summary: msg.summary,
        bizType: msg.bizType,
        senderType: 'ADMIN',
        status: 'PUBLISHED',
        publishAt: now(),
        contentJson: { blocks: [{ type: 'text', text: msg.summary }] },
      },
    });

    // 创建 receipt（让通知对用户可见）
    await prisma.userMessage.create({
      data: {
        messageId: created.id,
        userId: user.id,
        isRead: false,
      },
    });

    results.push(Number(created.id));
    log('create_msg', { id: Number(created.id), title: msg.title, bizType: msg.bizType });
  }

  return results;
}

// ====== Flow 5: 创建退款/售后通知 ======
async function flowRefundNotice() {
  const paidOrders = await prisma.order.findMany({
    where: { payStatus: 1, refundStatus: 0, orderStatus: { in: [2, 3] } },
    take: 3,
    orderBy: { id: 'asc' },
    select: { id: true, orderNo: true, payAmount: true, userId: true },
  });
  if (!paidOrders.length) {
    log('refund_skip', { reason: 'no_paid_orders' });
    return [];
  }

  const results: string[] = [];
  for (const order of paidOrders.slice(0, 2)) {
    const existing = await prisma.refundApply.findFirst({ where: { orderId: order.id, deletedAt: null } });
    if (existing) { log('refund_skip', { orderNo: order.orderNo, reason: 'already_exists' }); continue; }

    // 获取 order 详情用于 refund
    const orderDetail = await prisma.order.findUnique({ where: { id: order.id }, include: { items: { take: 1 } } });
    if (!orderDetail?.items[0]) { log('refund_skip', { orderNo: order.orderNo, reason: 'no_items' }); continue; }

    const refundNo = `RF${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    await prisma.refundApply.create({
      data: {
        refundNo, orderId: order.id, orderItemId: orderDetail.items[0].id,
        userId: order.userId, merchantId: orderDetail.merchantId,
        applyType: 1, applyReason: '测试售后流程',
        refundAmount: new Prisma.Decimal(String(order.payAmount || '10.00')),
        status: 1, createdAt: now(),
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { refundStatus: 1 } });

    results.push(refundNo);
    log('create_refund', { refundNo, orderNo: order.orderNo });
  }

  return results;
}

// ====== Main ======
async function main() {
  const flow = String(getArg('flow') ?? 'all').toLowerCase();
  const count = Math.min(Math.max(Number(getArg('count') ?? '3') || 3, 1), 10);

  console.log(`\n=== 测试数据生成 flow=${flow} count=${count} ===\n`);

  // Flow: order — 创建 + 支付 + 发货完成
  if (flow === 'order' || flow === 'all') {
    console.log('--- 1. 创建订单 ---');
    const orderNos = await flowCreateOrder();
    console.log(`\n--- 2. 支付订单 (${orderNos.length} 笔) ---`);
    const paidNos = await flowPayOrders(orderNos);
    console.log(`\n--- 3. 发货 + 完成 (${paidNos.length} 笔) ---`);
    await flowShipAndComplete(paidNos);
  }

  // Flow: message — 系统消息 + 售后通知
  if (flow === 'message' || flow === 'all') {
    console.log('\n--- 4. 系统消息 ---');
    await flowSystemMessages();
    console.log('\n--- 5. 售后通知 ---');
    await flowRefundNotice();
  }

  console.log('\n=== 完成 ===\n');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
