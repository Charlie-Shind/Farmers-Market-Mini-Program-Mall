import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return;
  }
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalIndex = line.indexOf('=');
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

const DEFAULT_OPENID = 'seed_user_001';

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

function toOrderNo() {
  return `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function toPayNo() {
  return `PAY${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

async function main() {
  const openid = getArg('openid');
  const skuIdArg = getArg('skuId');
  const quantity = Math.max(Number(getArg('quantity') ?? '1') || 1, 1);

  const requestedUser = openid
    ? await prisma.user.findUnique({ where: { openid } })
    : null;
  const defaultUser = await prisma.user.findUnique({ where: { openid: DEFAULT_OPENID } });
  const firstActiveUser = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
  const user = requestedUser ?? defaultUser ?? firstActiveUser;
  if (!user) {
    throw new Error(`No active user found. Run seed first or pass --openid=... (default: ${DEFAULT_OPENID})`);
  }

  const address = await prisma.userAddress.findFirst({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  if (!address) {
    throw new Error(`No address found for user ${user.openid}.`);
  }

  const sku = skuIdArg
    ? await prisma.productSku.findUnique({
        where: { id: BigInt(skuIdArg) },
        include: { product: true },
      })
    : await prisma.productSku.findFirst({
        where: {
          status: 1,
          stock: { gt: quantity },
          product: { status: 1, auditStatus: 2, deletedAt: null },
        },
        include: { product: true },
        orderBy: { id: 'asc' },
      });
  if (!sku || !sku.product) {
    throw new Error('No saleable sku found. Run seed first or pass --skuId=...');
  }

  const goodsAmount = Number(sku.price) * quantity;
  const freightAmount = goodsAmount >= 99 ? 0 : 8;
  const payAmount = goodsAmount + freightAmount;
  const orderNo = toOrderNo();
  const payNo = toPayNo();
  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo,
        userId: user.id,
        merchantId: sku.product.merchantId,
        addressSnapshot: {
          receiverName: address.receiverName,
          receiverMobile: address.receiverMobile,
          province: address.province,
          city: address.city,
          district: address.district,
          detailAddress: address.detailAddress,
          isDefault: address.isDefault,
        },
        goodsAmount: new Prisma.Decimal(goodsAmount.toFixed(2)),
        freightAmount: new Prisma.Decimal(freightAmount.toFixed(2)),
        discountAmount: new Prisma.Decimal('0.00'),
        payAmount: new Prisma.Decimal(payAmount.toFixed(2)),
        orderStatus: 1,
        payStatus: 0,
        deliveryStatus: 0,
        refundStatus: 0,
        expireAt: new Date(now.getTime() + 30 * 60 * 1000),
        remark: 'scenario payment pending',
        items: {
          create: {
            productId: sku.productId,
            skuId: sku.id,
            productTitle: sku.product.title,
            skuName: sku.skuName,
            productImage: sku.imageUrl || sku.product.coverUrl,
            unitPrice: sku.price,
            quantity,
            lineAmount: new Prisma.Decimal(goodsAmount.toFixed(2)),
          },
        },
      },
    });

    const payment = await tx.paymentRecord.create({
      data: {
        payNo,
        orderNo,
        orderId: order.id,
        userId: user.id,
        payChannel: 1,
        amount: new Prisma.Decimal(payAmount.toFixed(2)),
        payStatus: 0,
        callbackData: {
          source: 'scenario-payment-pending',
        },
      },
    });

    await tx.productSku.update({
      where: { id: sku.id },
      data: {
        stock: { decrement: quantity },
        lockedStock: { increment: quantity },
      },
    });

    return { order, payment };
  });

  console.log(
    JSON.stringify(
      {
        scenario: 'payment:pending',
        orderNo: created.order.orderNo,
        paymentNo: created.payment.payNo,
        payAmount: payAmount.toFixed(2),
        userOpenid: user.openid,
        skuId: sku.id.toString(),
        productTitle: sku.product.title,
        quantity,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
