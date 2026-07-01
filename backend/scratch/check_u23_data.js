const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetId = BigInt(23);
  console.log(`Inspecting data for User ID: ${targetId}`);
  
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    console.log('User not found.');
    return;
  }
  
  const addresses = await prisma.userAddress.findMany({ where: { userId: targetId } });
  const orders = await prisma.order.findMany({ where: { userId: targetId } });
  const cartItems = await prisma.cartItem.findMany({ where: { userId: targetId } });
  const userCoupons = await prisma.userCoupon.findMany({ where: { userId: targetId } });
  const pointLogs = await prisma.pointLog.findMany({ where: { userId: targetId } });
  const groupBuyMembers = await prisma.groupBuyMember.findMany({ where: { userId: targetId } });
  const messages = await prisma.userMessage.findMany({ where: { userId: targetId } });

  console.log({
    user: {
      id: user.id.toString(),
      openid: user.openid,
      nickname: user.nickname,
      mobile: user.mobile,
      deletedAt: user.deletedAt
    },
    addresses,
    orders,
    cartItems,
    userCoupons,
    pointLogs,
    groupBuyMembers,
    messages
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
