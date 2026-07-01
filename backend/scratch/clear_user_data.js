const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const mobilesToClear = ['18297874290', '19276405847'];

async function main() {
  console.log('Thoroughly clearing user data...');

  // 1. Find all users with matching mobile numbers, or whose openid contains the mobile, or who are soft-deleted with deleted_ prefix
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { mobile: { in: mobilesToClear } },
        { openid: { contains: '18297874290' } },
        { openid: { contains: '19276405847' } },
        { openid: { startsWith: 'deleted_' } },
        { nickname: '已注销用户' }
      ]
    }
  });

  console.log(`Found ${users.length} users to thoroughly delete:`, users.map(u => ({ id: u.id.toString(), nickname: u.nickname, mobile: u.mobile, openid: u.openid })));

  if (users.length === 0) {
    console.log('No users found to clear.');
    return;
  }

  const userIds = users.map(u => u.id);

  // 2. Perform cascade delete of related records in proper order to maintain foreign key constraints
  await prisma.$transaction(async (tx) => {
    // A. UserRole
    const rolesDeleted = await tx.userRole.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${rolesDeleted.count} UserRole records.`);

    // B. UserAddress
    const addressesDeleted = await tx.userAddress.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${addressesDeleted.count} UserAddress records.`);

    // C. CartItem
    const cartItemsDeleted = await tx.cartItem.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${cartItemsDeleted.count} CartItem records.`);

    // D. Favorite
    const favoritesDeleted = await tx.favorite.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${favoritesDeleted.count} Favorite records.`);

    // E. UserCoupon
    const couponsDeleted = await tx.userCoupon.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${couponsDeleted.count} UserCoupon records.`);

    // F. PointLog
    const pointLogsDeleted = await tx.pointLog.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${pointLogsDeleted.count} PointLog records.`);

    // G. FlashSaleClaim
    const claimsDeleted = await tx.flashSaleClaim.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${claimsDeleted.count} FlashSaleClaim records.`);

    // H. UserMessage
    const messagesDeleted = await tx.userMessage.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${messagesDeleted.count} UserMessage records.`);

    // I. GroupBuyMember & GroupBuy
    const gbmDeleted = await tx.groupBuyMember.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${gbmDeleted.count} GroupBuyMember records.`);

    const gbDeleted = await tx.groupBuy.deleteMany({
      where: { initiatorId: { in: userIds } }
    });
    console.log(`Deleted ${gbDeleted.count} GroupBuy records.`);

    // J. Leader Application, Bindings, Commissions
    const laDeleted = await tx.leaderApplication.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${laDeleted.count} LeaderApplication records.`);

    const lbDeleted = await tx.leaderBinding.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { leaderId: { in: userIds } }] }
    });
    console.log(`Deleted ${lbDeleted.count} LeaderBinding records.`);

    const lcDeleted = await tx.leaderCommission.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${lcDeleted.count} LeaderCommission records.`);

    // K. Orders and OrderItems, Payments, Refunds
    // Find all order IDs belonging to these users
    const orders = await tx.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });
    const orderIds = orders.map(o => o.id);

    if (orderIds.length > 0) {
      const refundsDeleted = await tx.refundApply.deleteMany({
        where: { orderId: { in: orderIds } }
      });
      console.log(`Deleted ${refundsDeleted.count} RefundApply records.`);

      const paymentsDeleted = await tx.paymentRecord.deleteMany({
        where: { orderId: { in: orderIds } }
      });
      console.log(`Deleted ${paymentsDeleted.count} PaymentRecord records.`);

      const orderItemsDeleted = await tx.orderItem.deleteMany({
        where: { orderId: { in: orderIds } }
      });
      console.log(`Deleted ${orderItemsDeleted.count} OrderItem records.`);

      const ordersDeleted = await tx.order.deleteMany({
        where: { id: { in: orderIds } }
      });
      console.log(`Deleted ${ordersDeleted.count} Order records.`);
    }

    // L. Merchant
    const merchantDeleted = await tx.merchant.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`Deleted ${merchantDeleted.count} Merchant records.`);

    // M. Finally, delete the Users
    const usersDeleted = await tx.user.deleteMany({
      where: { id: { in: userIds } }
    });
    console.log(`Successfully deleted ${usersDeleted.count} User records from the database.`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
