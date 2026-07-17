/**
 * 巡检所有拼团（GroupBuy）记录，重点核对：
 *   - status 为 OPEN 但 expireAt 已过期（应被判定为已失败）
 *   - status 为 OPEN 但成团人数为 0（本质是发起人自己还未付款）
 *
 * 用法：
 *   npm run scenario:group:inspect
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const envPath = join(process.cwd(), fileName);
    if (!existsSync(envPath)) continue;
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
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

async function main() {
  const now = new Date();
  const groups = await prisma.groupBuy.findMany({
    include: {
      members: { select: { id: true, userId: true, orderNo: true } },
      product: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`共 ${groups.length} 条拼团记录，当前时间 ${now.toISOString()}\n`);

  const byStatus: Record<string, number> = {};
  for (const g of groups) byStatus[g.status] = (byStatus[g.status] || 0) + 1;
  console.log('状态分布：', byStatus);

  console.log('\n全部记录明细：\n');
  for (const g of groups) {
    const expired = g.expireAt < now;
    const noMembers = g.members.length === 0;
    const wouldShowInNearbyList = g.status === 'OPEN' && !expired;
    console.log({
      groupId: g.id.toString(),
      groupNo: g.groupNo,
      title: g.product.title,
      status: g.status,
      needed: g.needed,
      memberCount: g.members.length,
      expireAt: g.expireAt.toISOString(),
      expired,
      noMembers,
      wouldShowInNearbyList,
      createdAt: g.createdAt.toISOString(),
    });
  }

  const abnormal = groups.filter((g) => {
    if (g.status !== 'OPEN') return false;
    return g.expireAt < now || g.members.length === 0;
  });
  console.log(`\n状态为 OPEN 但异常（已过期 或 成团人数为0）的记录：${abnormal.length} 条`);

  const zeroMemberVisible = groups.filter((g) => g.status === 'OPEN' && g.expireAt > now && g.members.length === 0);
  console.log(`会出现在"邻里拼团"列表中、但成团人数为0的记录：${zeroMemberVisible.length} 条`);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
