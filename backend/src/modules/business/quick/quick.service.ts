import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';
import { isPublicProductVisible } from '../../../common/utils/product-visibility';

@Injectable()
export class QuickService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  private toNumber(value: bigint | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private toMoney(value: Prisma.Decimal | number | string | null | undefined): string {
    if (value == null) return '0.00';
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
  }

  async getQuickFlashSaleActive() {
    const now = new Date();
    const window = await this.prisma.flashSaleWindow.findFirst({
      where: { status: 'ACTIVE', startAt: { lte: now }, endAt: { gte: now } },
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
    });

    if (!window) {
      return { active: false, window: null };
    }

    return {
      active: true,
      window: {
        id: this.toNumber(window.id),
        label: window.label,
        startAt: window.startAt.toISOString(),
        endAt: window.endAt.toISOString(),
        status: window.status,
      },
    };
  }

  async getQuickFlashSaleWindows() {
    const windows = await this.prisma.flashSaleWindow.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
    });

    return windows.map((window) => ({
      id: this.toNumber(window.id),
      label: window.label,
      startAt: window.startAt.toISOString(),
      endAt: window.endAt.toISOString(),
      status: window.status,
    }));
  }

  async getQuickFlashSaleItems(query: Record<string, string>) {
    const now = new Date();
    const windowId = query.windowId ? Number(query.windowId) : undefined;
    const take = Math.max(1, Math.min(50, Number(query.limit ?? 20) || 20));

    const where = windowId
      ? { windowId: BigInt(windowId) }
      : {
          window: {
            status: 'ACTIVE',
            startAt: { lte: now },
            endAt: { gte: now },
          },
        };

    const items = await this.prisma.flashSaleItem.findMany({
      where,
      include: {
        window: true,
        product: { include: { merchant: true } },
        sku: true,
      },
      orderBy: [{ id: 'asc' }],
      take,
    });

    return items.map((item) => ({
      id: this.toNumber(item.id),
      itemId: this.toNumber(item.id),
      windowId: this.toNumber(item.windowId),
      productId: this.toNumber(item.productId),
      skuId: this.toNumber(item.skuId),
      title: item.product.title,
      coverUrl: item.product.coverUrl ?? '',
      merchantName: item.product.merchant.storeName,
      flashPrice: this.toMoney(item.flashPrice),
      originPrice: this.toMoney(item.originPrice),
      stockLeft: item.stockLeft,
      totalStock: item.totalStock,
      windowLabel: item.window.label,
      status: item.window.status,
    }));
  }

  async claimFlashSale(authUser: AuthUser, body: { itemId: number; quantity?: number }) {
    const user = await this.platformDataService.ensureUser(authUser);
    const quantity = Math.max(1, Math.floor(body.quantity ?? 1));
    const itemId = Number(body.itemId);

    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: BigInt(itemId) },
    });
    if (!item) {
      throw new NotFoundException('秒杀商品不存在');
    }
    if (item.stockLeft < quantity) {
      throw new BadRequestException('库存不足');
    }

    const claim = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.flashSaleItem.updateMany({
        where: { id: item.id, stockLeft: { gte: quantity } },
        data: { stockLeft: { decrement: quantity } },
      });
      if (updated.count === 0) {
        throw new BadRequestException('库存不足');
      }

      return tx.flashSaleClaim.create({
        data: {
          itemId: item.id,
          userId: user.id,
          quantity,
          status: 'RESERVED',
        },
      });
    });

    return {
      claimId: this.toNumber(claim.id),
      itemId,
      quantity,
      status: claim.status,
    };
  }

  async getQuickGroupBuyNearby(query: { lat?: number; lng?: number; limit?: number; maxDistanceKm?: number; inviteCode?: string }) {
    const limit = Math.max(1, Math.min(50, Math.floor(query.limit ?? 20)));
    const maxDistanceKm = Math.max(1, Number(query.maxDistanceKm ?? 30));

    const groups = await this.prisma.groupBuy.findMany({
      where: { status: 'OPEN' },
      include: { product: true, sku: true, members: true, initiator: true },
      orderBy: [{ expireAt: 'asc' }],
      take: limit,
    });

    const filtered = groups.filter((group) => {
      if (query.inviteCode && group.inviteCode !== query.inviteCode) {
        return false;
      }
      if (query.lat == null || query.lng == null || group.latitude == null || group.longitude == null) {
        return true;
      }
      const distance = this.haversineKm(query.lat, query.lng, Number(group.latitude), Number(group.longitude));
      return distance <= maxDistanceKm;
    });

    return filtered.map((group) => ({
      id: this.toNumber(group.id),
      groupNo: group.groupNo,
      inviteCode: group.inviteCode,
      productId: this.toNumber(group.productId),
      skuId: this.toNumber(group.skuId),
      title: group.product.title,
      coverUrl: group.product.coverUrl ?? '',
      groupPrice: this.toMoney(group.groupPrice),
      originPrice: this.toMoney(group.originPrice),
      needed: group.needed,
      memberCount: group.members.length,
      status: group.status,
      roughArea: group.roughArea,
    }));
  }

  async getQuickGroupBuyProducts(query: Record<string, string>) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.max(1, Math.min(50, Number(query.pageSize ?? 20) || 20));
    const take = pageSize;
    const skip = (page - 1) * pageSize;
    const categoryId = query.categoryId ? Number(query.categoryId) : undefined;

    const where: Prisma.ProductWhereInput = {
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(categoryId ? { categoryId: BigInt(categoryId) } : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { merchant: true, skus: { orderBy: { id: 'asc' } } },
        orderBy: [{ isHot: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: products.map((product) => ({
        id: this.toNumber(product.id),
        title: product.title,
        coverUrl: product.coverUrl ?? '',
        groupBuyConfig: product.groupBuyConfig ?? null,
        minPrice: this.toMoney(product.skus[0]?.price ?? 0),
        merchantName: product.merchant.storeName,
      })),
    };
  }

  async joinGroupBuy(authUser: AuthUser, body: { productId: number; skuId?: number; groupId?: number; lat?: number; lng?: number }) {
    const user = await this.platformDataService.ensureUser(authUser);
    const productId = Number(body.productId);
    const skuId = body.skuId ? Number(body.skuId) : undefined;
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: { skus: true },
    });
    if (!product || !isPublicProductVisible(product)) {
      throw new NotFoundException('商品不存在');
    }

    const resolvedSkuId = skuId ?? this.toNumber(product.skus[0]?.id);
    const group = body.groupId
      ? await this.prisma.groupBuy.findUnique({ where: { id: BigInt(body.groupId) } })
      : await this.prisma.groupBuy.findFirst({
          where: { productId: product.id, skuId: BigInt(resolvedSkuId), status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
        });

    if (!group) {
      throw new NotFoundException('拼团不存在');
    }

    await this.prisma.groupBuyMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      create: { groupId: group.id, userId: user.id, isInitiator: false },
      update: {},
    });

    return {
      groupId: this.toNumber(group.id),
      groupNo: group.groupNo,
      joined: true,
      inviteCode: group.inviteCode,
    };
  }

  async getQuickGiftZoneItems(query: { page?: number; pageSize?: number; sortBy?: 'price' | 'sales'; filterKey?: string }) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.max(1, Math.min(50, Math.floor(query.pageSize ?? 20)));
    const where: Prisma.ProductWhereInput = {
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(query.filterKey ? { title: { contains: query.filterKey } } : {}),
      ...(query.sortBy === 'price' ? { isHot: false } : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { merchant: true, skus: { orderBy: { id: 'asc' } } },
        orderBy: query.sortBy === 'price' ? [{ id: 'asc' }] : [{ isHot: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: products.map((product) => ({
        id: this.toNumber(product.id),
        title: product.title,
        coverUrl: product.coverUrl ?? '',
        minPrice: this.toMoney(product.skus[0]?.price ?? 0),
        originPlace: product.originPlace ?? '',
      })),
    };
  }

  async getQuickOriginZoneItems(query: { page?: number; pageSize?: number; originPlace?: string; categoryId?: number }) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.max(1, Math.min(50, Math.floor(query.pageSize ?? 20)));

    const where: Prisma.ProductWhereInput = {
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(query.originPlace ? { originPlace: { contains: query.originPlace } } : {}),
      ...(query.categoryId ? { categoryId: BigInt(query.categoryId) } : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { merchant: true, skus: { orderBy: { id: 'asc' } } },
        orderBy: [{ isHot: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: products.map((product) => ({
        id: this.toNumber(product.id),
        title: product.title,
        coverUrl: product.coverUrl ?? '',
        minPrice: this.toMoney(product.skus[0]?.price ?? 0),
        originPlace: product.originPlace ?? '',
      })),
    };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
