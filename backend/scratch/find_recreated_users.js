const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { mobile: '18297874290' },
        { openid: { contains: '18297874290' } },
        { openid: { contains: 'wechat_' } }
      ]
    }
  });
  console.log(`Currently in DB: ${users.length} users related to wechat/18297874290:`);
  for (const u of users) {
    console.log({
      id: u.id.toString(),
      openid: u.openid,
      nickname: u.nickname,
      mobile: u.mobile,
      deletedAt: u.deletedAt
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
