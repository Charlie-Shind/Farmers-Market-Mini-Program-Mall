import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

type ProductServiceTagView = {
  key: string;
  title: string;
  desc: string;
  icon: string;
};

@Injectable()
export class MerchantProductService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async createMerchantProduct(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const categoryId = body.categoryId ? Number(body.categoryId) : this.toNumber(categories[0]?.id ?? 0);
    const imageUrls = this.readStringArray(body.images).length ? this.readStringArray(body.images) : this.readStringArray(body.imageUrls);
    const videoItems = this.readObjectArray(body.videos);
    const skuItems = this.readObjectArray(body.skus);
    const serviceTags = this.normalizeProductServiceTags(body.serviceTags, Number(body.deliveryType ?? 1));
    const traceInfo = body.traceInfo ?? body.trace;
    const defaultPrice = String(body.price ?? '0.00');

    const created = await this.prisma.product.create({
      data: {
        merchantId: merchant.id,
        categoryId: BigInt(categoryId),
        title: String(body.title ?? '新商品'),
        subtitle: typeof body.subtitle === 'string' ? body.subtitle : null,
        coverUrl: typeof body.coverUrl === 'string' ? body.coverUrl : null,
        detailDesc: typeof body.detailDesc === 'string' ? body.detailDesc : null,
        serviceTags: serviceTags as Prisma.InputJsonValue,
        traceInfo: typeof traceInfo === 'string' ? traceInfo : null,
        originPlace: typeof body.originPlace === 'string' ? body.originPlace : null,
        deliveryType: Number(body.deliveryType ?? 1),
        status: 0,
        auditStatus: 1,
        isPreSale: Boolean(body.isPreSale ?? false),
        isHot: Boolean(body.isHot ?? false),
        brand: typeof body.brand === 'string' ? body.brand : null,
        supplierName: typeof body.supplierName === 'string' ? body.supplierName : null,
        ingredients: typeof body.ingredients === 'string' ? body.ingredients : null,
        shelfLife: typeof body.shelfLife === 'string' ? body.shelfLife : null,
        productionDate: typeof body.productionDate === 'string' ? body.productionDate : null,
        material: typeof body.material === 'string' ? body.material : null,
        dimensions: typeof body.dimensions === 'string' ? body.dimensions : null,
        leadTime: typeof body.leadTime === 'string' ? body.leadTime : null,
        shippingRestrictedRegions: typeof body.shippingRestrictedRegions === 'string' ? body.shippingRestrictedRegions : null,
        afterSalesCommitment: typeof body.afterSalesCommitment === 'string' ? body.afterSalesCommitment : null,
        logisticsCompany: typeof body.logisticsCompany === 'string' ? body.logisticsCompany : null,
        productNature: typeof body.productNature === 'string' ? body.productNature : null,
        liveCities: typeof body.liveCities === 'string' ? body.liveCities : null,
        sessionAttribute: typeof body.sessionAttribute === 'string' ? body.sessionAttribute : null,
        liveMechanism: typeof body.liveMechanism === 'string' ? body.liveMechanism : null,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      if (skuItems.length > 0) {
        await tx.productSku.createMany({
          data: skuItems.map((sku, index) => ({
            productId: created.id,
            skuName: String(sku.skuName ?? sku.name ?? `规格${index + 1}`),
            skuCode: String(sku.skuCode ?? `SKU${created.id.toString()}${index + 1}`),
            imageUrl: typeof sku.imageUrl === 'string' ? sku.imageUrl : typeof sku.skuImageUrl === 'string' ? sku.skuImageUrl : null,
            ...(sku.specJson !== undefined ? { specJson: sku.specJson as Prisma.InputJsonValue } : sku.spec !== undefined ? { specJson: sku.spec as Prisma.InputJsonValue } : {}),
            price: new Prisma.Decimal(String(sku.price ?? defaultPrice)),
            originalPrice: new Prisma.Decimal(String(sku.originalPrice ?? sku.price ?? defaultPrice)),
            offlinePrice: sku.offlinePrice ? new Prisma.Decimal(String(sku.offlinePrice)) : null,
            stock: Number(sku.stock ?? 0),
            lockedStock: Number(sku.lockedStock ?? 0),
            safetyStock: sku.safetyStock ? Number(sku.safetyStock) : null,
            status: Number(sku.status ?? 1),
          })),
        });
      } else {
        await tx.productSku.create({
          data: {
            productId: created.id,
            skuName: String(body.skuName ?? '默认规格'),
            skuCode: String(body.skuCode ?? `SKU${created.id.toString()}1`),
            imageUrl: typeof body.skuImageUrl === 'string' ? body.skuImageUrl : null,
            ...(typeof body.specJson !== 'undefined' ? { specJson: body.specJson as Prisma.InputJsonValue } : {}),
            price: new Prisma.Decimal(defaultPrice),
            originalPrice: new Prisma.Decimal(String(body.originalPrice ?? defaultPrice)),
            offlinePrice: body.offlinePrice ? new Prisma.Decimal(String(body.offlinePrice)) : null,
            stock: Number(body.stock ?? 0),
            lockedStock: Number(body.lockedStock ?? 0),
            safetyStock: body.safetyStock ? Number(body.safetyStock) : null,
            status: 1,
          },
        });
      }

      await tx.productImage.deleteMany({ where: { productId: created.id } });
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((imageUrl, index) => ({ productId: created.id, imageUrl, sortOrder: index + 1 })),
        });
      }

      await tx.productVideo.deleteMany({ where: { productId: created.id } });
      if (videoItems.length > 0) {
        await tx.productVideo.createMany({
          data: videoItems.map((video, index) => ({
            productId: created.id,
            videoUrl: String(video.videoUrl ?? ''),
            coverUrl: typeof video.coverUrl === 'string' ? video.coverUrl : null,
            sortOrder: index + 1,
          })),
        });
      }

      await tx.productTrace.deleteMany({ where: { productId: created.id } });
      if (traceInfo) {
        const traceCode = typeof traceInfo === 'object' && traceInfo !== null && 'traceCode' in traceInfo ? String(traceInfo.traceCode ?? `TRACE${created.id.toString()}`) : `TRACE${created.id.toString()}`;
        const traceDesc =
          typeof traceInfo === 'object' && traceInfo !== null && 'traceDesc' in traceInfo
            ? String(traceInfo.traceDesc ?? '')
            : typeof traceInfo === 'string'
              ? traceInfo
              : '';
        await tx.productTrace.create({
          data: {
            productId: created.id,
            traceCode,
            traceDesc,
            traceJson: traceInfo as Prisma.InputJsonValue,
          },
        });
      }
    });

    return {
      productId: this.toNumber(created.id),
      status: 'DRAFT',
      input: body,
    };
  }

  async listMerchantProducts(authUser: AuthUser, query: Record<string, string> = {}) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const where = { merchantId: merchant.id, deletedAt: null };
    const total = await this.prisma.product.count({ where });
    const products = await this.prisma.product.findMany({
      where,
      include: { skus: true, category: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      page,
      pageSize,
      total,
      items: products.map((product) => {
        const sku = product.skus[0];
        return {
          productId: this.toNumber(product.id),
          skuId: sku ? this.toNumber(sku.id) : 0,
          title: product.title,
          subtitle: product.subtitle ?? '',
          categoryName: product.category?.name ?? '',
          status: product.status === 1 ? '上架中' : product.status === 0 ? '已下架' : '待审核',
          auditStatus: product.auditStatus === 1 ? '待审核' : product.auditStatus === 2 ? '已通过' : '已驳回',
          price: sku ? `¥${this.toMoney(sku.price)}` : '¥0.00',
          stock: sku ? `库存 ${sku.stock}` : '库存 0',
          stockValue: sku ? sku.stock : 0,
          coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
          updatedAt: product.updatedAt.toISOString().slice(0, 16).replace('T', ' '),
        };
      }),
    };
  }

  async getMerchantProductDetail(authUser: AuthUser, productId: number) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const product = await this.prisma.product.findFirst({
      where: { id: BigInt(productId), merchantId: merchant.id, deletedAt: null },
      include: {
        category: true,
        skus: { orderBy: { price: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        videos: { orderBy: { sortOrder: 'asc' } },
        traces: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sku = product.skus[0];
    const trace = product.traces[0];

    return {
      productId: this.toNumber(product.id),
      title: product.title,
      subtitle: product.subtitle ?? '',
      coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
      detailDesc: product.detailDesc ?? '',
      originPlace: this.normalizeOriginPlace(product.originPlace),
      categoryId: product.categoryId ? this.toNumber(product.categoryId) : 0,
      categoryName: product.category?.name ?? '',
      price: sku ? this.toMoney(sku.price) : '0.00',
      originalPrice: sku ? this.toMoney(sku.originalPrice) : '0.00',
      offlinePrice: sku?.offlinePrice ? this.toMoney(sku.offlinePrice) : null,
      stock: sku ? sku.stock : 0,
      safetyStock: sku?.safetyStock ?? 0,
      skuName: sku ? sku.skuName : '默认规格',
      skuImageUrl: this.resolvePublicUrl(sku?.imageUrl) ?? '',
      specJson: (sku?.specJson ?? {}) as Record<string, string>,
      images: product.images.map((img) => this.resolvePublicUrl(img.imageUrl) ?? ''),
      videos: product.videos.map((vid) => ({ videoUrl: this.resolvePublicUrl(vid.videoUrl) ?? '', coverUrl: this.resolvePublicUrl(vid.coverUrl) ?? '' })),
      serviceTags: this.normalizeProductServiceTags(product.serviceTags, product.deliveryType),
      traceCode: trace ? trace.traceCode : '',
      traceDesc: trace ? trace.traceDesc : '',
      brand: product.brand ?? '',
      supplierName: product.supplierName ?? '',
      ingredients: product.ingredients ?? '',
      shelfLife: product.shelfLife ?? '',
      productionDate: product.productionDate ?? '',
      material: product.material ?? '',
      dimensions: product.dimensions ?? '',
      leadTime: product.leadTime ?? '',
      shippingRestrictedRegions: product.shippingRestrictedRegions ?? '',
      afterSalesCommitment: product.afterSalesCommitment ?? '',
      logisticsCompany: product.logisticsCompany ?? '',
      productNature: product.productNature ?? '',
      liveCities: product.liveCities ?? '',
      sessionAttribute: product.sessionAttribute ?? '',
      liveMechanism: product.liveMechanism ?? '',
    };
  }

  async updateMerchantProduct(authUser: AuthUser, productId: number, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const oldProduct = await this.prisma.product.findFirst({ where: { id: BigInt(productId), merchantId: merchant.id, deletedAt: null } });
    if (!oldProduct) {
      throw new NotFoundException('Product not found');
    }

    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const categoryId = body.categoryId ? Number(body.categoryId) : this.toNumber(categories[0]?.id ?? 0);
    const imageUrls = this.readStringArray(body.images).length ? this.readStringArray(body.images) : this.readStringArray(body.imageUrls);
    const videoItems = this.readObjectArray(body.videos);
    const serviceTags = this.normalizeProductServiceTags(body.serviceTags, Number(body.deliveryType ?? oldProduct.deliveryType ?? 1));
    const traceInfo = body.traceInfo ?? body.trace;
    const defaultPrice = String(body.price ?? '0.00');

    const updated = await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        categoryId: BigInt(categoryId),
        title: String(body.title ?? oldProduct.title),
        subtitle: typeof body.subtitle === 'string' ? body.subtitle : null,
        coverUrl: typeof body.coverUrl === 'string' ? body.coverUrl : null,
        detailDesc: typeof body.detailDesc === 'string' ? body.detailDesc : null,
        serviceTags: serviceTags as Prisma.InputJsonValue,
        traceInfo: typeof traceInfo === 'string' ? traceInfo : null,
        originPlace: typeof body.originPlace === 'string' ? body.originPlace : null,
        status: 0,
        auditStatus: 1,
        brand: typeof body.brand === 'string' ? body.brand : null,
        supplierName: typeof body.supplierName === 'string' ? body.supplierName : null,
        ingredients: typeof body.ingredients === 'string' ? body.ingredients : null,
        shelfLife: typeof body.shelfLife === 'string' ? body.shelfLife : null,
        productionDate: typeof body.productionDate === 'string' ? body.productionDate : null,
        material: typeof body.material === 'string' ? body.material : null,
        dimensions: typeof body.dimensions === 'string' ? body.dimensions : null,
        leadTime: typeof body.leadTime === 'string' ? body.leadTime : null,
        shippingRestrictedRegions: typeof body.shippingRestrictedRegions === 'string' ? body.shippingRestrictedRegions : null,
        afterSalesCommitment: typeof body.afterSalesCommitment === 'string' ? body.afterSalesCommitment : null,
        logisticsCompany: typeof body.logisticsCompany === 'string' ? body.logisticsCompany : null,
        productNature: typeof body.productNature === 'string' ? body.productNature : null,
        liveCities: typeof body.liveCities === 'string' ? body.liveCities : null,
        sessionAttribute: typeof body.sessionAttribute === 'string' ? body.sessionAttribute : null,
        liveMechanism: typeof body.liveMechanism === 'string' ? body.liveMechanism : null,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.productSku.deleteMany({ where: { productId: updated.id } });
      await tx.productSku.create({
        data: {
          productId: updated.id,
          skuName: String(body.skuName ?? '默认规格'),
          skuCode: `SKU${updated.id.toString()}1`,
          imageUrl: typeof body.skuImageUrl === 'string' ? body.skuImageUrl : null,
          ...(typeof body.specJson !== 'undefined' ? { specJson: body.specJson as Prisma.InputJsonValue } : {}),
          price: new Prisma.Decimal(defaultPrice),
          originalPrice: new Prisma.Decimal(String(body.originalPrice ?? defaultPrice)),
          offlinePrice: body.offlinePrice ? new Prisma.Decimal(String(body.offlinePrice)) : null,
          stock: Number(body.stock ?? 0),
          lockedStock: 0,
          safetyStock: body.safetyStock ? Number(body.safetyStock) : null,
          status: 1,
        },
      });

      await tx.productImage.deleteMany({ where: { productId: updated.id } });
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((imageUrl, index) => ({ productId: updated.id, imageUrl, sortOrder: index + 1 })),
        });
      }

      await tx.productVideo.deleteMany({ where: { productId: updated.id } });
      if (videoItems.length > 0) {
        await tx.productVideo.createMany({
          data: videoItems.map((video, index) => ({
            productId: updated.id,
            videoUrl: String(video.videoUrl ?? ''),
            coverUrl: typeof video.coverUrl === 'string' ? video.coverUrl : null,
            sortOrder: index + 1,
          })),
        });
      }

      await tx.productTrace.deleteMany({ where: { productId: updated.id } });
      if (traceInfo) {
        const traceCode = typeof traceInfo === 'object' && traceInfo !== null && 'traceCode' in traceInfo ? String(traceInfo.traceCode ?? `TRACE${updated.id.toString()}`) : `TRACE${updated.id.toString()}`;
        const traceDesc =
          typeof traceInfo === 'object' && traceInfo !== null && 'traceDesc' in traceInfo
            ? String(traceInfo.traceDesc ?? '')
            : typeof traceInfo === 'string'
              ? traceInfo
              : '';
        await tx.productTrace.create({
          data: {
            productId: updated.id,
            traceCode,
            traceDesc,
            traceJson: traceInfo as Prisma.InputJsonValue,
          },
        });
      }
    });

    return {
      productId: this.toNumber(updated.id),
      status: 'DRAFT',
      input: body,
    };
  }

  async updateProductStatus(productId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const where: Prisma.ProductWhereInput = { id: BigInt(productId) };
    if (authUser) {
      const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
      where.merchantId = merchant.id;
    }

    const newStatus = String(body.status ?? 'ON_SHELF') === 'ON_SHELF' ? 1 : 0;
    let activeOrderCount = 0;
    if (newStatus === 0) {
      const skuIds = await this.prisma.productSku.findMany({ where: { productId: BigInt(productId), deletedAt: null }, select: { id: true } });
      if (skuIds.length > 0) {
        activeOrderCount = await this.prisma.orderItem.count({
          where: {
            skuId: { in: skuIds.map((s) => s.id) },
            deletedAt: null,
            order: {
              is: {
                deletedAt: null,
                orderStatus: { in: [1, 2] },
                payStatus: 1,
              },
            },
          },
        });
      }
    }

    const result = await this.prisma.product.updateMany({ where, data: { status: newStatus } });
    if (result.count === 0) {
      throw new NotFoundException('Product not found');
    }

    return {
      productId,
      status: body.status ?? 'ON_SHELF',
      ...(activeOrderCount > 0 ? { activeOrderCount, warning: `该商品有 ${activeOrderCount} 个未完成的有效订单，已有订单不受影响` } : {}),
    };
  }

  async updateSkuStock(skuId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const where: Prisma.ProductSkuWhereInput = { id: BigInt(skuId) };
    if (authUser) {
      const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
      where.product = { is: { merchantId: merchant.id } };
    }

    const result = await this.prisma.productSku.updateMany({
      where,
      data: { stock: Number(body.stock ?? 0) },
    });

    if (result.count === 0) {
      throw new NotFoundException('SKU not found');
    }

    return {
      skuId,
      stock: body.stock ?? 0,
    };
  }

  async listMerchantProductSkus(authUser: AuthUser, productId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const skus = await this.prisma.productSku.findMany({ where: { productId: BigInt(productId), deletedAt: null }, orderBy: { id: 'asc' } });
    return skus.map((s) => ({
      skuId: this.toNumber(s.id),
      skuName: s.skuName,
      skuCode: s.skuCode,
      imageUrl: s.imageUrl ?? '',
      specJson: s.specJson ?? {},
      price: this.toMoney(s.price),
      originalPrice: this.toMoney(s.originalPrice ?? s.price),
      offlinePrice: s.offlinePrice ? this.toMoney(s.offlinePrice) : null,
      stock: s.stock,
      lockedStock: s.lockedStock,
      safetyStock: s.safetyStock ?? 0,
      status: s.status === 1 ? 'ENABLED' as const : 'DISABLED' as const,
    }));
  }

  async createMerchantProductSku(authUser: AuthUser, productId: number, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const product = await this.prisma.product.findFirst({ where: { id: BigInt(productId), merchantId: merchant.id } });
    if (!product) throw new NotFoundException('商品不存在');
    const skuCode = `SKU${Date.now()}${Math.random().toString(36).slice(2, 4)}`;
    const sku = await this.prisma.productSku.create({
      data: {
        productId: BigInt(productId),
        skuName: String(body.skuName ?? '默认规格'),
        skuCode,
        imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        specJson: (body.specJson as Prisma.InputJsonValue) ?? {},
        price: new Prisma.Decimal(String(body.price ?? '0.00')),
        originalPrice: body.originalPrice !== undefined ? new Prisma.Decimal(String(body.originalPrice)) : null,
        stock: Number(body.stock ?? 0),
        safetyStock: body.safetyStock !== undefined ? Number(body.safetyStock) : null,
        status: body.status !== undefined ? Number(body.status) : 1,
      },
    });
    return { skuId: this.toNumber(sku.id), skuCode, success: true };
  }

  async updateMerchantSku(authUser: AuthUser, skuId: number, body: Record<string, unknown>) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const data: Record<string, unknown> = {};
    if (body.skuName !== undefined) data.skuName = String(body.skuName);
    if (body.imageUrl !== undefined) data.imageUrl = String(body.imageUrl);
    if (body.price !== undefined) data.price = new Prisma.Decimal(String(body.price));
    if (body.originalPrice !== undefined) data.originalPrice = new Prisma.Decimal(String(body.originalPrice));
    if (body.stock !== undefined) data.stock = Number(body.stock);
    if (body.safetyStock !== undefined) data.safetyStock = Number(body.safetyStock);
    if (body.specJson !== undefined) data.specJson = body.specJson as Prisma.InputJsonValue;
    if (Object.keys(data).length) {
      await this.prisma.productSku.update({ where: { id: BigInt(skuId) }, data: data as any });
    }
    return { success: true };
  }

  async updateMerchantSkuStatus(authUser: AuthUser, skuId: number, body: Record<string, unknown>) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const status = String(body.status ?? 'ENABLED') === 'DISABLED' ? 2 : 1;
    await this.prisma.productSku.update({ where: { id: BigInt(skuId) }, data: { status } });
    return { success: true };
  }

  async deleteMerchantSku(authUser: AuthUser, skuId: number) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.productSku.update({ where: { id: BigInt(skuId) }, data: { deletedAt: this.now() } });
    return { success: true };
  }

  async batchUpdateMerchantSkus(authUser: AuthUser, productId: number, body: Record<string, unknown>) {
    await this.platformDataService.ensureCurrentMerchant(authUser);
    const skuIds = (Array.isArray(body.skuIds) ? body.skuIds : []).map((id: unknown) => BigInt(Number(id)));
    if (!skuIds.length) throw new BadRequestException('skuIds 不能为空');
    const data: Record<string, unknown> = {};
    if (body.price !== undefined) data.price = new Prisma.Decimal(String(body.price));
    if (body.stock !== undefined) data.stock = Number(body.stock);
    if (body.safetyStock !== undefined) data.safetyStock = Number(body.safetyStock);
    if (body.status !== undefined) data.status = Number(body.status);
    if (Object.keys(data).length) {
      await this.prisma.productSku.updateMany({ where: { id: { in: skuIds }, productId: BigInt(productId) }, data: data as any });
    }
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

  private resolvePublicUrl(url: string | null | undefined): string | null {
    return url ?? null;
  }

  private normalizeProductServiceTags(serviceTags: unknown, deliveryType?: number | null): ProductServiceTagView[] {
    if (!Array.isArray(serviceTags)) {
      return this.defaultProductServiceTags(deliveryType);
    }

    const tags = serviceTags
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        key: String(item.key ?? ''),
        title: String(item.title ?? ''),
        desc: String(item.desc ?? ''),
        icon: String(item.icon ?? 'shield'),
      }))
      .filter((item) => item.key && item.title);

    return tags.length ? tags : this.defaultProductServiceTags(deliveryType);
  }

  private defaultProductServiceTags(deliveryType?: number | null): ProductServiceTagView[] {
    const tags: ProductServiceTagView[] = [
      { key: 'quality', title: '品质保证', desc: '精选源头，严格质检', icon: 'shield' },
      { key: 'fast', title: '快速发货', desc: '尽快安排物流发出', icon: 'truck' },
    ];

    if (deliveryType === 2) {
      tags.push({ key: 'originDirect', title: '产地直发', desc: '源头产地打包后尽快安排发货', icon: 'truck' });
    }

    return tags;
  }

  private normalizeOriginPlace(value?: string | null) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }

    const suspiciousKeywords = ['保鲜', '包装', '规格', '饮用水', '冷链', '桶装', '礼盒', '现货', '发货'];
    const hasSeparator = /[、，,;；\/|]/.test(raw);
    const hasSuspiciousKeyword = suspiciousKeywords.some((keyword) => raw.includes(keyword));

    if (hasSeparator || hasSuspiciousKeyword) {
      return '';
    }

    return raw;
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private readObjectArray(value: unknown): Array<Record<string, any>> {
    return Array.isArray(value) ? value.filter((item): item is Record<string, any> => Boolean(item) && typeof item === 'object') : [];
  }

  private now() {
    return new Date();
  }
}
