import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';
import { isPublicProductVisible } from '../../../common/utils/product-visibility';

@Injectable()
export class ProductDiscoveryService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async getCategoryRecommendations(categoryId: number, period: string, limit: number, page: number) {
    const category = await this.prisma.category.findUnique({ where: { id: BigInt(categoryId) } });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit || 20)));
    const safePage = Math.max(1, Math.floor(page || 1));
    const skip = (safePage - 1) * safeLimit;

    const [total, products] = await Promise.all([
      this.prisma.product.count({
        where: {
          categoryId: BigInt(categoryId),
          status: 1,
          auditStatus: 2,
          deletedAt: null,
        },
      }),
      this.prisma.product.findMany({
        where: {
          categoryId: BigInt(categoryId),
          status: 1,
          auditStatus: 2,
          deletedAt: null,
        },
        include: {
          merchant: true,
          category: true,
          skus: { orderBy: { id: 'asc' } },
        },
        orderBy: [{ isHot: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: safeLimit,
      }),
    ]);

    return {
      page: safePage,
      pageSize: safeLimit,
      total,
      period,
      items: products.map((product) => ({
        id: Number(product.id),
        title: product.title,
        subtitle: product.subtitle ?? '',
        coverUrl: product.coverUrl ?? '',
        minPrice: Number(product.skus[0]?.price ?? 0).toFixed(2),
        merchantId: Number(product.merchantId),
        merchantName: product.merchant.storeName,
        categoryId: Number(product.categoryId),
        categoryName: product.category.name,
        isHot: product.isHot,
        isPreSale: product.isPreSale,
        status: product.status,
      })),
    };
  }

  async getRelatedProducts(productId: number, limit: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: { merchant: true, category: true, skus: { orderBy: { id: 'asc' } } },
    });

    if (!product || !isPublicProductVisible(product)) {
      throw new NotFoundException('商品不存在');
    }

    const safeLimit = Math.max(1, Math.min(12, Math.floor(limit || 6)));
    const related = await this.prisma.product.findMany({
      where: {
        id: { not: product.id },
        categoryId: product.categoryId,
        status: 1,
        auditStatus: 2,
        deletedAt: null,
      },
      include: { merchant: true, skus: { orderBy: { id: 'asc' } } },
      orderBy: [{ isHot: 'desc' }, { id: 'desc' }],
      take: safeLimit,
    });

    return related.map((item) => ({
      id: Number(item.id),
      title: item.title,
      coverUrl: item.coverUrl ?? '',
      minPrice: Number(item.skus[0]?.price ?? 0).toFixed(2),
      merchantId: Number(item.merchantId),
      merchantName: item.merchant.storeName,
      isHot: item.isHot,
    }));
  }
}
