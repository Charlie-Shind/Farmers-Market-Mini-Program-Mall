const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Inspecting all users relations...');
  const users = await prisma.user.findMany();
  for (const user of users) {
    const id = user.id;
    const addresses = await prisma.userAddress.count({ where: { userId: id } });
    const orders = await prisma.order.count({ where: { userId: id } });
    const cartItems = await prisma.cartItem.count({ where: { userId: id } });
    const userCoupons = await prisma.userCoupon.count({ where: { userId: id } });
    const pointLogs = await prisma.pointLog.count({ where: { userId: id } });
    const groupBuyMembers = await prisma.groupBuyMember.count({ where: { userId: id } });
    const messages = await prisma.userMessage.count({ where: { userId: id } });

    if (addresses > 0 || orders > 0 || cartItems > 0 || userCoupons > 0 || pointLogs > 0 || groupBuyMembers > 0 || messages > 0) {
      console.log({
        id: id.toString(),
        openid: user.openid,
        accountNo: user.accountNo,
        nickname: user.nickname,
        mobile: user.mobile,
        deletedAt: user.deletedAt,
        relations: {
          addresses,
          orders,
          cartItems,
          userCoupons,
          pointLogs,
          groupBuyMembers,
          messages
        }
      });
    }
  }
  console.log('Done.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
