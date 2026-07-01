const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const deleted = await prisma.user.deleteMany({
    where: {
      id: BigInt(20)
    }
  });
  console.log(`Deleted ${deleted.count} user records (User ID 20).`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
