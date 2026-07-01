import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class MerchantAnalyticsService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async getMerchantWorkbench(authUser: AuthUser) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);

    const now = this.now();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);

    const [todayPayAgg, todayOrderCount, refundCount, pendingAccept, pendingShip, pendingRefund, lowStockCount, draftProductCount, draftActivityCount] = await Promise.all([
      this.prisma.order.aggregate({
        where: { merchantId: merchant.id, payStatus: PlatformDataService.PAY_STATUS.PAID, createdAt: { gte: todayStart }, deletedAt: null, isParent: false },
        _sum: { payAmount: true },
      }),
      this.prisma.order.count({
        where: { merchantId: merchant.id, payStatus: PlatformDataService.PAY_STATUS.PAID, createdAt: { gte: todayStart }, deletedAt: null, isParent: false },
      }),
      this.prisma.refundApply.count({
        where: { merchantId: merchant.id, createdAt: { gte: todayStart }, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { merchantId: merchant.id, orderStatus: PlatformDataService.ORDER_STATUS.PENDING, payStatus: PlatformDataService.PAY_STATUS.PAID, deletedAt: null, isParent: false },
      }),
      this.prisma.order.count({
        where: { merchantId: merchant.id, orderStatus: PlatformDataService.ORDER_STATUS.ACCEPTED, payStatus: PlatformDataService.PAY_STATUS.PAID, deliveryStatus: PlatformDataService.DELIVERY_STATUS.TO_SHIP, deletedAt: null, isParent: false },
      }),
      this.prisma.refundApply.count({
        where: { merchantId: merchant.id, status: { in: [1, 2] }, deletedAt: null },
      }),
      this.prisma.productSku.count({
        where: { product: { merchantId: merchant.id, deletedAt: null }, stock: { lte: 5 } },
      }),
      this.prisma.merchantProductDraft.count({
        where: { merchantId: merchant.id, deletedAt: null },
      }),
      this.prisma.activity.count({
        where: { status: 'DRAFT' },
      }),
    ]);

    const trendRaw = await this.prisma.$queryRawUnsafe<Array<{ date: string; pay_amount: number; order_count: bigint }>>(
      `SELECT to_char(d::date, 'MM-DD') as date, COALESCE(SUM(o.pay_amount), 0) as pay_amount, COUNT(o.id) as order_count
       FROM generate_series($1::date, $2::date, '1 day'::interval) d
       LEFT JOIN orders o ON o.merchant_id = $3 AND o.pay_status = 1 AND o.created_at::date = d::date AND o.deleted_at IS NULL
       GROUP BY d::date ORDER BY d::date`,
      sevenDaysAgo, todayStart, merchant.id,
    ).catch(() => []);

    const trend = trendRaw.map((t) => ({
      date: t.date,
      payAmount: this.toMoney(Number(t.pay_amount)),
      orderCount: this.toNumber(t.order_count),
      visitorCount: 0,
    }));

    return {
      shop: {
        merchantId: this.toNumber(merchant.id),
        storeName: merchant.storeName,
        storeLogo: merchant.storeLogo ?? '',
        status: merchant.status === 1 ? '营业中' : '休息中',
      },
      metrics: {
        payAmount: this.toMoney(todayPayAgg._sum.payAmount ?? 0),
        orderCount: todayOrderCount,
        visitorCount: 0,
        conversionRate: '0%',
        refundCount,
      },
      todos: {
        pendingAccept,
        pendingShip,
        pendingRefund,
        lowStock: lowStockCount,
        draftProducts: draftProductCount,
        draftActivities: draftActivityCount,
      },
      trend,
    };
  }

  async getMerchantStatisticsTrend(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const range = query.range === '30d' ? 30 : 7;
    const daysAgo = range - 1;
    const now = this.now();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(todayStart.getTime() - daysAgo * 86400000);

    const trendRaw = await this.prisma.$queryRawUnsafe<Array<{ date: string; pay_amount: number; order_count: bigint }>>(
      `SELECT to_char(d::date, 'MM-DD') as date, COALESCE(SUM(o.pay_amount), 0) as pay_amount, COUNT(o.id) as order_count
       FROM generate_series($1::date, $2::date, '1 day'::interval) d
       LEFT JOIN orders o ON o.merchant_id = $3 AND o.pay_status = 1 AND o.is_parent = false AND o.created_at::date = d::date AND o.deleted_at IS NULL
       GROUP BY d::date ORDER BY d::date`,
      startDate, todayStart, merchant.id,
    ).catch(() => []);

    return trendRaw.map((t) => ({
      date: t.date,
      payAmount: this.toMoney(Number(t.pay_amount)),
      orderCount: this.toNumber(t.order_count),
      visitorCount: 0,
    }));
  }

  async getMerchantStatisticsOverview(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const range = query.range === '30d' ? 30 : query.range === 'today' ? 1 : 7;
    const daysAgo = range - 1;
    const now = this.now();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(todayStart.getTime() - daysAgo * 86400000);

    const [payAgg, orderCount, refundCount, topProductsRaw] = await Promise.all([
      this.prisma.order.aggregate({
        where: { merchantId: merchant.id, payStatus: PlatformDataService.PAY_STATUS.PAID, createdAt: { gte: startDate }, deletedAt: null, isParent: false },
        _sum: { payAmount: true },
      }),
      this.prisma.order.count({
        where: { merchantId: merchant.id, payStatus: PlatformDataService.PAY_STATUS.PAID, createdAt: { gte: startDate }, deletedAt: null, isParent: false },
      }),
      this.prisma.refundApply.count({
        where: { merchantId: merchant.id, createdAt: { gte: startDate }, deletedAt: null },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { merchantId: merchant.id, payStatus: PlatformDataService.PAY_STATUS.PAID, createdAt: { gte: startDate }, deletedAt: null, isParent: false } },
        _count: { productId: true },
        _sum: { lineAmount: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 5,
      }),
    ]);

    const topProductIds = topProductsRaw.map((r) => r.productId);
    const products = topProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds }, deletedAt: null },
          select: { id: true, title: true, coverUrl: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id.toString(), p]));

    const trendRaw = await this.prisma.$queryRawUnsafe<Array<{ date: string; pay_amount: number; order_count: bigint }>>(
      `SELECT to_char(d::date, 'MM-DD') as date, COALESCE(SUM(o.pay_amount), 0) as pay_amount, COUNT(o.id) as order_count
       FROM generate_series($1::date, $2::date, '1 day'::interval) d
       LEFT JOIN orders o ON o.merchant_id = $3 AND o.pay_status = 1 AND o.created_at::date = d::date AND o.deleted_at IS NULL
       GROUP BY d::date ORDER BY d::date`,
      startDate, todayStart, merchant.id,
    ).catch(() => []);

    return {
      payAmount: this.toMoney(payAgg._sum.payAmount ?? 0),
      orderCount,
      visitorCount: 0,
      conversionRate: '0%',
      refundRate: orderCount > 0 ? `${((refundCount / orderCount) * 100).toFixed(1)}%` : '0%',
      trend: trendRaw.map((t) => ({
        date: t.date,
        payAmount: this.toMoney(Number(t.pay_amount)),
        orderCount: this.toNumber(t.order_count),
        visitorCount: 0,
      })),
      topProducts: topProductsRaw.map((r) => {
        const p = productMap.get(r.productId.toString());
        return {
          productId: this.toNumber(r.productId),
          title: p?.title ?? '',
          coverUrl: p?.coverUrl ?? '',
          orderCount: r._count.productId,
          payAmount: this.toMoney(r._sum.lineAmount ?? 0),
        };
      }),
    };
  }

  private now() {
    return new Date();
  }

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
}
