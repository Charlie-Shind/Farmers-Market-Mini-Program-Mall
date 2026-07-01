import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fix = process.argv.includes('--fix');
  const grouped = await prisma.user.groupBy({
    by: ['mobile'],
    where: {
      deletedAt: null,
      mobile: { not: null },
    },
    _count: {
      _all: true,
    },
  });
  const duplicates = grouped.filter((group) => Number(group._count._all ?? 0) > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate active mobile numbers found.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicated mobile group(s).`);

  for (const group of duplicates) {
    const mobile = group.mobile;
    if (!mobile) {
      continue;
    }

    const users = await prisma.user.findMany({
      where: {
        mobile,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        openid: true,
        accountNo: true,
        nickname: true,
        mobile: true,
        updatedAt: true,
      },
    });

    console.log(`Mobile ${mobile}:`);
    for (const user of users) {
      console.log(`  - ${String(user.id)} ${user.accountNo ?? ''} ${user.nickname ?? ''} ${user.updatedAt.toISOString()}`);
    }

    if (!fix) {
      continue;
    }

    const [keeper, ...duplicatesToClear] = users;
    if (!keeper || duplicatesToClear.length === 0) {
      continue;
    }

    await prisma.$transaction(
      duplicatesToClear.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { mobile: null },
        }),
      ),
    );

    console.log(`  kept ${String(keeper.id)}, cleared ${duplicatesToClear.length} duplicate record(s)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
