import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class MerchantReviewService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async listMerchantReviews(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const rating = Number(query.rating);
    const hasReply = query.hasReply;

    const where: Prisma.ProductReviewWhereInput = {
      merchantId: merchant.id,
      deletedAt: null,
      ...(Number.isFinite(rating) && rating > 0 ? { rating } : {}),
      ...(hasReply === 'true' ? { replyContent: { not: null } } : hasReply === 'false' ? { replyContent: null } : {}),
    };

    const [total, reviews] = await Promise.all([
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.findMany({
        where,
        include: { user: true, product: true, sku: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: reviews.map((r) => ({
        id: this.toNumber(r.id),
        orderNo: r.orderNo,
        buyer: {
          userId: this.toNumber(r.user.id),
          nickname: r.user.nickname ?? '买家',
          avatarUrl: r.user.avatarUrl ?? '',
        },
        product: {
          productId: this.toNumber(r.productId),
          title: r.product.title,
          coverUrl: r.product.coverUrl ?? '',
          skuName: r.sku?.skuName ?? '',
        },
        rating: r.rating,
        content: r.content,
        images: (r.images as string[]) ?? [],
        replyContent: r.replyContent,
        repliedAt: r.repliedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getMerchantReviewSummary(authUser: AuthUser) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const where = { merchantId: merchant.id, deletedAt: null };

    const [total, ratingAgg, goodCount, normalCount, badCount, pendingReply] = await Promise.all([
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.aggregate({ where, _avg: { rating: true } }),
      this.prisma.productReview.count({ where: { ...where, rating: { gte: 4 } } }),
      this.prisma.productReview.count({ where: { ...where, rating: 3 } }),
      this.prisma.productReview.count({ where: { ...where, rating: { lte: 2 } } }),
      this.prisma.productReview.count({ where: { ...where, replyContent: null } }),
    ]);

    const avgRating = ratingAgg._avg.rating ?? 0;
    const goodRate = total > 0 ? `${Math.round((goodCount / total) * 100)}%` : '0%';

    return {
      shopScore: avgRating.toFixed(1),
      goodRate,
      pendingReply,
      total,
      goodCount,
      normalCount,
      badCount,
    };
  }

  async replyMerchantReview(authUser: AuthUser, reviewId: number, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const content = String(body.content ?? body.replyContent ?? '').trim();
    if (!content) {
      throw new BadRequestException('回复内容不能为空');
    }

    const review = await this.prisma.productReview.findFirst({
      where: { id: BigInt(reviewId), merchantId: merchant.id, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    await this.prisma.productReview.update({
      where: { id: BigInt(reviewId) },
      data: { replyContent: content, repliedAt: this.now() },
    });

    return { success: true, reviewId, content };
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

  private now() {
    return new Date();
  }
}
