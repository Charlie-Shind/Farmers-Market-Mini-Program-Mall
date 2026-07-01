const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const orders = await prisma.order.findMany({
    orderBy: { id: 'desc' },
    take: 10,
    include: { items: true },
  });
  console.log(JSON.stringify(orders, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  ));
  await prisma.$disconnect();
}

main().catch(console.error);
