import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class MerchantOrderService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async listMerchantOrders(authUser: AuthUser, query: Record<string, string> = {}) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const where = { merchantId: merchant.id, isParent: false };
    const total = await this.prisma.order.count({ where });
    const orders = await this.prisma.order.findMany({
      where,
      include: { items: true, user: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      page,
      pageSize,
      total,
      items: orders.map((order) => ({
        orderNo: order.orderNo,
        userName: order.user.nickname ?? order.user.mobile ?? '用户',
        userAvatar: order.user.avatarUrl ?? '',
        userMobile: order.user.mobile ?? '',
        orderStatus: order.orderStatus,
        status: this.getMerchantOrderStatusLabel(order.orderStatus, order.deliveryStatus, order.refundStatus),
        payStatus: order.payStatus,
        deliveryStatus: order.deliveryStatus,
        refundStatus: order.refundStatus,
        totalAmount: this.toMoney(order.goodsAmount),
        payAmount: this.toMoney(order.payAmount),
        createdAt: this.toIso(order.createdAt),
        items: order.items.map((item) => ({
          orderItemId: this.toNumber(item.id),
          productId: this.toNumber(item.productId),
          skuId: this.toNumber(item.skuId),
          title: item.productTitle,
          skuName: item.skuName,
          price: this.toMoney(item.unitPrice),
          quantity: item.quantity,
          subtotal: this.toMoney(item.lineAmount),
          coverUrl: this.resolvePublicUrl(item.productImage) ?? '',
        })),
        itemPreview: order.items[0]
          ? [{
              title: order.items[0].productTitle,
              coverUrl: this.resolvePublicUrl(order.items[0].productImage) ?? '',
              quantity: order.items[0].quantity,
            }]
          : [],
        canAccept: order.orderStatus === PlatformDataService.ORDER_STATUS.PENDING && order.payStatus === PlatformDataService.PAY_STATUS.PAID,
        canShip: order.orderStatus === PlatformDataService.ORDER_STATUS.ACCEPTED && order.payStatus === PlatformDataService.PAY_STATUS.PAID && order.deliveryStatus === PlatformDataService.DELIVERY_STATUS.TO_SHIP,
      })),
    };
  }

  async getMerchantOrderDetail(authUser: AuthUser, orderNo: string) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, merchantId: merchant.id, isParent: false },
      include: {
        user: true,
        items: true,
        deliveries: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const refund = await this.prisma.refundApply.findFirst({
      where: { orderId: order.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const addr = order.addressSnapshot as Record<string, unknown> | null;
    return {
      orderNo: order.orderNo,
      userName: order.user.nickname ?? order.user.mobile ?? '用户',
      userMobile: order.user.mobile ?? '',
      userAvatar: order.user.avatarUrl ?? '',
      orderStatus: order.orderStatus,
      refundStatus: order.refundStatus,
      status: this.getMerchantOrderStatusLabel(order.orderStatus, order.deliveryStatus, order.refundStatus),
      payStatus: order.payStatus,
      deliveryStatus: order.deliveryStatus,
      totalAmount: this.toMoney(order.goodsAmount),
      freightAmount: this.toMoney(order.freightAmount),
      discountAmount: this.toMoney(order.discountAmount),
      payAmount: this.toMoney(order.payAmount),
      addressSnapshot: addr ? {
        ...addr,
        name: String(addr.receiverName ?? addr.name ?? order.user.nickname ?? '买家'),
        mobile: String(addr.receiverMobile ?? addr.mobile ?? order.user.mobile ?? ''),
        receiverName: String(addr.receiverName ?? addr.name ?? order.user.nickname ?? '买家'),
        receiverMobile: String(addr.receiverMobile ?? addr.mobile ?? order.user.mobile ?? ''),
        detail: String(addr.detailAddress ?? addr.detail ?? ''),
        detailAddress: String(addr.detailAddress ?? addr.detail ?? ''),
      } : null,
      remark: order.remark,
      cancelReason: order.cancelReason,
      createdAt: this.toIso(order.createdAt),
      paidAt: this.toIso(order.paidAt),
      completedAt: this.toIso(order.completedAt),
      items: order.items.map((item) => ({
        orderItemId: this.toNumber(item.id),
        productId: this.toNumber(item.productId),
        skuId: this.toNumber(item.skuId),
        title: item.productTitle,
        skuName: item.skuName,
        price: this.toMoney(item.unitPrice),
        quantity: item.quantity,
        subtotal: this.toMoney(item.lineAmount),
        coverUrl: this.resolvePublicUrl(item.productImage) ?? '',
      })),
      logisticsCompany: order.deliveries[0]?.logisticsCompany ?? '',
      trackingNo: order.deliveries[0]?.trackingNo ?? '',
      refund: refund ? {
        refundNo: refund.refundNo,
        applyType: refund.applyType,
        applyReason: refund.applyReason,
        applyImages: refund.applyImages,
        refundAmount: this.toMoney(refund.refundAmount),
        status: refund.status,
        merchantRemark: refund.merchantRemark,
        processedAt: this.toIso(refund.processedAt),
        createdAt: this.toIso(refund.createdAt),
      } : null,
    };
  }

  async acceptOrder(authUser: AuthUser, orderNo: string) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, merchantId: merchant.id, isParent: false },
      select: { id: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      !(
        order.orderStatus === PlatformDataService.ORDER_STATUS.PENDING &&
        order.payStatus === PlatformDataService.PAY_STATUS.PAID &&
        order.refundStatus === PlatformDataService.REFUND_STATUS.NONE
      )
    ) {
      throw new BadRequestException('仅已支付的待接单订单可接单');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { orderStatus: 2, deliveryStatus: 1 },
    });

    return {
      orderNo,
      status: 'TO_SHIP',
    };
  }

  async shipOrder(authUser: AuthUser, orderNo: string, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, merchantId: merchant.id, isParent: false },
      select: { id: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      !(
        order.orderStatus === PlatformDataService.ORDER_STATUS.ACCEPTED &&
        order.payStatus === PlatformDataService.PAY_STATUS.PAID &&
        order.deliveryStatus === PlatformDataService.DELIVERY_STATUS.TO_SHIP &&
        order.refundStatus === PlatformDataService.REFUND_STATUS.NONE
      )
    ) {
      throw new BadRequestException('仅已接单待发货的订单可发货');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: 2, orderStatus: 2 },
    });

    const trackingNo = typeof body.trackingNo === 'string' ? body.trackingNo : `DL${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
    const logisticsCompany = typeof body.logisticsCompany === 'string' ? body.logisticsCompany : '默认物流';
    const existingDelivery = await this.prisma.deliveryRecord.findFirst({ where: { orderId: order.id } });
    if (existingDelivery) {
      await this.prisma.deliveryRecord.update({
        where: { id: existingDelivery.id },
        data: {
          logisticsCompany,
          trackingNo,
          deliveryStatus: 2,
          shippedAt: this.now(),
        },
      });
    } else {
      await this.prisma.deliveryRecord.create({
        data: {
          orderId: order.id,
          merchantId: merchant.id,
          logisticsCompany,
          trackingNo,
          deliveryStatus: 2,
          shippedAt: this.now(),
        },
      });
    }

    return {
      orderNo,
      deliveryNo: trackingNo,
      input: body,
    };
  }

  private normalizePage(value: string | undefined) {
    const page = Number(value ?? 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private normalizePageSize(value: string | undefined) {
    const pageSize = Number(value ?? 10);
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
      return 10;
    }
    return Math.min(Math.max(Math.floor(pageSize), 1), 100);
  }

  private toNumber(value: bigint | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private toMoney(value: unknown): string {
    if (value == null) {
      return '0.00';
    }
    const normalized = Number(value as string | number);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
  }

  private toIso(value: Date | null | undefined): string {
    return value ? value.toISOString() : '';
  }

  private resolvePublicUrl(url: string | null | undefined): string | null {
    return url ?? null;
  }

  private getMerchantOrderStatusLabel(orderStatus: number, deliveryStatus: number, refundStatus?: number): string {
    if (refundStatus && refundStatus > 0) {
      return '退款中';
    }
    if (deliveryStatus === PlatformDataService.DELIVERY_STATUS.SHIPPED) {
      return '已发货';
    }
    if (orderStatus === PlatformDataService.ORDER_STATUS.ACCEPTED) {
      return '待发货';
    }
    if (orderStatus === PlatformDataService.ORDER_STATUS.PENDING) {
      return '待接单';
    }
    if (orderStatus === PlatformDataService.ORDER_STATUS.COMPLETED) {
      return '已完成';
    }
    if (orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      return '已取消';
    }
    return '待确认';
  }

  private now() {
    return new Date();
  }
}
