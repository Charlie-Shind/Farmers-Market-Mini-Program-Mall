import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformDataService: PlatformDataService,
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

  private now(): Date {
    return new Date();
  }

  async getAdminRefundDetail(refundNo: string) {
    const refund = await this.prisma.refundApply.findUnique({
      where: { refundNo },
      include: { user: true, merchant: true, order: true },
    });
    if (!refund) throw new NotFoundException('退款申请不存在');
    return {
      refundNo: refund.refundNo,
      orderNo: refund.order.orderNo,
      userName: refund.user.nickname ?? '',
      merchantName: refund.merchant.storeName,
      amount: this.toMoney(refund.refundAmount),
      applyType: refund.applyType,
      applyReason: refund.applyReason,
      applyImages: refund.applyImages ?? [],
      status: refund.status,
      statusLabel: this.getRefundStatusLabel(refund.status),
      merchantRemark: refund.merchantRemark,
      adminRemark: refund.adminRemark,
      createdAt: refund.createdAt.toISOString(),
      processedAt: refund.processedAt?.toISOString() ?? null,
    };
  }

  listRefunds(query: Record<string, string>) {
    return this.platformDataService.listAdminRefunds(query);
  }

  async arbitrateRefund(refundNo: string, body: Record<string, unknown>, authUser: AuthUser) {
    const refund = await this.prisma.refundApply.findUnique({
      where: { refundNo },
      include: { order: true, orderItem: true },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.status !== 1 && refund.status !== 2) {
      throw new BadRequestException('退款状态已变更，请刷新后重试');
    }

    const action = String(body.action ?? 'approve').trim().toLowerCase();
    const isApprove = action !== 'reject';
    const remark = String(body.remark ?? body.adminRemark ?? '').trim();
    const nextStatus = isApprove ? 3 : 4;

    if (isApprove) {
      const wallet = await this.prisma.merchantWallet.findUnique({
        where: { merchantId: refund.merchantId },
      });
      if (!wallet || wallet.availableBalance.lt(refund.refundAmount)) {
        throw new BadRequestException('商户余额不足，无法退款');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refundApply.updateMany({
        where: { id: refund.id, status: { in: [1, 2] } },
        data: {
          status: nextStatus,
          adminRemark: remark || null,
          processedAt: this.now(),
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException('退款状态已变更，请刷新后重试');
      }

      await tx.order.updateMany({
        where: { id: refund.orderId },
        data: { refundStatus: nextStatus },
      });

      if (isApprove) {
        await tx.merchantWallet.update({
          where: { merchantId: refund.merchantId },
          data: {
            availableBalance: { decrement: refund.refundAmount },
          },
        });

        await tx.productSku.update({
          where: { id: refund.orderItem.skuId },
          data: {
            stock: { increment: refund.orderItem.quantity },
            lockedStock: { decrement: refund.orderItem.quantity },
          },
        });

        await tx.pointLog.create({
          data: {
            userId: refund.userId,
            changeType: 'DEDUCT',
            points: -Math.max(Math.floor(Number(refund.refundAmount)), 0),
            sourceType: 'REFUND',
            sourceNo: refund.refundNo,
            remark: '退款扣回积分',
          },
        });
      }
    });

    try {
      await this.platformDataService.notifyUserRefundResult({
        userId: refund.userId,
        refundNo,
        orderNo: refund.order.orderNo,
        approved: isApprove,
        refundAmount: this.toMoney(refund.refundAmount),
        applyReason: refund.applyReason,
        remark,
      });
    } catch {
      // 通知失败不影响主流程
    }

    return {
      refundNo,
      status: isApprove ? 'APPROVED' : 'REJECTED',
      result: action || 'approve',
      remark: remark || 'ok',
    };
  }

  private getRefundStatusLabel(status: number): string {
    if (status === 3) {
      return 'APPROVED';
    }

    if (status === 4) {
      return 'REJECTED';
    }

    return 'PENDING_MERCHANT';
  }
}
