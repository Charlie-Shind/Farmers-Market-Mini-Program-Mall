const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Querying users from database...');
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  });
  console.log(`Found ${users.length} users:`);
  for (const user of users) {
    console.log({
      id: user.id.toString(),
      openid: user.openid,
      accountNo: user.accountNo,
      nickname: user.nickname,
      mobile: user.mobile,
      status: user.status,
      deletedAt: user.deletedAt
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
