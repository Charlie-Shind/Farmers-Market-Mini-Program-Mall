import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthUser } from '../../../common/types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminActivityService {
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

  private toIso(value: Date | null | undefined): string {
    return value ? value.toISOString().slice(0, 16).replace('T', ' ') : '';
  }

  async createActivity(body: Record<string, unknown>, authUser?: AuthUser) {
    const activityName = String(body.activityName ?? body.title ?? '新活动');
    const activityType = String(body.activityType ?? 'SECKILL').trim().toUpperCase() || 'SECKILL';
    const products = Array.isArray(body.products) ? body.products.filter((item) => item && typeof item === 'object') : [];
    const ruleJson = body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson) ? (body.ruleJson as Record<string, unknown>) : {};
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
      startAt: this.toIso(activity.startAt),
      endAt: this.toIso(activity.endAt),
      productCount: activity.productCount,
      products,
      ruleJson,
      input: body,
    };
  }

  async updateActivity(activityId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const oldActivity = await this.prisma.activity.findFirst({
      where: { id: activityId, deletedAt: null },
    });

    if (!oldActivity) {
      throw new NotFoundException('Activity not found');
    }

    const activityName = String(body.activityName ?? body.title ?? oldActivity.activityName);
    const activityType = String(body.activityType ?? oldActivity.activityType).trim().toUpperCase() || oldActivity.activityType;
    const products = Array.isArray(body.products) ? body.products.filter((item) => item && typeof item === 'object') : [];
    const ruleJson = body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson) ? (body.ruleJson as Record<string, unknown>) : {};
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
      const coupon = await this.prisma.coupon.findFirst({
        where: { name: oldActivity.activityName, deletedAt: null },
      });

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
              ...(coupon.ruleJson && typeof coupon.ruleJson === 'object' && !Array.isArray(coupon.ruleJson) ? (coupon.ruleJson as Record<string, unknown>) : {}),
              ...ruleJson,
              ...(products.length ? { products } : {}),
              activityId,
            } as Prisma.InputJsonValue,
            status: String(body.status ?? oldActivity.status) === 'DRAFT' ? 'DRAFT' : coupon.status,
          },
        });
      } else {
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
              activityId,
            } as Prisma.InputJsonValue,
            status: String(body.status ?? oldActivity.status) === 'DRAFT' ? 'DRAFT' : 'ENABLED',
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
      startAt: this.toIso(activity.startAt),
      endAt: this.toIso(activity.endAt),
      productCount: activity.productCount,
      products,
      ruleJson,
      input: body,
    };
  }

  async deleteActivity(activityId: number, authUser?: AuthUser) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, deletedAt: null },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    await this.prisma.activity.update({
      where: { id: activityId },
      data: { deletedAt: new Date() },
    });

    if (activity.activityType === 'CASHBACK') {
      const coupon = await this.prisma.coupon.findFirst({
        where: { name: activity.activityName, deletedAt: null },
      });
      if (coupon) {
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { deletedAt: new Date() },
        });
      }
    }

    return { success: true, activityId };
  }

  async getAdminActivityDetail(activityId: number) {
    const activity = await this.prisma.activity.findUnique({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');

    const activityRule = activity.ruleJson && typeof activity.ruleJson === 'object' && !Array.isArray(activity.ruleJson) ? (activity.ruleJson as Record<string, unknown>) : {};
    const activityProducts = Array.isArray(activity.productsJson) ? activity.productsJson : [];
    const coupon = activity.activityType === 'CASHBACK'
      ? await this.prisma.coupon.findFirst({ where: { name: activity.activityName, deletedAt: null } })
      : null;
    const couponRule = coupon?.ruleJson && typeof coupon.ruleJson === 'object' && !Array.isArray(coupon.ruleJson) ? (coupon.ruleJson as Record<string, unknown>) : {};

    return {
      activityId: this.toNumber(activity.id),
      id: this.toNumber(activity.id),
      title: activity.activityName,
      activityName: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: this.toIso(activity.startAt),
      endAt: this.toIso(activity.endAt),
      productCount: activity.productCount,
      products: activityProducts.length ? activityProducts : (Array.isArray(couponRule.products) ? couponRule.products : []),
      ruleJson: coupon
        ? {
            ...activityRule,
            ...couponRule,
            thresholdAmount: couponRule.thresholdAmount ?? this.toMoney(coupon.thresholdAmount),
            discountAmount: couponRule.discountAmount ?? this.toMoney(coupon.discountAmount),
            couponStock: couponRule.couponStock ?? coupon.stock,
            perUserLimit: couponRule.perUserLimit ?? coupon.perUserLimit,
            scope: coupon.scope,
          }
        : activity.ruleJson ?? null,
      thresholdAmount: coupon ? this.toMoney(coupon.thresholdAmount) : undefined,
      discountAmount: coupon ? this.toMoney(coupon.discountAmount) : undefined,
      stock: coupon?.stock,
      perUserLimit: coupon?.perUserLimit,
    };
  }

  listActivities() {
    return this.platformDataService.getActivities();
  }

  async publishAdminActivity(authUser: AuthUser, activityId: number) {
    const activity = await this.prisma.activity.findUnique({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (!activity.startAt || !activity.endAt) {
      throw new BadRequestException('活动开始时间和结束时间不能为空，请先编辑活动补充时间');
    }
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'PUBLISHED' } });
    return { success: true };
  }

  async pauseAdminActivity(authUser: AuthUser, activityId: number) {
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'PAUSED' } });
    return { success: true };
  }

  async finishAdminActivity(authUser: AuthUser, activityId: number) {
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'ENDED' } });
    return { success: true };
  }
}
