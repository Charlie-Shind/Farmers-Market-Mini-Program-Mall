import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';

const SCAN_INTERVAL_MS = 60_000;

@Injectable()
export class OrderExpireService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpireService.name);
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.scanOnce().catch((err) => {
      this.logger.error('Initial order expire scan failed', err);
    });
    this.timer = setInterval(() => {
      void this.scanOnce().catch((err) => {
        this.logger.error('Scheduled order expire scan failed', err);
      });
    }, SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scanOnce(): Promise<{ cancelledOrders: number }> {
    if (this.scanning) {
      return { cancelledOrders: 0 };
    }
    this.scanning = true;
    let cancelledOrders = 0;
    try {
      const now = new Date();

      // 找出所有过期的未支付待处理订单（只取独立订单和父订单，避免重复处理子订单）
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          payStatus: 0,
          orderStatus: 1,
          expireAt: { lt: now },
          deletedAt: null,
          OR: [
            { isParent: true },
            { parentOrderNo: null },
          ],
        },
        select: {
          id: true,
          orderNo: true,
          userId: true,
          isParent: true,
        },
        take: 100,
      });

      for (const order of expiredOrders) {
        const count = await this.expireOne(order.orderNo, order.userId, order.isParent);
        if (count > 0) {
          cancelledOrders += count;
        }
      }

      if (cancelledOrders > 0) {
        this.logger.log(`Expired ${expiredOrders.length} order group(s), cancelled ${cancelledOrders} order(s)`);
      }
    } catch (err) {
      this.logger.error('scanOnce error', err as Error);
    } finally {
      this.scanning = false;
    }
    return { cancelledOrders };
  }

  private async expireOne(orderNo: string, userId: bigint, isParent: boolean): Promise<number> {
    let cancelledCount = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        // 收集需要取消的订单（父订单 + 所有子订单，或独立订单）
        const targetParentOrderNo = isParent ? orderNo : null;
        const ordersToCancel = targetParentOrderNo
          ? await tx.order.findMany({
              where: {
                OR: [
                  { orderNo: targetParentOrderNo },
                  { parentOrderNo: targetParentOrderNo },
                ],
                payStatus: 0,
                orderStatus: 1,
              },
              select: { id: true, orderNo: true },
            })
          : await tx.order.findMany({
              where: { orderNo, payStatus: 0, orderStatus: 1 },
              select: { id: true, orderNo: true },
            });

        if (ordersToCancel.length === 0) return;

        const orderIds = ordersToCancel.map((o) => o.id);

        // 更新所有订单为已取消
        await tx.order.updateMany({
          where: { id: { in: orderIds }, payStatus: 0, orderStatus: 1 },
          data: { orderStatus: 4, cancelReason: '订单超时自动取消' },
        });

        // 恢复库存
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: { skuId: true, quantity: true },
        });
        for (const oi of orderItems) {
          await tx.productSku.update({
            where: { id: oi.skuId },
            data: {
              stock: { increment: oi.quantity },
              lockedStock: { decrement: oi.quantity },
            },
          });
        }

        // 恢复优惠券
        const couponLookupOrderNo = targetParentOrderNo ?? orderNo;
        await tx.userCoupon.updateMany({
          where: { userId, orderNo: couponLookupOrderNo, status: 'USED' },
          data: { status: 'RECEIVED', usedAt: null, orderNo: null },
        });

        // 退还积分
        for (const o of ordersToCancel) {
          const pointsDeductLog = await tx.pointLog.findFirst({
            where: { sourceNo: o.orderNo, changeType: 'DEDUCT' },
          });
          if (pointsDeductLog) {
            const refundPoints = Math.abs(Number(pointsDeductLog.points));
            if (refundPoints > 0) {
              await tx.pointLog.create({
                data: {
                  userId,
                  changeType: 'REFUND',
                  points: refundPoints,
                  sourceType: 'ORDER',
                  sourceNo: o.orderNo,
                  remark: '订单超时退还积分',
                },
              });
            }
          }
        }

        // 如果是拼团订单，将拼团成员状态标记
        const groupBuyOrderNos = ordersToCancel.map((o) => o.orderNo);
        await tx.groupBuyMember.updateMany({
          where: { orderNo: { in: groupBuyOrderNos } },
          data: { orderNo: null },
        });

        cancelledCount = ordersToCancel.length;
      });
    } catch (err) {
      this.logger.error(`expireOne(${orderNo}) failed`, err as Error);
    }
    return cancelledCount;
  }
}
