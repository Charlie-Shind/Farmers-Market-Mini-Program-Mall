import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuthUser } from '../../../../common/types';
import { PickupStatus } from '../types/leader.types';
import { LeaderCommissionService } from './leader-commission.service';

@Injectable()
export class LeaderOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderCommissionService: LeaderCommissionService,
  ) {}

  private async ensureLeader(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { openid: authUser.sub } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const leader = await this.prisma.communityLeader.findUnique({
      where: { userId: user.id },
    });
    if (!leader || leader.status !== 'APPROVED') {
      throw new BadRequestException('您不是团长或状态异常');
    }

    return { user, leader };
  }

  async listOrders(authUser: AuthUser, query: { status?: string; page?: number; pageSize?: number }) {
    const { leader } = await this.ensureLeader(authUser);

    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const pickupPoints = await this.prisma.pickupPoint.findMany({
      where: { leaderId: leader.id },
      select: { id: true },
    });
    const pickupPointIds = pickupPoints.map((p) => p.id);

    if (pickupPointIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const where: Prisma.OrderWhereInput = {
      pickupPointId: { in: pickupPointIds },
      payStatus: 1,
      orderStatus: { not: 4 },
    };
    if (query.status === 'PENDING_PICKUP') {
      where.pickupStatus = PickupStatus.PENDING;
    } else if (query.status === 'PICKED_UP') {
      where.pickupStatus = PickupStatus.PICKED_UP;
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              productTitle: true,
              skuName: true,
              productImage: true,
              unitPrice: true,
              quantity: true,
            },
          },
          user: { select: { nickname: true, mobile: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        orderNo: order.orderNo,
        payAmount: Number(order.payAmount),
        goodsAmount: Number(order.goodsAmount),
        orderStatus: order.orderStatus,
        pickupStatus: order.pickupStatus,
        pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        items: order.items,
        user: order.user,
      })),
      total,
      page,
      pageSize,
    };
  }

  async confirmPickup(authUser: AuthUser, orderNo: string) {
    const { leader } = await this.ensureLeader(authUser);

    const order = await this.prisma.order.findFirst({
      where: { orderNo },
      include: { pickupPoint: true },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (!order.pickupPointId || order.pickupPoint?.leaderId !== leader.id) {
      throw new BadRequestException('该订单不属于您的自提点');
    }

    if (order.payStatus !== 1) {
      throw new BadRequestException('订单未支付');
    }

    if (order.orderStatus === 4) {
      throw new BadRequestException('订单已取消');
    }

    if (order.pickupStatus === PickupStatus.PICKED_UP) {
      throw new BadRequestException('订单已提货');
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupStatus: PickupStatus.PICKED_UP,
        pickedUpAt: new Date(),
        ...(order.orderStatus !== 3 ? { orderStatus: 3, completedAt: new Date() } : {}),
      },
    });

    await this.leaderCommissionService.createCommissionForOrder({
      orderId: updated.id,
      orderNo: updated.orderNo,
      payAmount: updated.payAmount,
      pickupPointId: updated.pickupPointId,
    }).catch(() => undefined);

    return {
      orderNo: updated.orderNo,
      pickupStatus: updated.pickupStatus,
      pickedUpAt: updated.pickedUpAt?.toISOString(),
    };
  }
}
