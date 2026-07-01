import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class PaymentService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  private toMoney(value: Prisma.Decimal | number | string | null | undefined): string {
    if (value == null) return '0.00';
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
  }

  async createWechatPayment(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.platformDataService.ensureUser(authUser);
    const orderNo = String(body.orderNo ?? '').trim();
    if (!orderNo) {
      throw new BadRequestException('订单号不能为空');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id, deletedAt: null },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.payStatus === 1) {
      return {
        orderNo,
        payNo: `PAY${orderNo}`,
        payStatus: 'PAID',
        amount: this.toMoney(order.payAmount),
      };
    }

    const payNo = `PAY${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}${randomUUID().replace(/-/g, '').slice(0, 6)}`;
    await this.prisma.paymentRecord.create({
      data: {
        payNo,
        orderNo: order.orderNo,
        orderId: order.id,
        userId: user.id,
        payChannel: 1,
        amount: order.payAmount,
        payStatus: 1,
        callbackData: { createdBy: 'PaymentService' } as Prisma.InputJsonValue,
      },
    });

    return {
      orderNo,
      payNo,
      payStatus: 'PENDING',
      amount: this.toMoney(order.payAmount),
    };
  }

  async getWechatPaymentStatus(authUser: AuthUser, orderNo: string) {
    const user = await this.platformDataService.ensureUser(authUser);
    const payment = await this.prisma.paymentRecord.findFirst({
      where: { orderNo, userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    return {
      orderNo,
      payNo: payment.payNo,
      payStatus: payment.payStatus === 1 ? 'PAID' : 'PENDING',
      amount: this.toMoney(payment.amount),
      paidAt: payment.paidAt?.toISOString() ?? null,
    };
  }

  async handleWechatCallback(body: Record<string, unknown>) {
    const orderNo = String(body.orderNo ?? body.out_trade_no ?? '').trim();
    const transactionNo = String(body.transaction_id ?? body.thirdTradeNo ?? '').trim();
    const amount = Number(body.amount ?? body.total_fee ?? body.transaction_amount ?? 0);

    if (!orderNo) {
      throw new BadRequestException('订单号不能为空');
    }

    const payment = await this.prisma.paymentRecord.findFirst({
      where: { orderNo },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    if (payment.payStatus === 2) {
      return { success: true, orderNo, payNo: payment.payNo, status: 'PAID' };
    }

    if (amount > 0 && Number(payment.amount) > 0 && Math.abs(Number(payment.amount) - amount) > 0.01) {
      throw new BadRequestException('支付金额不匹配');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentRecord.update({
        where: { id: payment.id },
        data: {
          payStatus: 2,
          thirdTradeNo: transactionNo || payment.thirdTradeNo,
          paidAt: new Date(),
          callbackData: body as Prisma.InputJsonValue,
        },
      });

      const paidAt = new Date();
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          payStatus: 1,
          orderStatus: 2,
          paidAt,
        },
      });

      if (payment.order.isParent) {
        await tx.order.updateMany({
          where: {
            parentOrderNo: payment.order.orderNo,
            deletedAt: null,
          },
          data: {
            payStatus: 1,
            paidAt,
          },
        });
      }
    });

    return { success: true, orderNo, payNo: payment.payNo, status: 'PAID' };
  }
}
