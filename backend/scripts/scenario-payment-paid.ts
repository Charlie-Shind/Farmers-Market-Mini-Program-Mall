import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const orderNo = String(getArg('orderNo') ?? '').trim();
  if (!orderNo) {
    throw new Error('Usage: npm run scenario:payment:paid -- --orderNo=NOxxxx');
  }

  const rootOrder = await prisma.order.findFirst({
    where: { orderNo },
    select: {
      id: true,
      orderNo: true,
      userId: true,
      payStatus: true,
      merchantId: true,
      payAmount: true,
      isParent: true,
    },
  });
  if (!rootOrder) {
    throw new Error(`Order not found: ${orderNo}`);
  }
  if (rootOrder.payStatus === 1) {
    console.log(
      JSON.stringify(
        {
          scenario: 'payment:paid',
          orderNo,
          processed: false,
          reason: 'already_paid',
        },
        null,
        2,
      ),
    );
    return;
  }

  const childOrders = rootOrder.isParent
    ? await prisma.order.findMany({
        where: { parentOrderNo: orderNo },
        select: { id: true, merchantId: true, payAmount: true, orderNo: true },
      })
    : [];
  const paidAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { orderNo, payStatus: { not: 1 } },
      data: {
        payStatus: 1,
        orderStatus: 1,
        paidAt,
      },
    });

    if (childOrders.length > 0) {
      await tx.order.updateMany({
        where: { parentOrderNo: orderNo, payStatus: { not: 1 } },
        data: {
          payStatus: 1,
          orderStatus: 1,
          paidAt,
        },
      });
    }

    const existingPayment = await tx.paymentRecord.findFirst({
      where: { orderNo },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment) {
      await tx.paymentRecord.updateMany({
        where: { orderNo },
        data: {
          payStatus: 1,
          paidAt,
          callbackData: {
            source: 'scenario-payment-paid',
            paidAt: paidAt.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.paymentRecord.create({
        data: {
          payNo: `PAY${orderNo}`,
          orderNo,
          orderId: rootOrder.id,
          userId: rootOrder.userId,
          payChannel: 1,
          amount: rootOrder.payAmount,
          payStatus: 1,
          paidAt,
          callbackData: {
            source: 'scenario-payment-paid',
            paidAt: paidAt.toISOString(),
          },
        },
      });
    }

    if (childOrders.length > 0) {
      const merchantTotals = new Map<bigint, Prisma.Decimal>();
      for (const child of childOrders) {
        const current = merchantTotals.get(child.merchantId) ?? new Prisma.Decimal('0.00');
        merchantTotals.set(child.merchantId, current.plus(child.payAmount));
      }

      for (const [merchantId, total] of merchantTotals.entries()) {
        await tx.merchantWallet.upsert({
          where: { merchantId },
          create: {
            merchantId,
            availableBalance: total,
            frozenBalance: new Prisma.Decimal('0.00'),
            totalIncome: total,
            totalWithdrawn: new Prisma.Decimal('0.00'),
          },
          update: {
            availableBalance: { increment: total },
            totalIncome: { increment: total },
          },
        });
      }
    } else {
      await tx.merchantWallet.upsert({
        where: { merchantId: rootOrder.merchantId },
        create: {
          merchantId: rootOrder.merchantId,
          availableBalance: rootOrder.payAmount,
          frozenBalance: new Prisma.Decimal('0.00'),
          totalIncome: rootOrder.payAmount,
          totalWithdrawn: new Prisma.Decimal('0.00'),
        },
        update: {
          availableBalance: { increment: rootOrder.payAmount },
          totalIncome: { increment: rootOrder.payAmount },
        },
      });
    }
  });

  console.log(
    JSON.stringify(
      {
        scenario: 'payment:paid',
        orderNo,
        processed: true,
        paidAt: paidAt.toISOString(),
        childOrderNos: childOrders.map((item) => item.orderNo),
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
