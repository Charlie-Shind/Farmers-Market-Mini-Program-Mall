import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';
import { ObjectStorageService } from '../../../common/storage/object-storage.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

type OrderRuleContext = {
  merchantId?: number;
  categoryIds?: number[];
  userCreatedAt?: Date;
  previousLoginAt?: Date | null;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  previewOrder(authUser: AuthUser, body: Record<string, unknown>) {
    return this.buildOrderPreview(authUser, body);
  }

  createOrder(authUser: AuthUser, body: Record<string, unknown>) {
    return this.buildOrder(authUser, body);
  }

  listOrders(authUser: AuthUser, query: Record<string, string>) {
    return this.listUserOrders(authUser, query);
  }

  getOrderDetail(authUser: AuthUser, orderNo: string) {
    return this.fetchOrderDetail(authUser, orderNo);
  }

  getOrderLogisticsDetail(authUser: AuthUser, orderNo: string) {
    return this.fetchOrderLogistics(authUser, orderNo);
  }

  cancelOrder(authUser: AuthUser, orderNo: string) {
    return this.cancelUserOrder(authUser, orderNo);
  }

  confirmOrder(authUser: AuthUser, orderNo: string) {
    return this.confirmUserOrder(authUser, orderNo);
  }

  submitOrderReview(authUser: AuthUser, orderNo: string, body: Record<string, unknown>) {
    return this.submitReview(authUser, orderNo, body);
  }

  private async resolveUser(authUser: AuthUser) {
    return this.platformDataService.ensureUser(authUser);
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

  private toIso(value: Date | null | undefined): string {
    return value ? value.toISOString() : '';
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

  private resolvePublicUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }
    const baseUrl = this.objectStorageService.getPublicBaseUrl().replace(/\/+$/, '');
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    const localMatches = [
      'http://127.0.0.1:6004',
      'http://localhost:6004',
      'https://127.0.0.1:6004',
      'https://localhost:6004',
    ];
    for (const match of localMatches) {
      if (url.startsWith(match)) {
        return url.replace(match, baseUrl);
      }
    }
    return url;
  }

  private computeDisplayPrice(sku: { price: Prisma.Decimal; promotionPrice?: Prisma.Decimal | null; promotionStartAt?: Date | null; promotionEndAt?: Date | null }): string {
    const now = this.now();
    if (sku.promotionPrice && sku.promotionStartAt && sku.promotionEndAt) {
      if (now >= sku.promotionStartAt && now <= sku.promotionEndAt) {
        return this.toMoney(sku.promotionPrice);
      }
    }
    return this.toMoney(sku.price);
  }

  private isCouponInValidWindow(coupon: { validStartAt?: Date | null; validEndAt?: Date | null }, ref = this.now()): boolean {
    if (coupon.validStartAt && coupon.validStartAt > ref) {
      return false;
    }
    if (coupon.validEndAt && coupon.validEndAt < ref) {
      return false;
    }
    return true;
  }

  private getCouponRuleData(coupon: { scope: string; ruleJson?: Prisma.JsonValue | null }) {
    const rule = coupon.ruleJson && typeof coupon.ruleJson === 'object' && !Array.isArray(coupon.ruleJson)
      ? (coupon.ruleJson as Record<string, unknown>)
      : {};
    const categoryIds = Array.isArray(rule.categoryIds)
      ? rule.categoryIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];
    const merchantIds = Array.isArray(rule.merchantIds)
      ? rule.merchantIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];
    const userRule = rule.userRule && typeof rule.userRule === 'object' && !Array.isArray(rule.userRule)
      ? (rule.userRule as Record<string, unknown>)
      : {};
    const userRuleType = String(userRule.type ?? userRule.audience ?? 'ALL').trim().toUpperCase() || 'ALL';
    const newUserDays = Math.max(Number(userRule.newUserDays ?? 7) || 7, 1);
    const inactiveDays = Math.max(Number(userRule.inactiveDays ?? 30) || 30, 1);
    const autoIssue = userRule.autoIssue == null ? userRuleType !== 'ALL' : Boolean(userRule.autoIssue);
    return {
      scope: String(coupon.scope ?? 'ALL').trim().toUpperCase() || 'ALL',
      categoryIds,
      merchantIds,
      userRuleType,
      newUserDays,
      inactiveDays,
      autoIssue,
    };
  }

  private getCouponUnavailableReason(
    coupon: {
      validStartAt?: Date | null;
      validEndAt?: Date | null;
      status?: string | null;
      stock?: number | null;
      issuedStock?: number | null;
      thresholdAmount?: Prisma.Decimal | number | string | null;
    },
    subtotal = 0,
    context: { merchantId?: number; categoryIds?: number[] } = {},
    ref = this.now(),
  ): string | null {
    if (coupon.status && coupon.status !== 'ENABLED') {
      return '优惠券已下架';
    }
    if (!this.isCouponInValidWindow(coupon, ref)) {
      return '优惠券不在有效期内';
    }
    const stock = Number(coupon.stock ?? 0);
    const issuedStock = Number(coupon.issuedStock ?? 0);
    if (stock > 0 && issuedStock >= stock) {
      return '优惠券已抢光';
    }
    const threshold = Number(coupon.thresholdAmount ?? 0);
    if (subtotal > 0 && threshold > 0 && subtotal < threshold) {
      return `订单金额满 ¥${threshold.toFixed(2)} 可用`;
    }
    return null;
  }

  private matchCouponRule(
    coupon: { scope: string; ruleJson?: Prisma.JsonValue | null },
    context: { merchantId?: number; categoryIds?: number[] } = {},
  ): string | null {
    const rule = this.getCouponRuleData(coupon);
    const categoryIds = context.categoryIds ?? [];
    const merchantId = context.merchantId;

    if (rule.scope === 'ALL') {
      return null;
    }

    if (rule.scope === 'SHOP') {
      if (!merchantId || (rule.merchantIds.length > 0 && !rule.merchantIds.includes(merchantId))) {
        return '仅指定店铺可用';
      }
      return null;
    }

    if (rule.scope === 'PRODUCT' || rule.scope === 'CATEGORY') {
      if (rule.categoryIds.length === 0) {
        return null;
      }
      if (!categoryIds.length || !categoryIds.some((id) => rule.categoryIds.includes(id))) {
        return '仅指定类目商品可用';
      }
      return null;
    }

    if (rule.scope === 'CATEGORY_SHOP') {
      if (rule.merchantIds.length > 0 && (!merchantId || !rule.merchantIds.includes(merchantId))) {
        return '仅指定店铺可用';
      }
      if (rule.categoryIds.length > 0 && (!categoryIds.length || !categoryIds.some((id) => rule.categoryIds.includes(id)))) {
        return '仅指定类目商品可用';
      }
      return null;
    }

    return null;
  }

  private isCouponUserLifecycleEligible(
    coupon: { type: string; scope: string; ruleJson?: Prisma.JsonValue | null },
    user: { createdAt: Date; lastLoginAt?: Date | null },
    previousLoginAt?: Date | null,
  ) {
    const rule = this.getCouponRuleData(coupon);
    const type = String(coupon.type ?? '').trim().toUpperCase();
    const now = this.now();
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
    const activeLoginAt = previousLoginAt ?? user.lastLoginAt ?? null;

    if (type === 'NEW_USER' || rule.userRuleType === 'NEW_USER') {
      const windowMs = rule.newUserDays * 24 * 60 * 60 * 1000;
      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }
      return now.getTime() - createdAt.getTime() <= windowMs;
    }

    if (type === 'RETURNING_USER' || rule.userRuleType === 'RETURNING_USER') {
      if (!activeLoginAt) {
        return false;
      }
      const loginAt = activeLoginAt instanceof Date ? activeLoginAt : new Date(activeLoginAt);
      if (Number.isNaN(loginAt.getTime())) {
        return false;
      }
      const windowMs = rule.inactiveDays * 24 * 60 * 60 * 1000;
      return now.getTime() - loginAt.getTime() >= windowMs;
    }

    return true;
  }

  private evaluateCouponUsage(
    coupon: {
      id: bigint;
      name: string;
      type: string;
      thresholdAmount: Prisma.Decimal | number | string;
      discountAmount: Prisma.Decimal | number | string;
      stock: number;
      issuedStock: number;
      status: string;
      validStartAt?: Date | null;
      validEndAt?: Date | null;
      scope: string;
      ruleJson?: Prisma.JsonValue | null;
    } | null,
    userCoupon: {
      status?: string | null;
      orderNo?: string | null;
      usedAt?: Date | null;
      expiredAt?: Date | null;
      createdAt?: Date;
      lastLoginAt?: Date | null;
    } | null,
    subtotal = 0,
    context: OrderRuleContext = {},
  ) {
    if (!coupon || !userCoupon) {
      return {
        usable: false,
        reason: '优惠券不存在或未领取',
        discountAmount: 0,
      };
    }

    if (userCoupon.status !== 'RECEIVED') {
      return {
        usable: false,
        reason: userCoupon.status === 'USED' ? '优惠券已使用' : userCoupon.status === 'EXPIRED' ? '优惠券已过期' : '优惠券状态异常',
        discountAmount: 0,
      };
    }

    const scopeReason = this.matchCouponRule(coupon, context);
    if (scopeReason) {
      return {
        usable: false,
        reason: scopeReason,
        discountAmount: 0,
      };
    }

    const userRuleEligible = this.isCouponUserLifecycleEligible(
      coupon,
      {
        createdAt: context.userCreatedAt ?? userCoupon.createdAt ?? this.now(),
        lastLoginAt: context.previousLoginAt ?? userCoupon.lastLoginAt ?? null,
      },
      context.previousLoginAt ?? userCoupon.lastLoginAt ?? null,
    );
    if (!userRuleEligible) {
      const type = String(coupon.type ?? '').trim().toUpperCase();
      return {
        usable: false,
        reason: type === 'NEW_USER' ? '仅限新用户使用' : type === 'RETURNING_USER' ? '仅限回归用户使用' : '优惠券不满足使用条件',
        discountAmount: 0,
      };
    }

    const reason = this.getCouponUnavailableReason(coupon, subtotal, context);
    if (reason) {
      return {
        usable: false,
        reason,
        discountAmount: 0,
      };
    }

    const threshold = Number(coupon.thresholdAmount ?? 0);
    const discountAmount = subtotal >= threshold ? Number(coupon.discountAmount ?? 0) : 0;
    return {
      usable: discountAmount > 0 || threshold === 0,
      reason: discountAmount > 0 || threshold === 0 ? null : '订单金额未达到使用门槛',
      discountAmount,
    };
  }

  private normalizeGroupBuyConfig(
    groupBuyConfig: Prisma.JsonValue | Record<string, unknown> | null | undefined,
    fallback?: Prisma.JsonValue | Record<string, unknown> | null,
  ): { enabled: boolean; needed: number; expireHours: number; discountRate: number } | null {
    const source = this.asJsonObject(groupBuyConfig) ?? this.asJsonObject(fallback) ?? null;
    if (!source) {
      return null;
    }

    const enabled = source.enabled == null ? false : Boolean(source.enabled);
    const needed = Math.max(Number(source.needed ?? 3), 2);
    const expireHours = Math.max(Number(source.expireHours ?? 1), 1);
    const discountRate = Math.min(Math.max(Number(source.discountRate ?? 0.7), 0.1), 0.95);

    return {
      enabled,
      needed,
      expireHours,
      discountRate,
    };
  }

  private asJsonObject(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private async getPointRuleConfig() {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['pointsRedeemEnabled', 'pointsEarnRate', 'pointsRedeemRate'],
        },
      },
    });
    const map = new Map(settings.map((item) => [item.key, item.value]));
    const redeemEnabled = String(map.get('pointsRedeemEnabled') ?? 'true') !== 'false';
    const earnRate = Math.max(Number(map.get('pointsEarnRate') ?? 1) || 1, 0.01);
    const redeemRate = Math.max(Number(map.get('pointsRedeemRate') ?? 100) || 100, 1);
    return {
      redeemEnabled,
      earnRate,
      redeemRate,
    };
  }

  private async resolveOrderAddressSnapshot(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.resolveUser(authUser);
    const addressId = body.addressId != null ? Number(body.addressId) : undefined;

    if (body.addressSnapshot && typeof body.addressSnapshot === 'object') {
      return body.addressSnapshot as Prisma.InputJsonValue;
    }

    if (addressId) {
      const address = await this.prisma.userAddress.findFirst({
        where: { id: BigInt(addressId), userId: user.id, deletedAt: null },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      return {
        receiverName: address.receiverName,
        receiverMobile: address.receiverMobile,
        province: address.province,
        city: address.city,
        district: address.district,
        detailAddress: address.detailAddress,
      };
    }

    const defaultAddress = await this.prisma.userAddress.findFirst({
      where: { userId: user.id, deletedAt: null, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });

    if (defaultAddress) {
      return {
        receiverName: defaultAddress.receiverName,
        receiverMobile: defaultAddress.receiverMobile,
        province: defaultAddress.province,
        city: defaultAddress.city,
        district: defaultAddress.district,
        detailAddress: defaultAddress.detailAddress,
      };
    }

    return {
      receiverName: user.nickname ?? '示例用户',
      receiverMobile: user.mobile ?? '13800000000',
      province: '广东',
      city: '深圳',
      district: '南山',
      detailAddress: '示例路 1 号',
    };
  }

  private async calculateFreight(province: string, goodsAmount: number): Promise<number> {
    const rules = await this.prisma.logisticsRule.findMany({
      where: { active: true },
      orderBy: [{ id: 'asc' }],
    });

    let matchedRule = rules.find((r) => r.province && province.includes(r.province));
    if (!matchedRule) {
      matchedRule = rules.find((r) => r.province === '全国');
    }

    if (!matchedRule) {
      return 0;
    }

    if (goodsAmount >= Number(matchedRule.thresholdAmount)) {
      return 0;
    }

    return Number(matchedRule.freightAmount);
  }

  private async getOrderGroupBuySummary(groupBuyId: bigint | null | undefined) {
    if (groupBuyId == null) {
      return null;
    }
    const group = await this.prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      include: {
        members: { select: { id: true, userId: true, isInitiator: true, joinedAt: true } },
        product: { select: { id: true, title: true, coverUrl: true } },
      },
    });
    if (!group) {
      return null;
    }
    return {
      groupId: this.toNumber(group.id),
      groupNo: group.groupNo,
      inviteCode: group.inviteCode,
      status: group.status as 'OPEN' | 'COMPLETED' | 'FAILED',
      needed: group.needed,
      memberCount: group.members.length + 1,
      expireAt: this.toIso(group.expireAt),
      completedAt: this.toIso(group.completedAt),
      productId: this.toNumber(group.productId),
      skuId: this.toNumber(group.skuId),
      productTitle: group.product?.title ?? '',
      productCoverUrl: this.resolvePublicUrl(group.product?.coverUrl ?? null) ?? '',
      groupPrice: this.toMoney(group.groupPrice),
      originPrice: this.toMoney(group.originPrice),
      members: group.members.map((m) => ({
        memberId: this.toNumber(m.id),
        userId: this.toNumber(m.userId),
        isInitiator: m.isInitiator,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  private validateOrderStateTransition(
    current: { orderStatus: number; payStatus: number; deliveryStatus: number; refundStatus: number },
    allowedTransitions: Array<{
      orderStatus?: number;
      payStatus?: number;
      deliveryStatus?: number;
      refundStatus?: number;
    }>,
    errorMessage: string,
  ): void {
    const matched = allowedTransitions.some(
      (t) =>
        (t.orderStatus == null || t.orderStatus === current.orderStatus) &&
        (t.payStatus == null || t.payStatus === current.payStatus) &&
        (t.deliveryStatus == null || t.deliveryStatus === current.deliveryStatus) &&
        (t.refundStatus == null || t.refundStatus === current.refundStatus),
    );
    if (!matched) {
      throw new BadRequestException(errorMessage);
    }
  }

  private computeFlashSaleStatus(startAt: Date, endAt: Date, ref = this.now()): 'UPCOMING' | 'ONGOING' | 'ENDED' {
    if (ref < startAt) {
      return 'UPCOMING';
    }
    if (ref > endAt) {
      return 'ENDED';
    }
    return 'ONGOING';
  }

  private async buildOrderPreview(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.resolveUser(authUser);

    const flashSaleItemId = body.flashSaleItemId != null ? Number(body.flashSaleItemId) : 0;
    const flashSkuId = body.skuId != null ? Number(body.skuId) : 0;
    if (flashSaleItemId > 0 && flashSkuId > 0) {
      const flashItem = await this.prisma.flashSaleItem.findUnique({
        where: { id: BigInt(flashSaleItemId) },
        include: { window: true, sku: { include: { product: true } } },
      });
      if (!flashItem) throw new BadRequestException('秒杀商品不存在');
      if (this.computeFlashSaleStatus(flashItem.window.startAt, flashItem.window.endAt, this.now()) !== 'ONGOING') {
        throw new BadRequestException('当前不在秒杀时段');
      }
      const quantity = Math.max(Number(body.quantity ?? 1) || 1, 1);
      const subtotal = Number(flashItem.flashPrice) * quantity;
      const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
      const province = (addressSnapshot as Record<string, unknown> | null)?.province;
      const freightAmount = await this.calculateFreight(String(province ?? '全国'), subtotal);
      const payAmount = Math.max(subtotal + freightAmount, 0);

      return {
        input: body,
        summary: {
          productAmount: subtotal.toFixed(2),
          freightAmount: freightAmount.toFixed(2),
          discountAmount: '0.00',
          payAmount: payAmount.toFixed(2),
        },
        addressSnapshot,
        couponId: null,
        coupon: null,
        usePoints: 0,
        deliveryType: Number(body.deliveryType ?? 1),
        orderMode: 'FLASH_SALE',
        flashSaleItemId,
      };
    }

    const groupBuyId = body.groupBuyId != null ? Number(body.groupBuyId) : 0;
    const groupProductId = body.productId != null ? Number(body.productId) : 0;
    const groupSkuId = body.skuId != null ? Number(body.skuId) : 0;

    if (groupBuyId > 0) {
      if (!(groupProductId > 0) || !(groupSkuId > 0)) {
        throw new BadRequestException('拼团参数不完整');
      }

      const group = await this.prisma.groupBuy.findUnique({
        where: { id: BigInt(groupBuyId) },
        include: { product: true, sku: true, members: true },
      });

      if (!group) {
        throw new BadRequestException('拼团不存在');
      }
      if (this.toNumber(group.productId) !== groupProductId || this.toNumber(group.skuId) !== groupSkuId) {
        throw new BadRequestException('拼团商品不匹配');
      }
      if (group.status !== 'OPEN' || group.expireAt < this.now()) {
        throw new BadRequestException('拼团已结束');
      }

      const groupConfig = this.normalizeGroupBuyConfig(group.product.groupBuyConfig);
      if (groupConfig && !groupConfig.enabled) {
        throw new BadRequestException('该商品暂不支持拼团');
      }

      const subtotal = Number(group.groupPrice);
      const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
      const province = (addressSnapshot as Record<string, unknown> | null)?.province;
      const freightAmount = await this.calculateFreight(String(province ?? '全国'), subtotal);
      const couponId = body.couponId != null ? Number(body.couponId) : null;
      const coupon = couponId ? await this.prisma.coupon.findUnique({ where: { id: BigInt(couponId) } }) : null;
      const userCoupon = couponId
        ? await this.prisma.userCoupon.findUnique({
            where: {
              userId_couponId: {
                userId: user.id,
                couponId: BigInt(couponId),
              },
            },
          })
        : null;
      const categoryIds = [this.toNumber(group.product.categoryId)];
      const couponUsage = this.evaluateCouponUsage(coupon as any, userCoupon as any, subtotal, {
        merchantId: this.toNumber(group.product.merchantId),
        categoryIds,
      });
      const couponDiscount = couponUsage.usable ? couponUsage.discountAmount : 0;
      const pointRule = await this.getPointRuleConfig();
      const pointsSum = await this.prisma.pointLog.aggregate({
        where: { userId: user.id },
        _sum: { points: true },
      });
      const availablePoints = Math.max(Number(pointsSum._sum.points ?? 0), 0);
      const usePoints = Math.min(Math.max(Number(body.usePoints ?? 0), 0), availablePoints);
      if (usePoints > 0 && !pointRule.redeemEnabled) {
        throw new BadRequestException('积分抵扣已关闭');
      }
      const pointsDiscount = usePoints > 0 ? Math.min(usePoints / pointRule.redeemRate, Math.max(subtotal - couponDiscount, 0)) : 0;
      const payAmount = Math.max(subtotal + freightAmount - couponDiscount - pointsDiscount, 0);

      return {
        input: body,
        summary: {
          productAmount: subtotal.toFixed(2),
          freightAmount: freightAmount.toFixed(2),
          discountAmount: (couponDiscount + pointsDiscount).toFixed(2),
          payAmount: payAmount.toFixed(2),
        },
        addressSnapshot,
        couponId,
        coupon: coupon
          ? {
              couponId,
              usable: couponUsage.usable,
              reason: couponUsage.reason,
              discountAmount: couponUsage.usable ? this.toMoney(couponUsage.discountAmount) : '0.00',
            }
          : null,
        usePoints,
        deliveryType: Number(body.deliveryType ?? 1),
        orderMode: 'GROUP_BUY',
        groupBuyId,
        productId: groupProductId,
        skuId: groupSkuId,
      };
    }

    const selectedIds = Array.isArray(body.cartIds) ? body.cartIds.map((id) => Number(id)) : [];
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId: user.id,
        ...(selectedIds.length ? { id: { in: selectedIds.map((id) => BigInt(id)) } } : { checked: true }),
      },
      include: { sku: true, product: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const subtotal = cartItems.reduce((sum, item) => sum + Number(this.computeDisplayPrice(item.sku)) * item.quantity, 0);
    const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
    const province = (addressSnapshot as Record<string, unknown> | null)?.province;
    const freightAmount = await this.calculateFreight(String(province ?? '全国'), subtotal);
    const couponId = body.couponId != null ? Number(body.couponId) : null;
    const coupon = couponId ? await this.prisma.coupon.findUnique({ where: { id: BigInt(couponId) } }) : null;
    const userCoupon = couponId
      ? await this.prisma.userCoupon.findUnique({
          where: {
            userId_couponId: {
              userId: user.id,
              couponId: BigInt(couponId),
            },
          },
        })
      : null;
    const categoryIds = Array.from(new Set(cartItems.map((item) => this.toNumber(item.product.categoryId))));
    const couponUsage = this.evaluateCouponUsage(coupon as any, userCoupon as any, subtotal, {
      merchantId: this.toNumber(cartItems[0].merchantId),
      categoryIds,
    });
    const couponDiscount = couponUsage.usable ? couponUsage.discountAmount : 0;
    const pointRule = await this.getPointRuleConfig();
    const pointsSum = await this.prisma.pointLog.aggregate({
      where: { userId: user.id },
      _sum: { points: true },
    });
    const availablePoints = Math.max(Number(pointsSum._sum.points ?? 0), 0);
    const usePoints = Math.min(Math.max(Number(body.usePoints ?? 0), 0), availablePoints);
    if (usePoints > 0 && !pointRule.redeemEnabled) {
      throw new BadRequestException('积分抵扣已关闭');
    }
    const pointsDiscount = usePoints > 0 ? Math.min(usePoints / pointRule.redeemRate, Math.max(subtotal - couponDiscount, 0)) : 0;
    const payAmount = Math.max(subtotal + freightAmount - couponDiscount - pointsDiscount, 0);
    return {
      input: body,
      summary: {
        productAmount: subtotal.toFixed(2),
        freightAmount: freightAmount.toFixed(2),
        discountAmount: (couponDiscount + pointsDiscount).toFixed(2),
        payAmount: payAmount.toFixed(2),
      },
      addressSnapshot,
      couponId,
      coupon: coupon
        ? {
            couponId,
            usable: couponUsage.usable,
            reason: couponUsage.reason,
            discountAmount: couponUsage.usable ? this.toMoney(couponUsage.discountAmount) : '0.00',
          }
        : null,
      usePoints,
      deliveryType: Number(body.deliveryType ?? 1),
    };
  }

  private async buildOrder(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.resolveUser(authUser);
    const expireAt = new Date(Date.now() + 30 * 60 * 1000);
    const groupBuyId = body.groupBuyId != null ? Number(body.groupBuyId) : 0;
    const groupProductId = body.productId != null ? Number(body.productId) : 0;
    const groupSkuId = body.skuId != null ? Number(body.skuId) : 0;

    const flashSaleItemId = body.flashSaleItemId != null ? Number(body.flashSaleItemId) : 0;
    const flashSkuId = body.skuId != null ? Number(body.skuId) : 0;
    if (flashSaleItemId > 0 && flashSkuId > 0) {
      const flashItem = await this.prisma.flashSaleItem.findUnique({
        where: { id: BigInt(flashSaleItemId) },
        include: { window: true, sku: { include: { product: true } } },
      });
      if (!flashItem) {
        throw new BadRequestException('秒杀商品不存在');
      }
      if (this.computeFlashSaleStatus(flashItem.window.startAt, flashItem.window.endAt, this.now()) !== 'ONGOING') {
        throw new BadRequestException('当前不在秒杀时段');
      }
      const quantity = Math.max(Number(body.quantity ?? 1) || 1, 1);
      if (flashItem.stockLeft < quantity) {
        throw new BadRequestException('秒杀库存不足');
      }

      const goodsAmount = Number(flashItem.flashPrice) * quantity;
      const merchantId = flashItem.sku.product.merchantId;
      const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
      const province = (addressSnapshot as Record<string, unknown> | null)?.province;
      const freightAmount = await this.calculateFreight(String(province ?? '全国'), goodsAmount);
      const payAmount = Math.max(goodsAmount + freightAmount, 0);
      const orderNo = `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`;

      const order = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNo,
            userId: user.id,
            merchantId,
            addressSnapshot,
            goodsAmount: new Prisma.Decimal(goodsAmount.toFixed(2)),
            freightAmount: new Prisma.Decimal(freightAmount.toFixed(2)),
            discountAmount: new Prisma.Decimal(0),
            payAmount: new Prisma.Decimal(payAmount.toFixed(2)),
            orderStatus: 1,
            payStatus: 0,
            deliveryStatus: 0,
            refundStatus: 0,
            expireAt,
            remark: typeof body.remark === 'string' ? body.remark : null,
            items: {
              create: [
                {
                  productId: flashItem.productId,
                  skuId: flashItem.skuId,
                  productTitle: flashItem.sku.product.title,
                  skuName: flashItem.sku.skuName,
                  productImage: flashItem.sku.product.coverUrl,
                  unitPrice: flashItem.flashPrice,
                  quantity,
                  lineAmount: new Prisma.Decimal((Number(flashItem.flashPrice) * quantity).toFixed(2)),
                },
              ],
            },
          },
          include: { items: true },
        });

        await tx.flashSaleClaim.updateMany({
          where: { itemId: flashItem.id, userId: user.id, orderNo: null },
          data: { orderNo: created.orderNo, status: 'CONVERTED' },
        });

        return created;
      });

      return { orderNo: order.orderNo, status: 'PENDING', orderMode: 'FLASH_SALE', childOrderNos: [order.orderNo], payAmount: payAmount.toFixed(2) };
    }

    if (groupBuyId > 0) {
      if (!(groupProductId > 0) || !(groupSkuId > 0)) {
        throw new BadRequestException('拼团参数不完整');
      }

      const group = await this.prisma.groupBuy.findUnique({
        where: { id: BigInt(groupBuyId) },
        include: { members: true, product: true, sku: true },
      });
      if (!group) {
        throw new BadRequestException('拼团不存在');
      }
      if (this.toNumber(group.productId) !== groupProductId || this.toNumber(group.skuId) !== groupSkuId) {
        throw new BadRequestException('拼团商品不匹配');
      }
      if (group.status !== 'OPEN' || group.expireAt < this.now()) {
        throw new BadRequestException('拼团已结束');
      }

      const groupConfig = this.normalizeGroupBuyConfig(group.product.groupBuyConfig);
      if (groupConfig && !groupConfig.enabled) {
        throw new BadRequestException('该商品暂不支持拼团');
      }

      const groupMember = group.members.find((member) => this.toNumber(member.userId) === this.toNumber(user.id));
      if (groupMember?.orderNo) {
        return { orderNo: groupMember.orderNo, status: 'PENDING' };
      }

      const quantity = Math.max(Number(body.quantity ?? 1) || 1, 1);
      if (quantity !== 1) {
        throw new BadRequestException('拼团商品仅支持单件下单');
      }

      const merchantId = group.product.merchantId;
      const goodsAmount = Number(group.groupPrice) * quantity;
      const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
      const province = (addressSnapshot as Record<string, unknown> | null)?.province;
      const freightAmount = await this.calculateFreight(String(province ?? '全国'), goodsAmount);
      const couponId = body.couponId != null ? Number(body.couponId) : null;
      const coupon = couponId ? await this.prisma.coupon.findUnique({ where: { id: BigInt(couponId) } }) : null;
      const userCoupon = couponId
        ? await this.prisma.userCoupon.findUnique({
            where: {
              userId_couponId: {
                userId: user.id,
                couponId: BigInt(couponId),
              },
            },
          })
        : null;
      const categoryIds = [this.toNumber(group.product.categoryId)];
      const couponUsage = this.evaluateCouponUsage(coupon as any, userCoupon as any, goodsAmount, {
        merchantId: this.toNumber(merchantId),
        categoryIds,
      });
      if (couponId != null && !couponUsage.usable) {
        throw new BadRequestException(couponUsage.reason ?? '优惠券不可用');
      }
      const couponDiscount = couponUsage.usable ? couponUsage.discountAmount : 0;
      const pointRule = await this.getPointRuleConfig();
      const pointsSum = await this.prisma.pointLog.aggregate({
        where: { userId: user.id },
        _sum: { points: true },
      });
      const availablePoints = Math.max(Number(pointsSum._sum.points ?? 0), 0);
      const usePoints = Math.min(Math.max(Number(body.usePoints ?? 0), 0), availablePoints);
      if (usePoints > 0 && !pointRule.redeemEnabled) {
        throw new BadRequestException('积分抵扣已关闭');
      }
      const pointsDiscount = usePoints > 0 ? Math.min(usePoints / pointRule.redeemRate, Math.max(goodsAmount - couponDiscount, 0)) : 0;
      const payAmount = Math.max(goodsAmount + freightAmount - couponDiscount - pointsDiscount, 0);
      const orderNo = `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`;

      const order = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNo,
            userId: user.id,
            merchantId,
            groupBuyId: group.id,
            addressSnapshot,
            goodsAmount: new Prisma.Decimal(goodsAmount.toFixed(2)),
            freightAmount: new Prisma.Decimal(freightAmount.toFixed(2)),
            discountAmount: new Prisma.Decimal((couponDiscount + pointsDiscount).toFixed(2)),
            payAmount: new Prisma.Decimal(payAmount.toFixed(2)),
            orderStatus: 1,
            payStatus: 0,
            deliveryStatus: 0,
            refundStatus: 0,
            expireAt,
            remark: typeof body.remark === 'string' ? body.remark : null,
            items: {
              create: [
                {
                  productId: group.productId,
                  skuId: group.skuId,
                  productTitle: group.product.title,
                  skuName: group.sku.skuName,
                  productImage: group.product.coverUrl,
                  unitPrice: new Prisma.Decimal(Number(group.groupPrice).toFixed(2)),
                  quantity,
                  lineAmount: new Prisma.Decimal((Number(group.groupPrice) * quantity).toFixed(2)),
                },
              ],
            },
          },
          include: { items: true },
        });

        if (groupMember) {
          await tx.groupBuyMember.update({
            where: {
              groupId_userId: {
                groupId: group.id,
                userId: user.id,
              },
            },
            data: {
              orderNo: created.orderNo,
            },
          });
        } else {
          await tx.groupBuyMember.create({
            data: {
              groupId: group.id,
              userId: user.id,
              isInitiator: false,
              orderNo: created.orderNo,
            },
          });
        }

        const memberCount = groupMember ? group.members.length : group.members.length + 1;
        if (memberCount >= group.needed) {
          await tx.groupBuy.update({
            where: { id: group.id },
            data: { status: 'COMPLETED', completedAt: this.now() },
          });
        }

        if (usePoints > 0) {
          await tx.pointLog.create({
            data: {
              userId: user.id,
              changeType: 'DEDUCT',
              points: -usePoints,
              sourceType: 'ORDER',
              sourceNo: orderNo,
              remark: '拼团订单抵扣积分',
            },
          });
        }

        if (couponId != null && coupon && userCoupon && couponUsage.usable) {
          const couponUniqueId = BigInt(couponId);
          await tx.userCoupon.update({
            where: {
              userId_couponId: {
                userId: user.id,
                couponId: couponUniqueId,
              },
            },
            data: {
              status: 'USED',
              usedAt: this.now(),
              orderNo,
            },
          });
        }

        return created;
      });

      return { orderNo: order.orderNo, status: 'PENDING', childOrderNos: [order.orderNo], payAmount: payAmount.toFixed(2) };
    }

    const selectedIds = Array.isArray(body.cartIds) ? body.cartIds.map((id) => Number(id)) : [];

    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId: user.id,
        ...(selectedIds.length ? { id: { in: selectedIds.map((id) => BigInt(id)) } } : { checked: true }),
      },
      include: { sku: { include: { product: true } }, product: true },
      orderBy: [{ merchantId: 'asc' }, { id: 'asc' }],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const inactiveItems = cartItems.filter((item) => item.product.status !== 1 || item.product.auditStatus !== 2 || item.product.deletedAt);
    if (inactiveItems.length > 0) {
      const titles = inactiveItems.map((item) => item.product.title).join('、');
      throw new BadRequestException(`以下商品已下架或未审核通过：${titles}`);
    }

    const insufficientItems = cartItems.filter((item) => item.sku.stock < item.quantity);
    if (insufficientItems.length > 0) {
      const titles = insufficientItems.map((item) => `${item.sku.skuName}(库存${item.sku.stock},需${item.quantity})`).join('、');
      throw new BadRequestException(`以下商品库存不足：${titles}`);
    }

    const parentMerchantId = cartItems[0].merchantId;
    const goodsAmount = cartItems.reduce((sum, item) => sum + Number(this.computeDisplayPrice(item.sku)) * item.quantity, 0);
    const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
    const province = (addressSnapshot as Record<string, unknown> | null)?.province;
    const freightAmount = await this.calculateFreight(String(province ?? '全国'), goodsAmount);
    const couponId = body.couponId != null ? Number(body.couponId) : null;
    const coupon = couponId ? await this.prisma.coupon.findUnique({ where: { id: BigInt(couponId) } }) : null;
    const userCoupon = couponId
      ? await this.prisma.userCoupon.findUnique({
          where: {
            userId_couponId: {
              userId: user.id,
              couponId: BigInt(couponId),
            },
          },
        })
      : null;
    const categoryIds = Array.from(new Set(cartItems.map((item) => this.toNumber(item.product.categoryId))));
    const couponUsage = this.evaluateCouponUsage(coupon as any, userCoupon as any, goodsAmount, {
      merchantId: this.toNumber(parentMerchantId),
      categoryIds,
    });
    if (couponId != null && !couponUsage.usable) {
      throw new BadRequestException(couponUsage.reason ?? '优惠券不可用');
    }
    const couponDiscount = couponUsage.usable ? couponUsage.discountAmount : 0;
    const pointRule = await this.getPointRuleConfig();
    const pointsSum = await this.prisma.pointLog.aggregate({
      where: { userId: user.id },
      _sum: { points: true },
    });
    const availablePoints = Math.max(Number(pointsSum._sum.points ?? 0), 0);
    const usePoints = Math.min(Math.max(Number(body.usePoints ?? 0), 0), availablePoints);
    if (usePoints > 0 && !pointRule.redeemEnabled) {
      throw new BadRequestException('积分抵扣已关闭');
    }
    const pointsDiscount = usePoints > 0 ? Math.min(usePoints / pointRule.redeemRate, Math.max(goodsAmount - couponDiscount, 0)) : 0;
    const payAmount = Math.max(goodsAmount + freightAmount - couponDiscount - pointsDiscount, 0);
    const parentOrderNo = `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    const childPlans = cartItems.map((item, index) => {
      const childGoodsAmount = Number(this.computeDisplayPrice(item.sku)) * item.quantity;
      const proportion = goodsAmount > 0 ? childGoodsAmount / goodsAmount : 1 / cartItems.length;
      const isLast = index === cartItems.length - 1;
      return { cartItem: item, childGoodsAmount, proportion, isLast };
    });

    let accumulatedFreight = 0;
    let accumulatedDiscount = 0;
    const childAllocations = childPlans.map((plan) => {
      const childFreight = plan.isLast ? Math.max(freightAmount - accumulatedFreight, 0) : Math.round(freightAmount * plan.proportion * 100) / 100;
      const childDiscount = plan.isLast ? Math.max(couponDiscount + pointsDiscount - accumulatedDiscount, 0) : Math.round((couponDiscount + pointsDiscount) * plan.proportion * 100) / 100;
      accumulatedFreight += childFreight;
      accumulatedDiscount += childDiscount;
      const childPayAmount = Math.max(plan.childGoodsAmount + childFreight - childDiscount, 0);
      return {
        ...plan,
        childFreight,
        childDiscount,
        childPayAmount,
        childOrderNo: `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      };
    });

    const order = await this.prisma.$transaction(async (tx) => {
      const parent = await tx.order.create({
        data: {
          orderNo: parentOrderNo,
          parentOrderNo: null,
          isParent: true,
          userId: user.id,
          merchantId: parentMerchantId,
          addressSnapshot,
          goodsAmount: new Prisma.Decimal(goodsAmount.toFixed(2)),
          freightAmount: new Prisma.Decimal(freightAmount.toFixed(2)),
          discountAmount: new Prisma.Decimal((couponDiscount + pointsDiscount).toFixed(2)),
          payAmount: new Prisma.Decimal(payAmount.toFixed(2)),
          orderStatus: 1,
          payStatus: 0,
          deliveryStatus: 0,
          refundStatus: 0,
          expireAt,
          remark: typeof body.remark === 'string' ? body.remark : null,
        },
      });

      for (const allocation of childAllocations) {
        await tx.order.create({
          data: {
            orderNo: allocation.childOrderNo,
            parentOrderNo: parent.orderNo,
            isParent: false,
            userId: user.id,
            merchantId: allocation.cartItem.merchantId,
            addressSnapshot,
            goodsAmount: new Prisma.Decimal(allocation.childGoodsAmount.toFixed(2)),
            freightAmount: new Prisma.Decimal(allocation.childFreight.toFixed(2)),
            discountAmount: new Prisma.Decimal(allocation.childDiscount.toFixed(2)),
            payAmount: new Prisma.Decimal(allocation.childPayAmount.toFixed(2)),
            orderStatus: 1,
            payStatus: 0,
            deliveryStatus: 0,
            refundStatus: 0,
            expireAt,
            remark: typeof body.remark === 'string' ? body.remark : null,
            items: {
              create: [
                {
                  productId: allocation.cartItem.productId,
                  skuId: allocation.cartItem.skuId,
                  productTitle: allocation.cartItem.product.title,
                  skuName: allocation.cartItem.sku.skuName,
                  productImage: allocation.cartItem.product.coverUrl,
                  unitPrice: new Prisma.Decimal(this.computeDisplayPrice(allocation.cartItem.sku)),
                  quantity: allocation.cartItem.quantity,
                  lineAmount: new Prisma.Decimal(allocation.childGoodsAmount.toFixed(2)),
                },
              ],
            },
          },
        });
      }

      for (const item of cartItems) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: {
            stock: { decrement: item.quantity },
            lockedStock: { increment: item.quantity },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: { id: { in: cartItems.map((item) => item.id) } },
      });

      if (usePoints > 0) {
        await tx.pointLog.create({
          data: {
            userId: user.id,
            changeType: 'DEDUCT',
            points: -usePoints,
            sourceType: 'ORDER',
            sourceNo: parentOrderNo,
            remark: '订单抵扣积分',
          },
        });
      }

      if (coupon && userCoupon && couponUsage.usable) {
        await tx.userCoupon.update({
          where: {
            userId_couponId: {
              userId: user.id,
              couponId: coupon.id,
            },
          },
          data: {
            status: 'USED',
            usedAt: this.now(),
            orderNo: parentOrderNo,
          },
        });
      }

      return parent;
    });

    const cartCount = await this.prisma.cartItem.aggregate({
      where: { userId: user.id },
      _sum: { quantity: true },
    });
    const remainingCartCount = Number(cartCount._sum.quantity ?? 0);

    return {
      orderNo: order.orderNo,
      status: 'PENDING_PAY',
      payAmount: order.payAmount.toFixed(2),
      input: body,
      addressSnapshot,
      couponId,
      usePoints,
      deliveryType: Number(body.deliveryType ?? 1),
      cartCount: remainingCartCount,
      childOrderNos: childAllocations.map((a) => a.childOrderNo),
    };
  }

  private async listUserOrders(authUser: AuthUser, query: Record<string, string>) {
    const user = await this.resolveUser(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();

    const where: Prisma.OrderWhereInput = {
      userId: user.id,
      isParent: false,
      ...(keyword
        ? {
            OR: [{ orderNo: { contains: keyword } }, { remark: { contains: keyword } }],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          merchant: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    const enrichedItems = await Promise.all(
      items.map(async (order) => {
        const groupBuy = await this.getOrderGroupBuySummary(order.groupBuyId);
        return {
          orderNo: order.orderNo,
          merchantId: this.toNumber(order.merchantId),
          storeName: order.merchant.storeName,
          orderStatus: this.getUserOrderStatusEnum(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
          statusEnum: this.getUserOrderStatusEnum(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
          statusLabel: this.getUserOrderStatusLabel(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
          status: this.getUserOrderStatusLabel(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
          payStatus: order.payStatus,
          deliveryStatus: order.deliveryStatus,
          afterSaleStatus: order.refundStatus,
          groupBuyId: order.groupBuyId != null ? this.toNumber(order.groupBuyId) : null,
          groupBuy,
          expireAt: this.toIso(order.expireAt),
          actionButtons: this.getUserOrderActionButtons(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt, groupBuy),
          totalAmount: this.toMoney(order.goodsAmount),
          freightAmount: this.toMoney(order.freightAmount),
          discountAmount: this.toMoney(order.discountAmount),
          payAmount: this.toMoney(order.payAmount),
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
        };
      }),
    );

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: enrichedItems,
    };
  }

  private getUserOrderStatusLabel(orderStatus: number, payStatus: number, deliveryStatus: number, refundStatus: number, expireAt?: Date | null): string {
    if (expireAt != null && expireAt < this.now() && payStatus === 0 && orderStatus === 1) {
      return '已过期';
    }

    if (refundStatus === 1 || refundStatus === 2) {
      return '售后中';
    }

    if (orderStatus === 4) {
      return '已取消';
    }

    if (orderStatus === 3) {
      return '已完成';
    }

    if (payStatus === 0) {
      return '待付款';
    }

    if (deliveryStatus === 2) {
      return '待收货';
    }

    return '待发货';
  }

  private getUserOrderStatusEnum(orderStatus: number, payStatus: number, deliveryStatus: number, refundStatus: number, expireAt?: Date | null): string {
    if (expireAt != null && expireAt < this.now() && payStatus === 0 && orderStatus === 1) {
      return 'EXPIRED';
    }

    if (refundStatus === 1 || refundStatus === 2) {
      return 'REFUNDING';
    }

    if (orderStatus === 4) {
      return 'CANCELLED';
    }

    if (orderStatus === 3) {
      return 'COMPLETED';
    }

    if (payStatus === 0) {
      return 'PENDING_PAY';
    }

    if (deliveryStatus === 2) {
      return 'PENDING_RECEIVE';
    }

    return 'PENDING_SHIP';
  }

  private getUserOrderActionButtons(orderStatus: number, payStatus: number, deliveryStatus: number, refundStatus: number, expireAt?: Date | null, groupBuy?: { status?: string } | null) {
    const buttons: Array<{ key: string; label: string; type: 'primary' | 'secondary' }> = [];
    const isExpired = expireAt != null && expireAt < this.now() && payStatus === 0;

    if (groupBuy?.status === 'OPEN' && payStatus === 1) {
      buttons.push({ key: 'invite', label: '邀请好友参团', type: 'primary' });
    }

    if (refundStatus === 1 || refundStatus === 2) {
      return buttons;
    }

    if (orderStatus === 4) {
      return buttons;
    }

    if (orderStatus === 3) {
      if (deliveryStatus >= 2) {
        buttons.push({ key: 'logistics', label: '查看物流', type: 'secondary' });
      }
      if (refundStatus !== 3) {
        buttons.push({ key: 'refund', label: '申请售后', type: 'secondary' });
      }
      buttons.push({ key: 'review', label: '去评价', type: 'primary' });
      return buttons;
    }

    if (payStatus === 0) {
      if (isExpired) {
        return buttons;
      }
      buttons.push({ key: 'cancel', label: '取消订单', type: 'secondary' });
      buttons.push({ key: 'pay', label: '继续支付', type: 'primary' });
      return buttons;
    }

    if (deliveryStatus === 0) {
      buttons.push({ key: 'refund', label: '申请退款', type: 'secondary' });
      return buttons;
    }

    if (deliveryStatus === 1) {
      buttons.push({ key: 'logistics', label: '查看物流', type: 'secondary' });
      buttons.push({ key: 'refund', label: '申请退款', type: 'secondary' });
      return buttons;
    }

    if (deliveryStatus === 2) {
      buttons.push({ key: 'logistics', label: '查看物流', type: 'secondary' });
      buttons.push({ key: 'confirm', label: '确认收货', type: 'primary' });
      buttons.push({ key: 'refund', label: '申请售后', type: 'secondary' });
      return buttons;
    }

    if (orderStatus === 3 || orderStatus === 4) {
      if (refundStatus !== 3) {
        buttons.push({ key: 'refund', label: '申请售后', type: 'secondary' });
      }
      buttons.push({ key: 'review', label: '去评价', type: 'primary' });
    }

    return buttons;
  }

  private async fetchOrderDetail(authUser: AuthUser, orderNo: string) {
    const user = await this.resolveUser(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      include: {
        merchant: true,
        items: true,
        deliveries: true,
      },
    });

    if (!order) {
      return null;
    }

    const groupBuy = await this.getOrderGroupBuySummary(order.groupBuyId);

    return {
      id: this.toNumber(order.id),
      orderNo: order.orderNo,
      userId: this.toNumber(order.userId),
      merchantId: this.toNumber(order.merchantId),
      addressSnapshot: order.addressSnapshot
        ? {
            ...(order.addressSnapshot as Record<string, unknown>),
            name: String((order.addressSnapshot as Record<string, unknown>).receiverName ?? (order.addressSnapshot as Record<string, unknown>).name ?? ''),
            mobile: String((order.addressSnapshot as Record<string, unknown>).receiverMobile ?? (order.addressSnapshot as Record<string, unknown>).mobile ?? ''),
            receiverName: String((order.addressSnapshot as Record<string, unknown>).receiverName ?? (order.addressSnapshot as Record<string, unknown>).name ?? ''),
            receiverMobile: String((order.addressSnapshot as Record<string, unknown>).receiverMobile ?? (order.addressSnapshot as Record<string, unknown>).mobile ?? ''),
            detail: String((order.addressSnapshot as Record<string, unknown>).detailAddress ?? (order.addressSnapshot as Record<string, unknown>).detail ?? ''),
            detailAddress: String((order.addressSnapshot as Record<string, unknown>).detailAddress ?? (order.addressSnapshot as Record<string, unknown>).detail ?? ''),
          }
        : null,
      goodsAmount: this.toMoney(order.goodsAmount),
      freightAmount: this.toMoney(order.freightAmount),
      discountAmount: this.toMoney(order.discountAmount),
      payAmount: this.toMoney(order.payAmount),
      orderStatus: this.getUserOrderStatusEnum(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
      statusEnum: this.getUserOrderStatusEnum(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
      statusLabel: this.getUserOrderStatusLabel(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
      status: this.getUserOrderStatusLabel(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt),
      payStatus: order.payStatus,
      deliveryStatus: order.deliveryStatus,
      refundStatus: order.refundStatus,
      afterSaleStatus: order.refundStatus,
      groupBuyId: order.groupBuyId != null ? this.toNumber(order.groupBuyId) : null,
      groupBuy,
      expireAt: this.toIso(order.expireAt),
      actionButtons: this.getUserOrderActionButtons(order.orderStatus, order.payStatus, order.deliveryStatus, order.refundStatus, order.expireAt, groupBuy),
      remark: order.remark,
      createdAt: this.toIso(order.createdAt),
      paidAt: this.toIso(order.paidAt),
      deliveredAt: this.toIso(order.deliveries[0]?.shippedAt ?? null),
      completedAt: this.toIso(order.completedAt),
      items: order.items.map((item) => ({
        id: this.toNumber(item.id),
        orderItemId: this.toNumber(item.id),
        productId: this.toNumber(item.productId),
        skuId: this.toNumber(item.skuId),
        productTitle: item.productTitle,
        skuName: item.skuName,
        productImage: this.resolvePublicUrl(item.productImage) ?? '',
        unitPrice: this.toMoney(item.unitPrice),
        quantity: item.quantity,
        lineAmount: this.toMoney(item.lineAmount),
      })),
      deliveries: order.deliveries.map((delivery) => ({
        id: this.toNumber(delivery.id),
        expressCompany: delivery.logisticsCompany,
        expressNo: delivery.trackingNo,
        shippedAt: this.toIso(delivery.shippedAt),
      })),
      merchant: {
        id: this.toNumber(order.merchantId),
        storeName: order.merchant.storeName,
      },
    };
  }

  private async cancelUserOrder(authUser: AuthUser, orderNo: string) {
    const user = await this.resolveUser(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      select: { id: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true, parentOrderNo: true, isParent: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const targetParentOrderNo = order.parentOrderNo ?? (order.isParent ? orderNo : null);
    const ordersToCancel = targetParentOrderNo
      ? await this.prisma.order.findMany({
          where: {
            userId: user.id,
            OR: [{ orderNo: targetParentOrderNo }, { parentOrderNo: targetParentOrderNo }],
          },
          select: { id: true, orderNo: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true, isParent: true },
        })
      : [order as any];

    for (const o of ordersToCancel) {
      if (o.orderStatus !== 1 || o.payStatus !== 0 || o.refundStatus !== 0) {
        throw new BadRequestException('仅待支付且无售后的订单可取消');
      }
    }

    const orderIds = ordersToCancel.map((o) => o.id);
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId: { in: orderIds }, deletedAt: null },
      select: { skuId: true, quantity: true },
    });

    const couponLookupOrderNo = targetParentOrderNo ?? orderNo;
    const couponUsage = await this.prisma.userCoupon.findFirst({
      where: { userId: user.id, orderNo: couponLookupOrderNo },
      select: { userId: true, couponId: true, status: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { id: { in: orderIds }, orderStatus: 1, payStatus: 0, refundStatus: 0 },
        data: { orderStatus: 4, cancelReason: '用户取消' },
      });

      for (const oi of orderItems) {
        await tx.productSku.update({
          where: { id: oi.skuId },
          data: {
            stock: { increment: oi.quantity },
            lockedStock: { decrement: oi.quantity },
          },
        });
      }

      if (couponUsage && couponUsage.status === 'USED') {
        await tx.userCoupon.update({
          where: {
            userId_couponId: {
              userId: couponUsage.userId,
              couponId: couponUsage.couponId,
            },
          },
          data: {
            status: 'RECEIVED',
            usedAt: null,
            orderNo: null,
          },
        });
      }
    });

    return { orderNo, status: 'CANCELLED' };
  }

  private async confirmUserOrder(authUser: AuthUser, orderNo: string) {
    const user = await this.resolveUser(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      include: { merchant: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateOrderStateTransition(
      { orderStatus: order.orderStatus, payStatus: order.payStatus, deliveryStatus: order.deliveryStatus, refundStatus: order.refundStatus },
      [
        {
          orderStatus: 2,
          payStatus: 1,
          deliveryStatus: 2,
          refundStatus: 0,
        },
      ],
      '仅已发货待收货的订单可确认收货',
    );

    await this.prisma.order.update({
      where: { id: order.id, orderStatus: 2, payStatus: 1, deliveryStatus: 2, refundStatus: 0 },
      data: { orderStatus: 3, deliveryStatus: 2, completedAt: this.now() },
    });

    const pointRule = await this.getPointRuleConfig();
    const points = Math.max(Math.floor(Number(order.payAmount) * pointRule.earnRate), 0);
    if (points > 0) {
      await this.prisma.pointLog.create({
        data: {
          userId: user.id,
          changeType: 'EARN',
          points,
          sourceType: 'ORDER',
          sourceNo: order.orderNo,
          remark: '订单完成奖励',
        },
      });
    }

    return { orderNo, status: 'COMPLETED' };
  }

  private async fetchOrderLogistics(authUser: AuthUser, orderNo: string) {
    const user = await this.resolveUser(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      include: {
        deliveries: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const delivery = order.deliveries[0];
    const logisticsCompany = delivery?.logisticsCompany ?? '';
    const trackingNo = delivery?.trackingNo ?? '';
    const shipped = Boolean(delivery?.shippedAt) || order.deliveryStatus >= 2;
    const signed = Boolean(delivery?.deliveredAt) || order.deliveryStatus >= 3;
    const logisticsCode = logisticsCompany ? logisticsCompany.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase() : 'SF';

    return {
      orderNo: order.orderNo,
      logisticsCompany,
      logisticsCode,
      trackingNo,
      status: signed ? 'DELIVERED' : shipped ? 'IN_TRANSIT' : 'PENDING_SHIP',
      statusLabel: signed ? '已签收' : shipped ? '运输中' : '待发货',
      shippedAt: delivery?.shippedAt ?? null,
      deliveredAt: delivery?.deliveredAt ?? null,
      updatedAt: delivery?.updatedAt ?? order.updatedAt,
      timeline: [
        {
          time: this.toIso(order.createdAt),
          title: '订单已创建',
          desc: '等待商家处理',
          status: 'done',
        },
        {
          time: order.paidAt ? this.toIso(order.paidAt) : null,
          title: '支付完成',
          desc: '已通过支付校验',
          status: order.payStatus === 1 ? 'done' : 'pending',
        },
        {
          time: delivery?.shippedAt ? this.toIso(delivery.shippedAt) : null,
          title: '已发货',
          desc: logisticsCompany && trackingNo ? `${logisticsCompany} ${trackingNo}` : '等待商家发货',
          status: shipped ? 'done' : 'pending',
        },
        {
          time: delivery?.deliveredAt ? this.toIso(delivery.deliveredAt) : null,
          title: '已签收',
          desc: '物流已完成',
          status: signed ? 'done' : 'pending',
        },
      ],
    };
  }

  private async submitReview(authUser: AuthUser, orderNo: string, body: Record<string, unknown>) {
    const user = await this.resolveUser(authUser);

    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id, deletedAt: null },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.orderStatus !== 3) {
      throw new BadRequestException('订单未完成，暂不可评价');
    }

    const reviews = Array.isArray(body.reviews) ? body.reviews : [];
    if (reviews.length === 0) {
      throw new BadRequestException('reviews is required');
    }
    const results: Array<{ orderItemId: number; reviewId: number }> = [];

    for (const rv of reviews as Array<Record<string, unknown>>) {
      const orderItemId = Number(rv.orderItemId);
      const rating = Math.min(5, Math.max(1, Number(rv.rating ?? 5)));
      const content = String(rv.content ?? '').trim();

      if (!orderItemId) {
        throw new BadRequestException('orderItemId is required');
      }
      if (!content) {
        throw new BadRequestException('评价内容不能为空');
      }

      const orderItem = order.items.find((i) => this.toNumber(i.id) === orderItemId);
      if (!orderItem) {
        throw new NotFoundException('订单项不存在');
      }

      const existing = await this.prisma.productReview.findUnique({
        where: { orderItemId: BigInt(orderItemId) },
      });
      if (existing) {
        throw new BadRequestException('该订单项已评价');
      }

      const created = await this.prisma.productReview.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          orderItemId: BigInt(orderItemId),
          userId: user.id,
          merchantId: order.merchantId,
          productId: orderItem.productId,
          skuId: orderItem.skuId,
          rating,
          content,
          images: Array.isArray(rv.images) ? rv.images : [],
        },
      });

      results.push({ orderItemId, reviewId: this.toNumber(created.id) });
    }

    return { orderNo, reviewCount: results.length, results };
  }
}
