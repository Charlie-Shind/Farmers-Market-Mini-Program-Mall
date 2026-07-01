/**
 * 注入限时秒杀测试数据（注入 + 即时校验）
 *
 * 用法：
 *   npm run scenario:flash:inject
 *   npm run scenario:flash:inject -- --days=3 --items-per-window=6
 *   npm run scenario:flash:inject -- --reset          # 清空已有秒杀数据后注入
 *   npm run scenario:flash:inject -- --dry-run        # 只打印计划不写库
 *
 * 数据规模（默认参数）：
 *   - 覆盖今天 + 后 2 天，共 3 天
 *   - 每天 8 场（10/12/14/16/18/20/22/00 点各一场，每场 2 小时）
 *   - 每场 6 个商品 = 3 × 8 × 6 = 144 条秒杀商品
 *
 * 注入完成后会跑断言：
 *   - 场次数符合预期
 *   - 商品数符合预期
 *   - 每个商品 flashPrice < originPrice
 *   - 场次时间无重叠
 *   - 库存未越界（stockLeft ≤ totalStock ≥ 0）
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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

type SkuCandidate = { productId: bigint; skuId: bigint; originPrice: number; title: string };

function getArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const idx = process.argv.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function log(label: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ flow: label, ...data, ts: new Date().toISOString() }, null, 2));
}

async function collectSkuPool(): Promise<SkuCandidate[]> {
  const products = await prisma.product.findMany({
    where: { status: 1, auditStatus: 2, deletedAt: null },
    include: { skus: { orderBy: { id: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  const pool: SkuCandidate[] = [];
  for (const product of products) {
    const sku = product.skus[0];
    if (!sku || Number(sku.price) <= 0) continue;
    pool.push({
      productId: product.id,
      skuId: sku.id,
      originPrice: Number(sku.price),
      title: product.title,
    });
  }
  return pool;
}

function pickStock(status: 'UPCOMING' | 'ONGOING' | 'ENDED'): { totalStock: number; stockLeft: number } {
  const roll = Math.random();
  if (roll < 0.15 && status !== 'UPCOMING') {
    const total = 20 + Math.floor(Math.random() * 60);
    return { totalStock: total, stockLeft: 0 };
  }
  if (roll < 0.4) {
    const total = 5 + Math.floor(Math.random() * 15);
    return { totalStock: total, stockLeft: total };
  }
  const total = 50 + Math.floor(Math.random() * 51);
  return { totalStock: total, stockLeft: total };
}

type Assertion = { name: string; pass: boolean; detail?: string };

async function runAssertions(expectedWindows: number, expectedItems: number): Promise<Assertion[]> {
  const out: Assertion[] = [];

  const winCount = await prisma.flashSaleWindow.count();
  out.push({
    name: '窗口数符合预期',
    pass: winCount >= expectedWindows,
    detail: `actual=${winCount}, expected>=${expectedWindows}`,
  });

  const itemCount = await prisma.flashSaleItem.count();
  out.push({
    name: '商品数符合预期',
    pass: itemCount >= expectedItems,
    detail: `actual=${itemCount}, expected>=${expectedItems}`,
  });

  const badPrice = await prisma.flashSaleItem.count({
    where: { flashPrice: { gte: prisma.flashSaleItem.fields ? undefined : undefined } },
  });
  // 用 raw 校验：flashPrice 必须 < originPrice
  const priceCheck = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM flash_sale_item
    WHERE flash_price >= origin_price
  `;
  out.push({
    name: '所有商品 flashPrice < originPrice',
    pass: Number(priceCheck[0]?.cnt ?? 0) === 0,
    detail: `违规条数=${priceCheck[0]?.cnt ?? 0}`,
  });

  const stockCheck = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM flash_sale_item
    WHERE stock_left < 0 OR stock_left > total_stock OR total_stock < 0
  `;
  out.push({
    name: '库存合法 (0 ≤ stockLeft ≤ totalStock)',
    pass: Number(stockCheck[0]?.cnt ?? 0) === 0,
    detail: `违规条数=${stockCheck[0]?.cnt ?? 0}`,
  });

  // 场次时间无重叠（按窗口边界检查）
  const overlapCheck = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM (
      SELECT a.id AS aid, b.id AS bid
      FROM flash_sale_window a
      JOIN flash_sale_window b ON a.id < b.id
        AND a.start_at < b.end_at
        AND b.start_at < a.end_at
    ) t
  `;
  out.push({
    name: '场次时间无重叠',
    pass: Number(overlapCheck[0]?.cnt ?? 0) === 0,
    detail: `重叠对数=${overlapCheck[0]?.cnt ?? 0}`,
  });

  // 折扣分布合理（5–8 折 = 0.5–0.8）
  const discountCheck = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM flash_sale_item
    WHERE flash_price / NULLIF(origin_price, 0) NOT BETWEEN 0.5 AND 0.8
  `;
  out.push({
    name: '折扣落在 5–8 折区间',
    pass: Number(discountCheck[0]?.cnt ?? 0) === 0,
    detail: `违规条数=${discountCheck[0]?.cnt ?? 0}`,
  });

  return out;
}

async function main() {
  const dayCount = Math.min(Math.max(Number(getArg('days', '3')) || 3, 1), 7);
  const itemsPerWindow = Math.min(Math.max(Number(getArg('items-per-window', '6')) || 6, 1), 20);
  const dryRun = hasFlag('dry-run');
  const reset = hasFlag('reset');
  const dailyStartHours = [10, 12, 14, 16, 18, 20, 22, 24]; // 24 = 次日 00:00

  log('plan', {
    dayCount,
    itemsPerWindow,
    dailyStartHours,
    expectedWindows: dayCount * dailyStartHours.length,
    expectedItems: dayCount * dailyStartHours.length * itemsPerWindow,
    dryRun,
    reset,
  });

  if (reset && !dryRun) {
    const claimDel = await prisma.flashSaleClaim.deleteMany({});
    const itemDel = await prisma.flashSaleItem.deleteMany({});
    const winDel = await prisma.flashSaleWindow.deleteMany({});
    log('reset', { claimDel: claimDel.count, itemDel: itemDel.count, winDel: winDel.count });
  }

  const pool = await collectSkuPool();
  if (pool.length === 0) {
    throw new Error('没有可用的在售商品 SKU，请先运行 npm run prisma:seed');
  }
  log('sku-pool', { size: pool.length, sample: pool.slice(0, 3).map((s) => s.title) });

  const now = new Date();
  let sortOrder = (await prisma.flashSaleWindow.count()) + 1;
  const summary = {
    windowsCreated: 0,
    itemsCreated: 0,
    byStatus: { UPCOMING: 0, ONGOING: 0, ENDED: 0 } as Record<string, number>,
    byStockKind: { plentiful: 0, tight: 0, soldOut: 0 } as Record<string, number>,
  };

  for (let day = 0; day < dayCount; day++) {
    for (const startHour of dailyStartHours) {
      const startAt = new Date(now);
      startAt.setDate(startAt.getDate() + day);
      if (startHour === 24) {
        startAt.setDate(startAt.getDate() + 1);
        startAt.setHours(0, 0, 0, 0);
      } else {
        startAt.setHours(startHour, 0, 0, 0);
      }
      const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

      let status: 'UPCOMING' | 'ONGOING' | 'ENDED';
      if (now >= endAt) status = 'ENDED';
      else if (now >= startAt) status = 'ONGOING';
      else status = 'UPCOMING';

      const label = `${pad2(startAt.getHours())}:${pad2(startAt.getMinutes())} 限时秒杀`;

      if (dryRun) {
        console.log(`[dry-run] window ${label} status=${status} start=${startAt.toISOString()} end=${endAt.toISOString()}`);
        summary.windowsCreated++;
        summary.byStatus[status] += itemsPerWindow;
        continue;
      }

      const window = await prisma.flashSaleWindow.create({
        data: { label, startAt, endAt, sortOrder: sortOrder++, status },
      });
      summary.windowsCreated++;

      const windowSeq = day * dailyStartHours.length + dailyStartHours.indexOf(startHour);
      for (let i = 0; i < itemsPerWindow; i++) {
        const cand = pool[(windowSeq * itemsPerWindow + i) % pool.length];
        const rate = round2(5 + Math.random() * 3);
        const flashPrice = round2((cand.originPrice * rate) / 10);
        const { totalStock, stockLeft } = pickStock(status);
        const perUserLimit = totalStock <= 20 ? 1 : 2;

        await prisma.flashSaleItem.create({
          data: {
            windowId: window.id,
            productId: cand.productId,
            skuId: cand.skuId,
            flashPrice: flashPrice.toFixed(2),
            originPrice: cand.originPrice.toFixed(2),
            totalStock,
            stockLeft,
            perUserLimit,
          },
        });

        summary.itemsCreated++;
        summary.byStatus[status]++;
        if (stockLeft === 0) summary.byStockKind.soldOut++;
        else if (totalStock <= 20) summary.byStockKind.tight++;
        else summary.byStockKind.plentiful++;
      }
    }
  }

  log('inject-summary', summary);

  if (!dryRun) {
    const expectedWindows = dayCount * dailyStartHours.length;
    const expectedItems = expectedWindows * itemsPerWindow;
    const assertions = await runAssertions(expectedWindows, expectedItems);
    const failed = assertions.filter((a) => !a.pass);
    log('assertions', { total: assertions.length, passed: assertions.length - failed.length, failed: failed.length, details: assertions });
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  }
}

main()
  .catch((e) => {
    console.error('注入失败:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });