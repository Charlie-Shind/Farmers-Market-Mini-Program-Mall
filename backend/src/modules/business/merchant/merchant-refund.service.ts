import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class MerchantRefundService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async listMerchantRefunds(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const status = Number(query.status);

    const where: { merchantId: bigint; deletedAt: null; status?: number; OR?: unknown[] } = {
      merchantId: merchant.id,
      deletedAt: null,
      ...(Number.isFinite(status) && status > 0 ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { refundNo: { contains: keyword } },
              { order: { orderNo: { contains: keyword } } },
              { user: { nickname: { contains: keyword } } },
              { user: { mobile: { contains: keyword } } },
            ],
          }
        : {}),
    };

    const [total, refunds] = await Promise.all([
      this.prisma.refundApply.count({ where: where as any }),
      this.prisma.refundApply.findMany({
        where: where as any,
        include: {
          user: true,
          order: true,
          orderItem: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: refunds.map((r) => ({
        refundNo: r.refundNo,
        orderNo: r.order.orderNo,
        buyer: {
          userId: this.toNumber(r.user.id),
          nickname: r.user.nickname ?? '买家',
          avatarUrl: r.user.avatarUrl ?? '',
          mobile: r.user.mobile ?? '',
        },
        item: {
          productId: this.toNumber(r.orderItem.productId),
          skuId: this.toNumber(r.orderItem.skuId),
          title: r.orderItem.productTitle,
          skuName: r.orderItem.skuName,
          coverUrl: r.orderItem.productImage,
          quantity: r.orderItem.quantity,
          price: this.toMoney(r.orderItem.unitPrice),
        },
        applyType: r.applyType,
        applyReason: r.applyReason,
        applyImages: r.applyImages ?? [],
        refundAmount: this.toMoney(r.refundAmount),
        status: r.status,
        statusLabel: this.getRefundStatusLabel(r.status),
        merchantRemark: r.merchantRemark,
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt?.toISOString() ?? null,
      })),
    };
  }

  async getMerchantRefundDetail(authUser: AuthUser, refundNo: string) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);

    const r = await this.prisma.refundApply.findFirst({
      where: {
        merchantId: merchant.id,
        refundNo,
        deletedAt: null,
      },
      include: {
        user: true,
        order: true,
        orderItem: true,
      },
    });

    if (!r) {
      throw new NotFoundException('退款申请不存在');
    }

    return {
      refundNo: r.refundNo,
      orderNo: r.order.orderNo,
      buyer: {
        userId: this.toNumber(r.user.id),
        nickname: r.user.nickname ?? '买家',
        avatarUrl: r.user.avatarUrl ?? '',
        mobile: r.user.mobile ?? '',
      },
      item: {
        productId: this.toNumber(r.orderItem.productId),
        skuId: this.toNumber(r.orderItem.skuId),
        title: r.orderItem.productTitle,
        skuName: r.orderItem.skuName,
        coverUrl: r.orderItem.productImage,
        quantity: r.orderItem.quantity,
        price: this.toMoney(r.orderItem.unitPrice),
      },
      applyType: r.applyType,
      applyTypeLabel: r.applyType === 2 ? '退货退款' : '仅退款',
      applyReason: r.applyReason,
      applyImages: r.applyImages ?? [],
      refundAmount: this.toMoney(r.refundAmount),
      status: r.status,
      statusLabel: this.getRefundStatusLabel(r.status),
      merchantRemark: r.merchantRemark,
      createdAt: r.createdAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
      timeline: [
        { title: '买家提交退款', desc: r.createdAt.toISOString() },
        ...(r.processedAt ? [{ title: '商家已处理', desc: r.processedAt.toISOString() }] : []),
      ],
    };
  }

  async processRefund(authUser: AuthUser, refundNo: string, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const refund = await this.prisma.refundApply.findFirst({
      where: { refundNo, merchantId: merchant.id },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 1 && refund.status !== 2) {
      throw new BadRequestException('Refund cannot be processed');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: refund.orderId },
      select: { orderStatus: true },
    });
    if (!order || order.orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('订单已取消，不可处理退款');
    }

    const isApprove = String(body.action ?? 'approve') !== 'reject';
    const status = isApprove ? 3 : 4;

    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: refund.orderItemId },
      select: { skuId: true, quantity: true },
    });

    if (isApprove) {
      const wallet = await this.prisma.merchantWallet.findUnique({
        where: { merchantId: merchant.id },
      });
      if (!wallet || wallet.availableBalance.lt(refund.refundAmount)) {
        throw new BadRequestException('商户余额不足，无法退款');
      }
    }

    const remark = String(body.remark ?? body.merchantRemark ?? '').trim();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refundApply.updateMany({
        where: { id: refund.id, status: { in: [1, 2] } },
        data: {
          status,
          merchantRemark: remark || null,
          processedAt: this.now(),
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException('退款状态已变更，请刷新后重试');
      }

      await tx.order.updateMany({
        where: { id: refund.orderId },
        data: { refundStatus: status },
      });

      if (isApprove) {
        await tx.merchantWallet.update({
          where: { merchantId: merchant.id },
          data: {
            availableBalance: { decrement: refund.refundAmount },
          },
        });

        if (orderItem) {
          await tx.productSku.update({
            where: { id: orderItem.skuId },
            data: {
              stock: { increment: orderItem.quantity },
              lockedStock: { decrement: orderItem.quantity },
            },
          });
        }

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

    return {
      refundNo,
      status: isApprove ? 'APPROVED' : 'REJECTED',
      result: body.action ?? 'approve',
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

  private normalizePage(pageValue: string | number | null | undefined): number {
    const page = Number(pageValue ?? 1);
    if (!Number.isFinite(page) || page < 1) {
      return 1;
    }
    return Math.floor(page);
  }

  private normalizePageSize(pageSizeValue: string | number | null | undefined, defaultPageSize = 20): number {
    const pageSize = Number(pageSizeValue ?? defaultPageSize);
    if (!Number.isFinite(pageSize)) {
      return defaultPageSize;
    }
    return Math.min(100, Math.max(20, Math.floor(pageSize)));
  }

  private toNumber(value: bigint | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private toMoney(value: unknown): string {
    if (value == null) {
      return '0.00';
    }
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
  }

  private now() {
    return new Date();
  }
}
