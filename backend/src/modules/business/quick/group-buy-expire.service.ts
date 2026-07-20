import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';

const SCAN_INTERVAL_MS = 20_000;

@Injectable()
export class GroupBuyExpireService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GroupBuyExpireService.name);
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformDataService: PlatformDataService,
  ) {}

  async onModuleInit() {
    await this.scanOnce().catch((err) => {
      this.logger.error('Initial group buy scan failed', err);
    });
    this.timer = setInterval(() => {
      void this.scanOnce().catch((err) => {
        this.logger.error('Scheduled group buy scan failed', err);
      });
    }, SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scanOnce(): Promise<{ processedGroups: number; refundedOrders: number }> {
    if (this.scanning) {
      return { processedGroups: 0, refundedOrders: 0 };
    }
    this.scanning = true;
    let processedGroups = 0;
    let refundedOrders = 0;
    try {
      const now = new Date();
      const overdue = await this.prisma.groupBuy.findMany({
        where: {
          status: 'OPEN',
          expireAt: { lt: now },
        },
        select: { id: true, groupNo: true },
        take: 100,
      });

      for (const group of overdue) {
        const result = await this.expireOne(group.id);
        if (result > 0) {
          processedGroups += 1;
          refundedOrders += result;
        }
      }
      if (processedGroups > 0) {
        this.logger.log(`Expired ${processedGroups} group buy(s), refunded ${refundedOrders} order(s)`);
      }
    } catch (err) {
      this.logger.error('scanOnce error', err as Error);
    } finally {
      this.scanning = false;
    }
    return { processedGroups, refundedOrders };
  }

  private async expireOne(groupId: bigint): Promise<number> {
    let refundedOrders = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        // 标记拼团为 FAILED（如果还是 OPEN）
        const updated = await tx.groupBuy.updateMany({
          where: { id: groupId, status: 'OPEN' },
          data: { status: 'FAILED' },
        });
        if (updated.count === 0) {
          return;
        }

        // 找出该拼团下所有"已支付"的订单
        const orders = await tx.order.findMany({
          where: {
            groupBuyId: groupId,
            payStatus: 1,
            orderStatus: { in: [1, 2] },
            refundStatus: 0,
          },
          include: { items: true },
        });

        for (const order of orders) {
          // 恢复库存
          for (const oi of order.items) {
            await tx.productSku.update({
              where: { id: oi.skuId },
              data: {
                stock: { increment: oi.quantity },
                lockedStock: { decrement: oi.quantity },
              },
            });
          }

          // 退积分（如有下单抵扣）
          const pointsDeductLog = await tx.pointLog.findFirst({
            where: {
              sourceNo: order.orderNo,
              changeType: 'DEDUCT',
              remark: { in: ['订单抵扣积分', '拼团订单抵扣积分'] },
            },
          });
          if (pointsDeductLog) {
            const refundPoints = Math.abs(Number(pointsDeductLog.points));
            if (refundPoints > 0) {
              await tx.pointLog.create({
                data: {
                  userId: order.userId,
                  changeType: 'REFUND',
                  points: refundPoints,
                  sourceType: 'ORDER',
                  sourceNo: order.orderNo,
                  remark: '拼团失败退还积分',
                },
              });
            }
          }

          // 扣回支付成功时已发放的奖励积分
          const earnLog = await tx.pointLog.findFirst({
            where: {
              userId: order.userId,
              sourceNo: order.orderNo,
              changeType: 'EARN',
              sourceType: 'ORDER',
            },
          });
          if (earnLog) {
            const earnPoints = Math.abs(Number(earnLog.points));
            const alreadyClawed = await tx.pointLog.findFirst({
              where: {
                userId: order.userId,
                sourceNo: order.orderNo,
                changeType: 'DEDUCT',
                sourceType: 'ORDER',
                remark: '订单退款扣回支付奖励积分',
              },
            });
            if (earnPoints > 0 && !alreadyClawed) {
              await tx.pointLog.create({
                data: {
                  userId: order.userId,
                  changeType: 'DEDUCT',
                  points: -earnPoints,
                  sourceType: 'ORDER',
                  sourceNo: order.orderNo,
                  remark: '订单退款扣回支付奖励积分',
                },
              });
            }
          }

          // 退优惠券（如有使用）
          await tx.userCoupon.updateMany({
            where: { orderNo: order.orderNo, status: 'USED' },
            data: { status: 'RECEIVED', usedAt: null, orderNo: null },
          });

          // 标记订单为已取消+已退款（模拟退款：库存/积分/优惠券已在上方回滚）
          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: 4,
              payStatus: 0,
              refundStatus: 3,
              cancelReason: '拼团失败自动退款',
            },
          });
          refundedOrders += 1;
        }

        // 团已失败：同时清理该团下"还未支付"的订单，及时释放锁定库存，
        // 不必等它们各自的下单超时定时器（OrderExpireService）再来处理
        const pendingOrders = await tx.order.findMany({
          where: {
            groupBuyId: groupId,
            payStatus: 0,
            orderStatus: 1,
          },
          include: { items: true },
        });

        for (const order of pendingOrders) {
          for (const oi of order.items) {
            await tx.productSku.update({
              where: { id: oi.skuId },
              data: {
                stock: { increment: oi.quantity },
                lockedStock: { decrement: oi.quantity },
              },
            });
          }

          const pointsDeductLog = await tx.pointLog.findFirst({
            where: { sourceNo: order.orderNo, changeType: 'DEDUCT' },
          });
          if (pointsDeductLog) {
            const refundPoints = Math.abs(Number(pointsDeductLog.points));
            if (refundPoints > 0) {
              await tx.pointLog.create({
                data: {
                  userId: order.userId,
                  changeType: 'REFUND',
                  points: refundPoints,
                  sourceType: 'ORDER',
                  sourceNo: order.orderNo,
                  remark: '拼团失败退还积分',
                },
              });
            }
          }

          await tx.userCoupon.updateMany({
            where: { orderNo: order.orderNo, status: 'USED' },
            data: { status: 'RECEIVED', usedAt: null, orderNo: null },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: 4,
              cancelReason: '拼团失败自动取消（未支付）',
            },
          });
        }
      });
    } catch (err) {
      this.logger.error(`expireOne(${groupId.toString()}) failed`, err as Error);
    }
    return refundedOrders;
  }
}
