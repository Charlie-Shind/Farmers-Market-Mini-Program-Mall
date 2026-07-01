/**
 * 校验已有限时秒杀数据的合法性
 *
 * 用法：
 *   npm run scenario:flash:verify
 *
 * 校验项（任意一项失败 exit 1）：
 *   - 至少存在 1 个场次、至少 1 个商品
 *   - flashPrice < originPrice
 *   - 0 ≤ stockLeft ≤ totalStock
 *   - 场次时间无重叠
 *   - 折扣落在 5–8 折区间
 *   - 每个在场次都有商品（无空场）
 *   - 每个商品都关联到有效的 window/sku/product
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

type Assertion = { name: string; pass: boolean; detail?: string };

async function runAll(): Promise<Assertion[]> {
  const out: Assertion[] = [];

  const winCount = await prisma.flashSaleWindow.count();
  const itemCount = await prisma.flashSaleItem.count();
  out.push({ name: '场次存在', pass: winCount > 0, detail: `count=${winCount}` });
  out.push({ name: '商品存在', pass: itemCount > 0, detail: `count=${itemCount}` });

  const priceCheck = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt FROM flash_sale_item WHERE flash_price >= origin_price
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

  const overlapCheck = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM flash_sale_window a
    JOIN flash_sale_window b ON a.id < b.id
      AND a.start_at < b.end_at
      AND b.start_at < a.end_at
  `;
  out.push({
    name: '场次时间无重叠',
    pass: Number(overlapCheck[0]?.cnt ?? 0) === 0,
    detail: `重叠对数=${overlapCheck[0]?.cnt ?? 0}`,
  });

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

  const emptyWindow = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM flash_sale_window w
    WHERE NOT EXISTS (SELECT 1 FROM flash_sale_item i WHERE i.window_id = w.id)
  `;
  out.push({
    name: '无空场次',
    pass: Number(emptyWindow[0]?.cnt ?? 0) === 0,
    detail: `空场数=${emptyWindow[0]?.cnt ?? 0}`,
  });

  const orphanItem = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM flash_sale_item i
    LEFT JOIN flash_sale_window w ON w.id = i.window_id
    LEFT JOIN product_sku s ON s.id = i.sku_id
    LEFT JOIN product p ON p.id = i.product_id
    WHERE w.id IS NULL OR s.id IS NULL OR p.id IS NULL
  `;
  out.push({
    name: '商品关联完整 (window/sku/product 均存在)',
    pass: Number(orphanItem[0]?.cnt ?? 0) === 0,
    detail: `孤儿数=${orphanItem[0]?.cnt ?? 0}`,
  });

  const byStatus = await prisma.flashSaleWindow.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  console.log('\n📊 场次状态分布:', JSON.stringify(byStatus.map((r) => ({ status: r.status, count: r._count._all })), null, 2));

  const windowSample = await prisma.flashSaleWindow.findMany({
    orderBy: { startAt: 'asc' },
    take: 5,
    include: { _count: { select: { items: true } } },
  });
  console.log('\n🪟 最早 5 场:');
  for (const w of windowSample) {
    console.log(`  - [${w.label}] ${w.startAt.toISOString()} → ${w.endAt.toISOString()} status=${w.status} items=${w._count.items}`);
  }

  return out;
}

async function main() {
  const start = Date.now();
  const assertions = await runAll();
  const failed = assertions.filter((a) => !a.pass);
  const passed = assertions.length - failed.length;
  const costMs = Date.now() - start;

  console.log('\n✅ 校验报告');
  console.log('─'.repeat(60));
  for (const a of assertions) {
    console.log(`${a.pass ? '✅' : '❌'} ${a.name}  ${a.detail ? `(${a.detail})` : ''}`);
  }
  console.log('─'.repeat(60));
  console.log(`📈 通过 ${passed}/${assertions.length}  耗时 ${costMs}ms`);

  if (failed.length > 0) {
    console.log('\n❌ 失败项:');
    failed.forEach((f) => console.log(`   - ${f.name}`));
    process.exitCode = 1;
  } else {
    console.log('\n🎉 全部通过');
  }
}

main()
  .catch((e) => {
    console.error('校验失败:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });