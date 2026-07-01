import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class RefundService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  private toNumber(value: bigint | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private toMoney(value: Prisma.Decimal | number | string | null | undefined): string {
    if (value == null) {
      return '0.00';
    }
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
  }

  async createRefundApply(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.platformDataService.ensureUser(authUser);
    const orderNo = String(body.orderNo ?? '').trim();
    const orderItemId = Number(body.orderItemId);

    if (!orderNo) {
      throw new BadRequestException('订单号不能为空');
    }
    if (!Number.isFinite(orderItemId) || orderItemId <= 0) {
      throw new BadRequestException('订单明细不能为空');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id, deletedAt: null },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.payStatus !== 1) {
      throw new BadRequestException('未支付订单不可申请退款');
    }
    if (order.refundStatus === 1 || order.refundStatus === 2) {
      throw new BadRequestException('订单已有售后申请');
    }

    const orderItem = order.items.find((item) => Number(item.id) === orderItemId);
    if (!orderItem) {
      throw new NotFoundException('订单商品不存在');
    }

    const applyType = Number(body.applyType ?? 1);
    const applyReason = String(body.applyReason ?? '').trim() || '申请退款';
    const applyImages = Array.isArray(body.applyImages) ? body.applyImages.filter((item) => typeof item === 'string') : [];
    const maxRefundAmount = Number(orderItem.lineAmount);
    const refundAmount = body.refundAmount != null ? Number(body.refundAmount) : maxRefundAmount;

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      throw new BadRequestException('退款金额不合法');
    }
    if (refundAmount > maxRefundAmount) {
      throw new BadRequestException('退款金额不能超过商品实付金额');
    }

    const refundNo = `RF${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}${randomUUID().replace(/-/g, '').slice(0, 6)}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.refundApply.create({
        data: {
          refundNo,
          orderId: order.id,
          orderItemId: orderItem.id,
          userId: user.id,
          merchantId: order.merchantId,
          applyType,
          applyReason,
          applyImages,
          refundAmount: new Prisma.Decimal(String(refundAmount)),
          status: 1,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { refundStatus: 1 },
      });
    });

    return {
      refundNo,
      orderNo,
      orderItemId,
      applyType,
      applyReason,
      refundAmount: this.toMoney(refundAmount),
      status: 1,
      statusLabel: 'PENDING_MERCHANT',
      applyImages,
    };
  }
}
