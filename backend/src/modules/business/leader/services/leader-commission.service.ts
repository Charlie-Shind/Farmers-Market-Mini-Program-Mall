import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuthUser } from '../../../../common/types';
import { CommissionStatus, DeliveryType, PickupStatus } from '../types/leader.types';

export interface CommissionCreationContext {
  orderId: bigint;
  orderNo: string;
  payAmount: Prisma.Decimal;
  pickupPointId?: bigint | null;
}

@Injectable()
export class LeaderCommissionService {
  constructor(private readonly prisma: PrismaService) {}

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

    return leader;
  }

  private async getDefaultCommissionRate(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'leader.default_commission_rate' },
    });
    if (setting) {
      const value = Number(setting.value);
      if (!Number.isNaN(value) && value >= 0 && value <= 1) {
        return value;
      }
    }
    return 0.05;
  }

  async createCommissionForOrder(ctx: CommissionCreationContext) {
    if (!ctx.pickupPointId) {
      return null;
    }

    const pickupPoint = await this.prisma.pickupPoint.findUnique({
      where: { id: ctx.pickupPointId },
      include: { leader: true },
    });

    if (!pickupPoint || !pickupPoint.leaderId || !pickupPoint.leader) {
      return null;
    }

    const leader = pickupPoint.leader;
    if (leader.status !== 'APPROVED') {
      return null;
    }

    const rate = leader.commissionRate != null ? Number(leader.commissionRate) : await this.getDefaultCommissionRate();
    const orderAmount = Number(ctx.payAmount);
    const commissionAmount = Math.round(orderAmount * rate * 100) / 100;

    const existing = await this.prisma.leaderCommission.findFirst({
      where: { orderNo: ctx.orderNo },
    });
    if (existing) {
      return this.serialize(existing);
    }

    const commission = await this.prisma.leaderCommission.create({
      data: {
        leaderId: leader.id,
        orderId: ctx.orderId,
        orderNo: ctx.orderNo,
        orderAmount: ctx.payAmount,
        commissionRate: new Prisma.Decimal(rate.toFixed(4)),
        commissionAmount: new Prisma.Decimal(commissionAmount.toFixed(2)),
        status: CommissionStatus.PENDING_SETTLEMENT,
        remark: '订单完成分佣',
      },
    });

    return this.serialize(commission);
  }

  async adjustCommissionOnRefund(orderNo: string, refundAmount: number) {
    const commission = await this.prisma.leaderCommission.findFirst({
      where: { orderNo },
      include: { leader: true },
    });

    if (!commission) {
      return null;
    }

    if (commission.status === CommissionStatus.SETTLED) {
      throw new BadRequestException('佣金已结算，无法自动冲正，请联系管理员');
    }

    const orderAmount = Number(commission.orderAmount);
    if (orderAmount <= 0) {
      return this.prisma.leaderCommission.update({
        where: { id: commission.id },
        data: { status: CommissionStatus.CANCELLED, remark: '订单金额异常，撤销分佣' },
      });
    }

    const rate = Number(commission.commissionRate);
    const remainingAmount = Math.max(orderAmount - refundAmount, 0);

    if (remainingAmount <= 0) {
      return this.prisma.leaderCommission.update({
        where: { id: commission.id },
        data: {
          commissionAmount: new Prisma.Decimal(0),
          status: CommissionStatus.CANCELLED,
          remark: '订单全额退款，撤销分佣',
        },
      });
    }

    const newCommissionAmount = Math.round(remainingAmount * rate * 100) / 100;
    return this.prisma.leaderCommission.update({
      where: { id: commission.id },
      data: {
        orderAmount: new Prisma.Decimal(remainingAmount.toFixed(2)),
        commissionAmount: new Prisma.Decimal(newCommissionAmount.toFixed(2)),
        remark: `部分退款扣减：退款金额 ${refundAmount.toFixed(2)}`,
      },
    });
  }

  async settle(ids: bigint[], adminUserId?: bigint) {
    const commissions = await this.prisma.leaderCommission.findMany({
      where: { id: { in: ids } },
    });

    const notFound = ids.filter((id) => !commissions.some((c) => c.id === id));
    if (notFound.length > 0) {
      throw new NotFoundException(`佣金记录不存在: ${notFound.join(', ')}`);
    }

    const invalid = commissions.filter((c) => c.status !== CommissionStatus.PENDING_SETTLEMENT);
    if (invalid.length > 0) {
      throw new BadRequestException(`存在非待结算佣金: ${invalid.map((c) => c.id).join(', ')}`);
    }

    const updated = await this.prisma.leaderCommission.updateMany({
      where: { id: { in: ids }, status: CommissionStatus.PENDING_SETTLEMENT },
      data: {
        status: CommissionStatus.SETTLED,
        settledAt: new Date(),
        remark: adminUserId != null ? `管理员 ${adminUserId} 手动结算` : '系统自动结算',
      },
    });

    return { settledCount: updated.count };
  }

  async autoSettleBeforeDate(date: Date) {
    const ids = await this.prisma.leaderCommission.findMany({
      where: {
        status: CommissionStatus.PENDING_SETTLEMENT,
        createdAt: { lt: date },
      },
      select: { id: true },
    });

    if (ids.length === 0) {
      return { settledCount: 0 };
    }

    return this.settle(ids.map((item) => item.id));
  }

  async findByLeader(leaderId: bigint, status?: CommissionStatus) {
    const where: Prisma.LeaderCommissionWhereInput = { leaderId };
    if (status) where.status = status;

    const items = await this.prisma.leaderCommission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.serialize(item));
  }

  async findByAuthUser(authUser: AuthUser, status?: CommissionStatus) {
    const leader = await this.ensureLeader(authUser);
    return this.findByLeader(leader.id, status);
  }

  async findAll(query: { leaderId?: bigint; status?: CommissionStatus; page?: number; pageSize?: number }) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: Prisma.LeaderCommissionWhereInput = {};
    if (query.leaderId) where.leaderId = query.leaderId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.leaderCommission.findMany({
        where,
        include: { leader: { select: { id: true, realName: true, mobile: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaderCommission.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      total,
      page,
      pageSize,
    };
  }

  serialize(commission: {
    id: bigint;
    leaderId: bigint;
    orderId: bigint | null;
    orderNo: string;
    orderAmount: Prisma.Decimal;
    commissionRate: Prisma.Decimal;
    commissionAmount: Prisma.Decimal;
    status: string;
    settledAt: Date | null;
    remark: string | null;
    createdAt: Date;
    updatedAt: Date;
    leader?: { id: bigint; realName: string; mobile: string } | null;
  }) {
    return {
      id: Number(commission.id),
      leaderId: Number(commission.leaderId),
      orderId: commission.orderId != null ? Number(commission.orderId) : null,
      orderNo: commission.orderNo,
      orderAmount: Number(commission.orderAmount),
      commissionRate: Number(commission.commissionRate),
      commissionAmount: Number(commission.commissionAmount),
      status: commission.status,
      settledAt: commission.settledAt?.toISOString() ?? null,
      remark: commission.remark,
      createdAt: commission.createdAt.toISOString(),
      updatedAt: commission.updatedAt.toISOString(),
      leader: commission.leader
        ? {
            id: Number(commission.leader.id),
            realName: commission.leader.realName,
            mobile: commission.leader.mobile,
          }
        : null,
    };
  }
}
