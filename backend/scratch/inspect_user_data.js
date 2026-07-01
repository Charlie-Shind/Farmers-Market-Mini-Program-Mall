const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetMobile = '18297874290';
  console.log(`Inspecting data for mobile: ${targetMobile}`);
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { mobile: targetMobile },
        { openid: { contains: targetMobile } },
        { nickname: { contains: targetMobile } }
      ]
    }
  });
  
  console.log(`Found ${users.length} user records associated with ${targetMobile}:`);
  for (const user of users) {
    const id = user.id;
    const addresses = await prisma.userAddress.count({ where: { userId: id } });
    const orders = await prisma.order.count({ where: { userId: id } });
    const cartItems = await prisma.cartItem.count({ where: { userId: id } });
    const userCoupons = await prisma.userCoupon.count({ where: { userId: id } });
    const pointLogs = await prisma.pointLog.count({ where: { userId: id } });
    const groupBuyMembers = await prisma.groupBuyMember.count({ where: { userId: id } });
    const messages = await prisma.userMessage.count({ where: { userId: id } });

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

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
