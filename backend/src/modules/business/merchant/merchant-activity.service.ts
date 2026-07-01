import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class MerchantActivityService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async listActivities(authUser: AuthUser, query: Record<string, string> = {}) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const activities = await this.prisma.activity.findMany({
      where: { deletedAt: null },
      orderBy: [{ id: 'desc' }],
    });

    return Promise.all(
      this.slicePage(activities, page, pageSize).map(async (activity) => {
        let couponInfo = null;
        if (activity.activityType === 'CASHBACK') {
          const coupon = await this.prisma.coupon.findFirst({
            where: { name: activity.activityName, deletedAt: null },
          });
          if (coupon) {
            couponInfo = {
              thresholdAmount: this.toMoney(coupon.thresholdAmount),
              discountAmount: this.toMoney(coupon.discountAmount),
              stock: coupon.stock,
            };
          }
        }

        return {
          id: this.toNumber(activity.id),
          title: activity.activityName,
          type: activity.activityType,
          status: activity.status,
          desc: `${activity.activityType} · 商品数 ${activity.productCount}`,
          startAt: activity.startAt ? activity.startAt.toISOString().slice(0, 16).replace('T', ' ') : '',
          endAt: activity.endAt ? activity.endAt.toISOString().slice(0, 16).replace('T', ' ') : '',
          productCount: activity.productCount,
          coupon: couponInfo,
        };
      }),
    );
  }

  async createActivity(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const activityName = String(body.activityName ?? body.title ?? '新活动');
    const activityType = String(body.activityType ?? 'SECKILL').trim().toUpperCase() || 'SECKILL';
    const products = this.readObjectArray(body.products);
    const ruleJson = this.asObject(body.ruleJson);
    const productCount = body.productCount != null ? Number(body.productCount) : products.length;

    const activity = await this.prisma.activity.create({
      data: {
        activityName,
        activityType,
        status: String(body.status ?? 'DRAFT'),
        startAt: body.startAt ? new Date(String(body.startAt)) : null,
        endAt: body.endAt ? new Date(String(body.endAt)) : null,
        productCount,
        ruleJson: ruleJson as Prisma.InputJsonValue,
        productsJson: products as Prisma.InputJsonValue,
      },
    });

    if (activity.activityType === 'CASHBACK') {
      await this.prisma.coupon.create({
        data: {
          name: activity.activityName,
          type: 'CASHBACK',
          thresholdAmount: new Prisma.Decimal(String(ruleJson.thresholdAmount ?? body.thresholdAmount ?? '100')),
          discountAmount: new Prisma.Decimal(String(ruleJson.discountAmount ?? body.discountAmount ?? '10')),
          stock: Number(ruleJson.couponStock ?? body.stock ?? 100),
          issuedStock: 0,
          validStartAt: body.startAt ? new Date(String(body.startAt)) : null,
          validEndAt: body.endAt ? new Date(String(body.endAt)) : null,
          scope: String(body.scope ?? ruleJson.scope ?? 'ALL').trim().toUpperCase() || 'ALL',
          perUserLimit: Math.max(Number(ruleJson.perUserLimit ?? body.perUserLimit ?? 1) || 1, 1),
          ruleJson: {
            ...ruleJson,
            products,
            activityId: this.toNumber(activity.id),
          } as Prisma.InputJsonValue,
          status: String(body.status ?? 'DRAFT') === 'DRAFT' ? 'DRAFT' : 'ENABLED',
        },
      });
    }

    return {
      activityId: this.toNumber(activity.id),
      id: this.toNumber(activity.id),
      activityName: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: activity.startAt ? activity.startAt.toISOString().slice(0, 16).replace('T', ' ') : '',
      endAt: activity.endAt ? activity.endAt.toISOString().slice(0, 16).replace('T', ' ') : '',
      productCount: activity.productCount,
      products,
      ruleJson,
      input: body,
    };
  }

  async updateActivity(activityId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const oldActivity = await this.prisma.activity.findFirst({ where: { id: activityId, deletedAt: null } });
    if (!oldActivity) {
      throw new NotFoundException('Activity not found');
    }

    const activityName = String(body.activityName ?? body.title ?? oldActivity.activityName);
    const activityType = String(body.activityType ?? oldActivity.activityType).trim().toUpperCase() || oldActivity.activityType;
    const products = this.readObjectArray(body.products);
    const ruleJson = this.asObject(body.ruleJson);
    const productCount = body.productCount != null ? Number(body.productCount) : (products.length || oldActivity.productCount);

    const activity = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        activityName,
        activityType,
        status: String(body.status ?? oldActivity.status),
        startAt: body.startAt ? new Date(String(body.startAt)) : oldActivity.startAt,
        endAt: body.endAt ? new Date(String(body.endAt)) : oldActivity.endAt,
        productCount,
        ...(body.ruleJson !== undefined ? { ruleJson: ruleJson as Prisma.InputJsonValue } : {}),
        ...(body.products !== undefined ? { productsJson: products as Prisma.InputJsonValue } : {}),
      },
    });

    if (activity.activityType === 'CASHBACK') {
      const coupon = await this.prisma.coupon.findFirst({ where: { name: oldActivity.activityName, deletedAt: null } });
      if (coupon) {
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: {
            name: activity.activityName,
            thresholdAmount: new Prisma.Decimal(String(ruleJson.thresholdAmount ?? body.thresholdAmount ?? '100')),
            discountAmount: new Prisma.Decimal(String(ruleJson.discountAmount ?? body.discountAmount ?? '10')),
            stock: Number(ruleJson.couponStock ?? body.stock ?? 100),
            validStartAt: body.startAt ? new Date(String(body.startAt)) : coupon.validStartAt,
            validEndAt: body.endAt ? new Date(String(body.endAt)) : coupon.validEndAt,
            scope: String(body.scope ?? ruleJson.scope ?? coupon.scope ?? 'ALL').trim().toUpperCase() || 'ALL',
            perUserLimit: Math.max(Number(ruleJson.perUserLimit ?? body.perUserLimit ?? coupon.perUserLimit ?? 1) || 1, 1),
            ruleJson: {
              ...(coupon.ruleJson && typeof coupon.ruleJson === 'object' && !Array.isArray(coupon.ruleJson)
                ? (coupon.ruleJson as Record<string, unknown>)
                : {}),
              ...ruleJson,
              ...(products.length ? { products } : {}),
              activityId,
            } as Prisma.InputJsonValue,
            status: String(body.status ?? oldActivity.status) === 'DRAFT' ? 'DRAFT' : coupon.status,
          },
        });
      }
    }

    return {
      activityId: this.toNumber(activity.id),
      id: this.toNumber(activity.id),
      activityName: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: activity.startAt ? activity.startAt.toISOString().slice(0, 16).replace('T', ' ') : '',
      endAt: activity.endAt ? activity.endAt.toISOString().slice(0, 16).replace('T', ' ') : '',
      productCount: activity.productCount,
      products,
      ruleJson,
      input: body,
    };
  }

  async deleteActivity(activityId: number, authUser?: AuthUser) {
    await this.withSeed();
    const activity = await this.prisma.activity.findFirst({ where: { id: activityId, deletedAt: null } });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    await this.prisma.activity.update({
      where: { id: activityId },
      data: { deletedAt: this.now() },
    });

    if (activity.activityType === 'CASHBACK') {
      const coupon = await this.prisma.coupon.findFirst({ where: { name: activity.activityName, deletedAt: null } });
      if (coupon) {
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { deletedAt: this.now() },
        });
      }
    }

    return { success: true, activityId };
  }

  async getActivityDetail(authUser: AuthUser, activityId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const activity = await this.prisma.activity.findFirst({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');
    const ruleJson = this.asObject(activity.ruleJson);
    const products = Array.isArray(activity.productsJson) ? activity.productsJson : [];
    return {
      activityId: this.toNumber(activity.id),
      title: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: activity.startAt?.toISOString() ?? '',
      endAt: activity.endAt?.toISOString() ?? '',
      productCount: activity.productCount,
      products,
      ruleJson,
    };
  }

  async publishActivity(authUser: AuthUser, activityId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'PUBLISHED' } });
    return { success: true };
  }

  async pauseActivity(authUser: AuthUser, activityId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'PAUSED' } });
    return { success: true };
  }

  async finishActivity(authUser: AuthUser, activityId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'ENDED' } });
    return { success: true };
  }

  async copyActivity(authUser: AuthUser, activityId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const activity = await this.prisma.activity.findUnique({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');
    const copied = await this.prisma.activity.create({
      data: {
        activityName: `${activity.activityName} (副本)`,
        activityType: activity.activityType,
        status: 'DRAFT',
        startAt: activity.startAt,
        endAt: activity.endAt,
        productCount: activity.productCount,
        ...(activity.ruleJson == null ? {} : { ruleJson: activity.ruleJson as Prisma.InputJsonValue }),
        ...(activity.productsJson == null ? {} : { productsJson: activity.productsJson as Prisma.InputJsonValue }),
      },
    });
    return { activityId: this.toNumber(copied.id), success: true };
  }

  async getActivityStatistics(authUser: AuthUser, activityId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    return {
      activityId,
      viewCount: 0,
      orderCount: 0,
      buyerCount: 0,
      payAmount: '0.00',
      conversionRate: '0%',
      remainStock: 0,
      products: [] as any[],
      trend: [] as any[],
    };
  }

  async getActivityProductCandidates(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();

    const where: Prisma.ProductWhereInput = {
      merchantId: merchant.id,
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(keyword ? { title: { contains: keyword } } : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { skus: { orderBy: { id: 'asc' } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: products.map((p) => ({
        productId: this.toNumber(p.id),
        title: p.title,
        coverUrl: p.coverUrl ?? '',
        categoryName: '',
        totalStock: p.skus.reduce((s, sku) => s + sku.stock, 0),
        minPrice: p.skus[0] ? this.toMoney(p.skus[0].price) : '0.00',
        maxPrice: p.skus.at(-1) ? this.toMoney(p.skus.at(-1)!.price) : '0.00',
        skus: p.skus.map((s) => ({ skuId: this.toNumber(s.id), skuName: s.skuName, price: this.toMoney(s.price), stock: s.stock })),
      })),
    };
  }

  async listActivityDrafts(authUser: AuthUser, query: Record<string, string>) {
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const activities = await this.prisma.activity.findMany({ where: { status: 'DRAFT' }, orderBy: { updatedAt: 'desc' } });
    return {
      page,
      pageSize,
      total: activities.length,
      items: activities.map((a) => ({ id: this.toNumber(a.id), draftNo: `AD-${a.id}`, title: a.activityName, activityType: a.activityType, missingFields: [] as string[], updatedAt: a.updatedAt.toISOString() })),
    };
  }

  async createActivityDraft(authUser: AuthUser, body: Record<string, unknown>) {
    const products = this.readObjectArray(body.products);
    const ruleJson = this.asObject(body.ruleJson);
    const activity = await this.prisma.activity.create({
      data: {
        activityName: String(body.title ?? body.activityName ?? ''),
        activityType: String(body.activityType ?? 'SECKILL'),
        status: 'DRAFT',
        startAt: body.startAt ? new Date(String(body.startAt)) : null,
        endAt: body.endAt ? new Date(String(body.endAt)) : null,
        productCount: Number(body.productCount ?? products.length),
        ruleJson: ruleJson as Prisma.InputJsonValue,
        productsJson: products as Prisma.InputJsonValue,
      },
    });
    return { draftNo: `AD-${activity.id}`, id: this.toNumber(activity.id), success: true };
  }

  async publishActivityDraft(authUser: AuthUser, draftId: string) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const id = BigInt(Number(draftId));
    await this.prisma.activity.update({ where: { id }, data: { status: 'PUBLISHED' } });
    return { success: true };
  }

  async deleteActivityDraft(authUser: AuthUser, draftId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.activity.delete({ where: { id: BigInt(draftId) } }).catch(() => {});
    return { success: true };
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

  private slicePage<T>(items: T[], page: number, pageSize: number) {
    return items.slice((page - 1) * pageSize, page * pageSize);
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

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private readObjectArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
  }

  private now() {
    return new Date();
  }

  private async withSeed() {
    return;
  }
}
