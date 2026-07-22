import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash, randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { ObjectStorageService } from '../storage/object-storage.service';
import { LeaderService } from './leader.service';
import { AdminAuthSecurityService } from './admin-auth-security.service';
import { WechatAuthService } from './wechat-auth.service';

import { RoleCode } from '../enums/role.enum';
import { TokenType } from '../enums/token-type.enum';
import { AuthUser } from '../types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { buildFallbackNickname, resolveProfileNickname, resolveProfileText } from '../utils/profile';
import { requireConfigValue } from '../utils/config';
import {
  paginate,
  scaffoldAdminActivities,
  scaffoldAdminMerchants,
  scaffoldAdminProducts,
  scaffoldAdminRefunds,
  scaffoldAdminUsers,
  scaffoldBanners,
  scaffoldCategories,
  scaffoldCartGroups,
  scaffoldOrders,
  scaffoldCoupons,
  scaffoldDashboardOverview,
  scaffoldDashboardSales,
  scaffoldHotProducts,
  scaffoldLeaderCommissions,
  scaffoldLogisticsRules,
  scaffoldMerchantWallet,
  scaffoldOperationLogs,
  scaffoldOriginSales,
  scaffoldPointsLogs,
  scaffoldProducts,
  scaffoldProductDetails,
  scaffoldSystemSettings,
} from '../../modules/business/scaffold.fixture';

type ProductSeed = {
  title: string;
  subtitle: string;
  originPlace: string;
  coverUrl: string;
  categoryName: string;
  merchantName: string;
  contactName: string;
  contactMobile: string;
  price: string;
  originalPrice: string;
  skuName: string;
  skuCode: string;
  stock: number;
  imageUrls: string[];
  videoUrls: { videoUrl: string; coverUrl?: string }[];
  traceCode: string;
  traceDesc: string;
};

type ProductServiceTagView = {
  key: string;
  title: string;
  desc: string;
  icon: string;
};

type TraceDetailLineView = {
  label: string;
  value: string;
};

type TraceTimelineItemView = {
  title: string;
  desc: string;
  time: string;
  status: 'done' | 'pending';
};

type AccountScope = 'USER' | 'ADMIN';

const MERCHANT_ADMIN_PERMISSION_KEYS = [
  'dashboard',
  'analytics',
  'orders',
  'products',
  'withdraws',
  'refunds',
  'merchants',
] as const;

const ADMIN_PERMISSION_KEYS = [
  'dashboard',
  'analytics',
  'merchants',
  'products',
  'categories',
  'orders',
  'logistics',
  'refunds',
  'withdraws',
  'chat',
  'coupons',
  'exchange',
  'activities',
  'banners',
  'messages',
  'users',
  'admins',
  'settings',
  'leaders',
  'pickup-points',
  'commissions',
] as const;

const DEFAULT_PLATFORM_OFFICIAL_MERCHANT_NAME = '浔源农仓';

@Injectable()
export class PlatformDataService {
  private readonly logger = new Logger(PlatformDataService.name);
  private seedPromise: Promise<void> | null = null;
  private readonly adminPermissionKeySet = new Set<string>(ADMIN_PERMISSION_KEYS);

  constructor(
      private readonly prisma: PrismaService,
      private readonly jwtService: JwtService,
      private readonly configService: ConfigService,
      private readonly redisService: RedisService,
      private readonly objectStorageService: ObjectStorageService,
      private readonly leaderService: LeaderService,
      private readonly adminAuthSecurityService: AdminAuthSecurityService,
      private readonly wechatAuthService: WechatAuthService,
  ) {}

  private normalizeAdminPermissionKeys(value: unknown): string[] {
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map((item) => String(item).trim()).filter((item) => this.adminPermissionKeySet.has(item))));
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record.all === true) {
        return [...ADMIN_PERMISSION_KEYS];
      }
      if (Array.isArray(record.permissionKeys)) {
        return this.normalizeAdminPermissionKeys(record.permissionKeys);
      }
      if (Array.isArray(record.keys)) {
        return this.normalizeAdminPermissionKeys(record.keys);
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }

      try {
        return this.normalizeAdminPermissionKeys(JSON.parse(trimmed));
      } catch {
        return Array.from(
          new Set(
            trimmed
              .split(',')
              .map((item) => item.trim())
              .filter((item) => this.adminPermissionKeySet.has(item)),
          ),
        );
      }
    }

    return [];
  }

  private expandAdminPermissionKeys(keys: string[]): string[] {
    const expanded = new Set(keys);
    if (expanded.has('products')) {
      expanded.add('categories');
    }
    if (expanded.has('orders')) {
      expanded.add('withdraws');
    }
    if (expanded.has('leaders')) {
      expanded.add('pickup-points');
      expanded.add('commissions');
    }
    return Array.from(expanded).filter((item) => this.adminPermissionKeySet.has(item));
  }

  private resolveAdminPermissionKeys(permissionJson: unknown, roleCode?: string): string[] {
    const permissionKeys = this.normalizeAdminPermissionKeys(permissionJson);
    if (permissionKeys.length > 0) {
      return this.expandAdminPermissionKeys(permissionKeys);
    }

    if (roleCode === 'MERCHANT_ADMIN') {
      return [...MERCHANT_ADMIN_PERMISSION_KEYS];
    }

    if (roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN') {
      return [...ADMIN_PERMISSION_KEYS];
    }

    return [...ADMIN_PERMISSION_KEYS];
  }

  /** 生成默认登录密码：12 位，含大小写字母、数字、特殊符号 */
  private generateRandomPassword(length = 12): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*?_+-=';
    const all = upper + lower + digits + symbols;
    const pick = (pool: string) => pool[randomInt(pool.length)];

    const chars = [
      pick(upper),
      pick(lower),
      pick(digits),
      pick(symbols),
    ];
    for (let i = chars.length; i < length; i += 1) {
      chars.push(pick(all));
    }
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  /** 平台管理员返回 null；商户后台账号返回绑定的 merchantId */
  private async resolveAdminMerchantScope(authUser?: AuthUser | null): Promise<number | null> {
    if (!authUser || authUser.role !== RoleCode.ADMIN) {
      return null;
    }
    if (authUser.merchantId != null && Number.isFinite(Number(authUser.merchantId))) {
      return Number(authUser.merchantId);
    }
    const adminId = this.parseAdminIdFromAuth(authUser);
    if (adminId == null) {
      return null;
    }
    const admin = await this.prisma.adminUser.findFirst({
      where: { id: BigInt(adminId), deletedAt: null },
      select: { merchantId: true },
    });
    return admin?.merchantId != null ? this.toNumber(admin.merchantId) : null;
  }

  private parseAdminIdFromAuth(authUser?: AuthUser | null): number | null {
    if (!authUser?.sub) {
      return null;
    }
    const matched = String(authUser.sub).match(/^admin_(\d+)$/i);
    if (!matched) {
      return null;
    }
    const id = Number(matched[1]);
    return Number.isFinite(id) ? id : null;
  }

  private assertPlatformAdmin(merchantScope: number | null, message = '商户账号无权执行此操作') {
    if (merchantScope != null) {
      throw new ForbiddenException(message);
    }
  }

  private async ensureMerchantAdminRole() {
    await this.prisma.adminRole.upsert({
      where: { code: 'MERCHANT_ADMIN' },
      create: {
        code: 'MERCHANT_ADMIN',
        name: '商户管理员',
        permissionJson: { permissionKeys: [...MERCHANT_ADMIN_PERMISSION_KEYS] },
        status: 1,
      },
      update: {
        name: '商户管理员',
        permissionJson: { permissionKeys: [...MERCHANT_ADMIN_PERMISSION_KEYS] },
        status: 1,
      },
    });
  }

  private findMockImagesDir(): string | null {
    const configured = this.configService.get<string>('MOCK_IMAGES_DIR');
    if (configured && existsSync(configured)) {
      return configured;
    }
    const paths = [
      join(process.cwd(), 'mock_images'),
      join(process.cwd(), '../mock_images'),
      join(process.cwd(), '../../mock_images'),
    ];
    for (const p of paths) {
      if (existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  private getDemoCdnBaseUrl(): string {
    return this.configService.get<string>('DEMO_CDN_BASE_URL', 'https://cdn.example.com').replace(/\/+$/, '');
  }

  private getDemoTraceBaseUrl(): string {
    return this.configService.get<string>('DEMO_TRACE_BASE_URL', 'https://trace.example.com').replace(/\/+$/, '');
  }

  private getDemoQrBaseUrl(): string {
    return this.configService.get<string>('DEMO_QR_BASE_URL', `${this.getDemoCdnBaseUrl()}/qr`).replace(/\/+$/, '');
  }

  private getDemoShareBaseUrl(): string {
    return this.configService.get<string>('DEMO_SHARE_BASE_URL', `${this.getDemoCdnBaseUrl()}/share`).replace(/\/+$/, '');
  }

  toPublicUrl(url: string | null | undefined): string {
    return this.resolvePublicUrl(url) ?? '';
  }

  private resolvePublicUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const bucketName = this.objectStorageService.getBucketName();
    const bucketPrefix = `/${bucketName}`;
    const baseUrl = this.objectStorageService.getPublicBaseUrl().replace(/\/+$/, '');
    const hostBase = baseUrl.endsWith(bucketPrefix) ? baseUrl.slice(0, -bucketPrefix.length) : baseUrl;

    const normalizePath = (pathname: string): string => {
      let path = pathname.startsWith('/') ? pathname : `/${pathname}`;
      while (path.startsWith(`${bucketPrefix}${bucketPrefix}`)) {
        path = path.slice(bucketPrefix.length);
      }
      return path;
    };

    const buildFromPath = (pathname: string): string => {
      const path = normalizePath(pathname);
      if (path.startsWith(`${bucketPrefix}/`) || path === bucketPrefix) {
        return `${hostBase}${path}`;
      }

      return `${hostBase}${bucketPrefix}${path}`;
    };

    if (url.startsWith('/')) {
      return buildFromPath(url);
    }

    const localMatches = [
      'http://127.0.0.1:6004',
      'http://localhost:6004',
      'https://127.0.0.1:6004',
      'https://localhost:6004',
    ];
    for (const match of localMatches) {
      if (url.startsWith(match)) {
        return buildFromPath(url.slice(match.length));
      }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return buildFromPath(`/${url}`);
    }

    try {
      const parsed = new URL(url);
      if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.port === '6004') {
        return buildFromPath(parsed.pathname);
      }
    } catch {
      // ignore invalid URL
    }

    return url;
  }

  private async withSeed(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.seedDemoData();
    }

    try {
      await this.seedPromise;
    } catch (error) {
      this.seedPromise = null;
      throw error;
    }
  }

  private normalizeMobile(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private async ensureMobileAvailable(mobile: string, currentUserId?: bigint | null): Promise<void> {
    const normalizedMobile = this.normalizeMobile(mobile);
    if (!normalizedMobile) {
      return;
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        mobile: normalizedMobile,
        deletedAt: null,
        ...(currentUserId != null ? { id: { not: currentUserId } } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    if (existing) {
      throw new ConflictException('手机号已被其他账号使用');
    }
  }

  private async findActiveUserByMobile(mobile: string) {
    const normalizedMobile = this.normalizeMobile(mobile);
    if (!normalizedMobile) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        mobile: normalizedMobile,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002';
  }

  private async withMobileConflictGuard<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('手机号已被其他账号使用');
      }

      throw error;
    }
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

  private slicePage<T>(items: T[], page: number, pageSize: number): T[] {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.max(pageSize, 1);
    return items.slice((safePage - 1) * safePageSize, safePage * safePageSize);
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

  /** 按 Asia/Shanghai 格式化为 YYYY-MM-DD HH:mm[:ss]，避免 UTC 与编辑时间差 8 小时 */
  private formatChinaDateTime(value: Date | null | undefined, withSeconds = true): string {
    if (!value) {
      return '';
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(value);
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '00';
    const base = `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
    return withSeconds ? `${base}:${pick('second')}` : base;
  }

  /** 无时区的时间字符串按中国时区解析，避免存库偏移 */
  private parseChinaDateTime(value: unknown): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const raw = String(value).trim();
    if (!raw) {
      return null;
    }
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : normalized;
    const parsed = new Date(`${withSeconds}+08:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getChinaYmd(date: Date): { year: number; month: number; day: number; key: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    return {
      year,
      month,
      day,
      key: year * 10000 + month * 100 + day,
    };
  }

  private getChinaDayBounds(dayKey: number): { start: Date; end: Date } | null {
    const key = String(Math.floor(dayKey));
    if (!/^\d{8}$/.test(key)) {
      return null;
    }
    const year = key.slice(0, 4);
    const month = key.slice(4, 6);
    const day = key.slice(6, 8);
    const start = new Date(`${year}-${month}-${day}T00:00:00+08:00`);
    const end = new Date(`${year}-${month}-${day}T23:59:59.999+08:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    return { start, end };
  }

  private buildFlashSaleDayTabs(now = new Date()) {
    const today = this.getChinaYmd(now);
    const tabs: Array<{
      id: number;
      label: string;
      startAt: string;
      endAt: string;
      status: 'ONGOING' | 'UPCOMING' | 'ENDED';
    }> = [];

    const baseNoon = new Date(
      `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}T12:00:00+08:00`,
    );

    for (let offset = 0; offset < 5; offset += 1) {
      const cursor = new Date(baseNoon.getTime() + offset * 24 * 60 * 60 * 1000);
      const ymd = this.getChinaYmd(cursor);
      const bounds = this.getChinaDayBounds(ymd.key);
      if (!bounds) {
        continue;
      }
      tabs.push({
        id: ymd.key,
        label: `${ymd.month}月${ymd.day}日`,
        startAt: bounds.start.toISOString(),
        endAt: bounds.end.toISOString(),
        status: offset === 0 ? 'ONGOING' : 'UPCOMING',
      });
    }

    return tabs;
  }

  private resolveFlashSalePrices(input: {
    activityPrice?: unknown;
    originalPrice?: unknown;
    skuPrice?: unknown;
    skuOriginalPrice?: unknown;
  }) {
    const skuPrice = Number(input.skuPrice ?? 0);
    const skuOriginal = Number(input.skuOriginalPrice ?? 0);
    const formFlash = Number(input.activityPrice ?? 0);
    const formOrigin = Number(input.originalPrice ?? 0);

    const flashPrice = formFlash > 0 ? formFlash : Math.max(skuPrice, 0);
    let originPrice =
      formOrigin > flashPrice
        ? formOrigin
        : skuOriginal > flashPrice
          ? skuOriginal
          : skuPrice > flashPrice
            ? skuPrice
            : formOrigin > 0
              ? formOrigin
              : skuOriginal > 0
                ? skuOriginal
                : Math.max(skuPrice, flashPrice);

    if (originPrice < flashPrice) {
      originPrice = flashPrice;
    }

    return {
      flashPrice: Math.max(flashPrice, 0),
      originPrice: Math.max(originPrice, 0),
    };
  }

  private parseDate(value: unknown): Date | null {
    if (value == null) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    // 活动/后台表单常见本地时间：优先按中国时区解析
    const asChina = this.parseChinaDateTime(value);
    if (asChina) {
      return asChina;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private now(): Date {
    return new Date();
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

  private isPlaceholderBannerUrl(url: string | null | undefined): boolean {
    if (!url) {
      return true;
    }

    return url.includes('cdn.example.com') || url.includes('banner-spring.png') || url.includes('banner-fruit.png');
  }

  private async ensureHomeBannerAssets(): Promise<void> {
    // 保持首页 banner 为固定默认数据，不再根据商品图做动态覆盖。
    // 这能避免 seed 阶段因为商品查询或 Prisma 关系参数不兼容而把整套接口拖成 500。
    return;
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
      context: { merchantId?: number; categoryIds?: number[]; userCreatedAt?: Date; previousLoginAt?: Date | null } = {},
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

  // P0-3: 订单状态机定义
  public static readonly ORDER_STATUS = {
    PENDING: 1,
    ACCEPTED: 2,
    COMPLETED: 3,
    CANCELLED: 4,
  } as const;

  public static readonly PAY_STATUS = {
    UNPAID: 0,
    PAID: 1,
  } as const;

  public static readonly DELIVERY_STATUS = {
    NONE: 0,
    TO_SHIP: 1,
    SHIPPED: 2,
  } as const;

  public static readonly REFUND_STATUS = {
    NONE: 0,
    PENDING_MERCHANT: 1,
    PROCESSING: 2,
    APPROVED: 3,
    REJECTED: 4,
  } as const;

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

  private getAccountScopePrefix(scope: AccountScope): string {
    return scope === 'ADMIN' ? 'A' : 'U';
  }

  private getShanghaiDateKey(date = this.now()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
    const month = parts.find((part) => part.type === 'month')?.value ?? '00';
    const day = parts.find((part) => part.type === 'day')?.value ?? '00';

    return `${year}${month}${day}`;
  }

  private async generateAccountNo(scope: AccountScope): Promise<string> {
    const dateKey = this.getShanghaiDateKey();
    const serial = await this.prisma.accountSerial.upsert({
      where: {
        scope_dateKey: {
          scope,
          dateKey,
        },
      },
      create: {
        scope,
        dateKey,
        lastValue: 1,
      },
      update: {
        lastValue: {
          increment: 1,
        },
      },
    });

    return `${this.getAccountScopePrefix(scope)}${dateKey}${String(serial.lastValue).padStart(4, '0')}`;
  }

  private async backfillUserAccountNo(userId: bigint): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountNo: true },
    });

    if (existing?.accountNo) {
      return existing.accountNo;
    }

    const accountNo = await this.generateAccountNo('USER');
    const result = await this.prisma.user.updateMany({
      where: {
        id: userId,
        accountNo: null,
      },
      data: {
        accountNo,
      },
    });

    if (result.count === 0) {
      const refetched = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { accountNo: true },
      });

      if (refetched?.accountNo) {
        return refetched.accountNo;
      }
    }

    return accountNo;
  }

  private async backfillAdminAccountNo(adminUserId: bigint): Promise<string> {
    const existing = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { accountNo: true },
    });

    if (existing?.accountNo) {
      return existing.accountNo;
    }

    const accountNo = await this.generateAccountNo('ADMIN');
    const result = await this.prisma.adminUser.updateMany({
      where: {
        id: adminUserId,
        accountNo: null,
      },
      data: {
        accountNo,
      },
    });

    if (result.count === 0) {
      const refetched = await this.prisma.adminUser.findUnique({
        where: { id: adminUserId },
        select: { accountNo: true },
      });

      if (refetched?.accountNo) {
        return refetched.accountNo;
      }
    }

    return accountNo;
  }

  private async backfillMissingAccountNumbers(): Promise<void> {
    const missingUsers = await this.prisma.user.findMany({
      where: {
        accountNo: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const user of missingUsers) {
      await this.backfillUserAccountNo(user.id);
    }

    const missingAdmins = await this.prisma.adminUser.findMany({
      where: {
        accountNo: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const admin of missingAdmins) {
      await this.backfillAdminAccountNo(admin.id);
    }
  }

  private isUserFacingRole(role: RoleCode): boolean {
    return role === RoleCode.GUEST || role === RoleCode.USER || role === RoleCode.MERCHANT || role === RoleCode.LEADER;
  }

  private async resolveOptionalUser(authUser?: AuthUser) {
    if (!authUser || !this.isUserFacingRole(authUser.role)) {
      return null;
    }

    return this.ensureUser(authUser);
  }

  private resolveAdminUserId(authUser?: AuthUser): bigint | null {
    if (!authUser || authUser.role !== RoleCode.ADMIN) {
      return null;
    }

    const match = /^admin_(\d+)$/.exec(authUser.sub);
    if (!match) {
      return null;
    }

    return BigInt(match[1]);
  }

  private normalizeAdminRoleCodes(value: unknown): string[] {
    const rawList = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [];

    return Array.from(
        new Set(
            rawList
                .map((item) => String(item ?? '').trim().toUpperCase())
                .filter(Boolean),
        ),
    );
  }

  private mapAdminStatus(status: number): 'NORMAL' | 'DISABLED' {
    return status === 1 ? 'NORMAL' : 'DISABLED';
  }

  private async ensureAdminRoleAssignments(adminUserId: bigint, roleCodes: string[]) {
    if (roleCodes.length === 0) {
      throw new BadRequestException('Role codes are required');
    }

    const roles = await this.prisma.adminRole.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true, code: true },
    });

    const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));
    const missingCodes = roleCodes.filter((code) => !roleIdByCode.has(code));
    if (missingCodes.length > 0) {
      throw new BadRequestException(`Role not found: ${missingCodes.join(', ')}`);
    }

    await this.prisma.adminUserRole.deleteMany({
      where: { adminUserId },
    });

    await this.prisma.adminUserRole.createMany({
      data: roleCodes.map((code) => ({
        adminUserId,
        adminRoleId: roleIdByCode.get(code)!,
      })),
      skipDuplicates: true,
    });
  }

  private isGuestUser(user: { openid: string; mobile?: string | null }): boolean {
    return user.openid.startsWith('guest_') || !String(user.mobile ?? '').trim();
  }

  private async recordAdminOperation(
      authUser: AuthUser | undefined,
      action: string,
      targetType?: string,
      targetId?: bigint | number,
      content?: Prisma.InputJsonValue,
  ) {
    const adminUserId = this.resolveAdminUserId(authUser);
    if (!adminUserId) {
      return;
    }

    await this.prisma.adminOperationLog.create({
      data: {
        adminUserId,
        action,
        targetType: targetType ?? null,
        targetId: typeof targetId === 'number' ? BigInt(targetId) : targetId ?? null,
        content: content ?? undefined,
      },
    });
  }

  private getMerchantOrderStatusLabel(orderStatus: number, deliveryStatus: number, refundStatus?: number): string {
    if (refundStatus === 1 || refundStatus === 2) {
      return '售后中';
    }

    if (orderStatus === 1) {
      return '待接单';
    }

    if (orderStatus === 2) {
      if (deliveryStatus <= 1) {
        return '待发货';
      }
      return '已发货';
    }

    if (orderStatus === 3) {
      return '已完成';
    }

    return '已取消';
  }

  private getUserOrderStatusLabel(orderStatus: number, payStatus: number, deliveryStatus: number, refundStatus: number, expireAt?: Date | null): string {
    if (expireAt != null && expireAt < new Date() && payStatus === 0 && orderStatus === 1) {
      return '已过期';
    }

    if (refundStatus === 3) {
      return '退款成功';
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
    if (expireAt != null && expireAt < new Date() && payStatus === 0 && orderStatus === 1) {
      return 'EXPIRED';
    }

    if (refundStatus === 3) {
      return 'REFUND_SUCCESS';
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

    const isExpired = expireAt != null && expireAt < new Date() && payStatus === 0;
    const isRefunding =
      refundStatus === PlatformDataService.REFUND_STATUS.PENDING_MERCHANT ||
      refundStatus === PlatformDataService.REFUND_STATUS.PROCESSING ||
      refundStatus === PlatformDataService.REFUND_STATUS.APPROVED;

    // 售后中/退款成功后不可再邀请参团
    if (groupBuy?.status === 'OPEN' && payStatus === 1 && !isRefunding) {
      buttons.push({ key: 'invite', label: '邀请好友参团', type: 'primary' });
    }

    // 退款成功：仅可查看订单详情，不再展示物流/收货/售后等操作
    if (refundStatus === PlatformDataService.REFUND_STATUS.APPROVED) {
      return buttons;
    }

    // 售后处理中：只允许取消售后，不再展示申请退款等操作
    if (refundStatus === 1 || refundStatus === 2) {
      buttons.push({ key: 'cancelAfterSale', label: '取消售后', type: 'secondary' });
      return buttons;
    }

    if (orderStatus === 4) {
      return buttons;
    }

    if (orderStatus === PlatformDataService.ORDER_STATUS.COMPLETED) {
      if (deliveryStatus >= PlatformDataService.DELIVERY_STATUS.SHIPPED) {
        buttons.push({ key: 'logistics', label: '查看物流', type: 'secondary' });
      }
      buttons.push({ key: 'refund', label: '申请售后', type: 'secondary' });
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

    if (deliveryStatus === PlatformDataService.DELIVERY_STATUS.TO_SHIP) {
      buttons.push({ key: 'logistics', label: '查看物流', type: 'secondary' });
      buttons.push({ key: 'refund', label: '申请退款', type: 'secondary' });
      return buttons;
    }

    if (deliveryStatus === PlatformDataService.DELIVERY_STATUS.SHIPPED) {
      buttons.push({ key: 'logistics', label: '查看物流', type: 'secondary' });
      buttons.push({ key: 'confirm', label: '确认收货', type: 'primary' });
      buttons.push({ key: 'refund', label: '申请售后', type: 'secondary' });
      return buttons;
    }

    if (orderStatus === 3 || orderStatus === 4) {
      buttons.push({ key: 'refund', label: '申请售后', type: 'secondary' });
    }

    return buttons;
  }

  /**
   * 读时兜底修正拼团状态：数据库里的 status 字段依赖 GroupBuyExpireService 的定时扫描
   * （默认每隔一段时间才会把过期的 OPEN 团标记为 FAILED），在扫描间隔内直接读库会看到
   * 已经过期、但仍显示"进行中"的旧状态。这里在返回给前端之前统一按 expireAt 兜底纠正，
   * 确保任何时刻读到的状态都是准确的，不依赖后台扫描的时间差。
   */
  private resolveGroupBuyStatus(status: string, expireAt: Date): 'OPEN' | 'COMPLETED' | 'FAILED' {
    if (status === 'OPEN' && expireAt.getTime() < Date.now()) {
      return 'FAILED';
    }
    return status as 'OPEN' | 'COMPLETED' | 'FAILED';
  }

  private async getGroupBuyIdsWithActivePaidMembers(groupBuyIds: bigint[]): Promise<Set<string>> {
    if (groupBuyIds.length === 0) {
      return new Set();
    }
    const orders = await this.prisma.order.findMany({
      where: {
        groupBuyId: { in: groupBuyIds },
        payStatus: PlatformDataService.PAY_STATUS.PAID,
        refundStatus: PlatformDataService.REFUND_STATUS.NONE,
        orderStatus: {
          in: [PlatformDataService.ORDER_STATUS.PENDING, PlatformDataService.ORDER_STATUS.ACCEPTED],
        },
      },
      select: { groupBuyId: true },
      distinct: ['groupBuyId'],
    });
    return new Set(orders.map((o) => o.groupBuyId!.toString()));
  }

  private shouldFailOpenGroupBuyDueToRefunds(
    paidOrders: Array<{ refundStatus: number; orderStatus: number }>,
  ): boolean {
    const hasRefundApplying = paidOrders.some(
      (o) =>
        o.refundStatus === PlatformDataService.REFUND_STATUS.PENDING_MERCHANT ||
        o.refundStatus === PlatformDataService.REFUND_STATUS.PROCESSING ||
        o.refundStatus === PlatformDataService.REFUND_STATUS.APPROVED,
    );
    const hasActivePaid = paidOrders.some(
      (o) =>
        o.refundStatus === PlatformDataService.REFUND_STATUS.NONE &&
        (o.orderStatus === PlatformDataService.ORDER_STATUS.PENDING ||
          o.orderStatus === PlatformDataService.ORDER_STATUS.ACCEPTED),
    );
    return hasRefundApplying && !hasActivePaid;
  }

  private async getOrderGroupBuySummary(groupBuyId: bigint | null | undefined) {
    if (groupBuyId == null) {
      return null;
    }
    const group = await this.prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            isInitiator: true,
            joinedAt: true,
            user: { select: { nickname: true, avatarUrl: true } },
          },
          orderBy: [{ isInitiator: 'desc' }, { joinedAt: 'asc' }],
        },
        product: { select: { id: true, title: true, coverUrl: true } },
      },
    });
    if (!group) {
      return null;
    }
    let status = this.resolveGroupBuyStatus(group.status, group.expireAt);
    if (group.status === 'OPEN' && status === 'OPEN') {
      const paidOrders = await this.prisma.order.findMany({
        where: { groupBuyId: group.id, payStatus: PlatformDataService.PAY_STATUS.PAID },
        select: { refundStatus: true, orderStatus: true },
      });
      if (this.shouldFailOpenGroupBuyDueToRefunds(paidOrders)) {
        await this.prisma.groupBuy
          .updateMany({
            where: { id: group.id, status: 'OPEN' },
            data: { status: 'FAILED' },
          })
          .catch(() => undefined);
        status = 'FAILED';
      }
    }
    return {
      groupId: this.toNumber(group.id),
      groupNo: group.groupNo,
      inviteCode: group.inviteCode,
      status,
      needed: group.needed,
      memberCount: group.members.length,
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
        nickname: m.user?.nickname || '',
        avatarUrl: this.resolvePublicUrl(m.user?.avatarUrl ?? null) ?? '',
      })),
    };
  }

  private getAdminOrderStatusLabel(orderStatus: number, deliveryStatus?: number, payStatus?: number): string {
    if (orderStatus === 4) {
      return '已取消';
    }

    if (orderStatus === 3) {
      return '已完成';
    }

    // 已支付：按物流进度展示，避免 orderStatus 仍为待接单(1) 时误显示「待支付」
    if (payStatus === 1) {
      if (deliveryStatus != null && deliveryStatus >= 2) {
        return '已发货';
      }
      return '待发货';
    }

    if (orderStatus === 1 || payStatus === 0) {
      return '待支付';
    }

    if (orderStatus === 2) {
      if (deliveryStatus != null && deliveryStatus >= 2) {
        return '已发货';
      }
      return '待发货';
    }

    return '已取消';
  }

  private getRefundStatusLabel(status: number): string {
    if (status === 3) {
      return 'APPROVED';
    }

    if (status === 4) {
      return 'REJECTED';
    }

    if (status === 2) {
      return 'MERCHANT_REPLIED';
    }

    return 'PENDING_ARBITRATION';
  }

  private getRefundStatusText(status: number): string {
    if (status === 3) {
      return '已通过';
    }

    if (status === 4) {
      return '已驳回';
    }

    if (status === 2) {
      return '商家已回复';
    }

    return '待审核';
  }

  private normalizeRefundImages(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((url) => this.resolvePublicUrl(url) ?? url);
  }

  async notifyUserRefundResult(params: {
    userId: bigint | number;
    refundNo: string;
    orderNo: string;
    approved: boolean;
    refundAmount: string;
    applyReason?: string | null;
    remark?: string | null;
  }) {
    const title = params.approved ? '退款成功' : '退款申请已驳回';
    const remarkText = String(params.remark ?? '').trim();
    const rawSummary = params.approved
      ? `订单 ${params.orderNo} 退款 ¥${params.refundAmount} 已处理完成，款项将原路退回`
      : `订单 ${params.orderNo} 的退款申请未通过${remarkText ? `，原因：${remarkText}` : ''}`;
    const summary = rawSummary.length > 255 ? `${rawSummary.slice(0, 252)}...` : rawSummary;

    const message = await this.prisma.systemMessage.create({
      data: {
        type: 'NOTIFICATION',
        title,
        summary,
        contentType: 'TEXT',
        contentJson: {
          refundNo: params.refundNo,
          orderNo: params.orderNo,
          approved: params.approved,
          refundAmount: params.refundAmount,
          applyReason: params.applyReason ?? null,
          remark: remarkText || null,
          processedAt: this.now().toISOString(),
        } as Prisma.InputJsonValue,
        senderType: 'SYSTEM',
        bizType: 'REFUND',
        bizId: params.refundNo,
        publishAt: this.now(),
        status: 'PUBLISHED',
      },
    });

    await this.prisma.userMessage.create({
      data: {
        userId: BigInt(params.userId),
        messageId: message.id,
        isRead: false,
        deliveredAt: this.now(),
      },
    });
  }

  private getWithdrawStatusLabel(status: number): string {
    if (status === 2) {
      return 'APPROVED';
    }

    if (status === 3) {
      return 'REJECTED';
    }

    return 'PENDING_AUDIT';
  }

  private getCouponAdminStatusLabel(status: string): 'ENABLED' | 'DISABLED' | 'DRAFT' {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (normalized === 'DISABLED') {
      return 'DISABLED';
    }
    if (normalized === 'DRAFT') {
      return 'DRAFT';
    }
    return 'ENABLED';
  }

  private parseCouponRule(body: Record<string, unknown>) {
    const categoryIds = Array.isArray(body.categoryIds)
      ? body.categoryIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : String(body.categoryIds ?? '')
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((id) => Number.isFinite(id) && id > 0);
    const merchantIds = Array.isArray(body.merchantIds)
      ? body.merchantIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : String(body.merchantIds ?? '')
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((id) => Number.isFinite(id) && id > 0);
    const type = String(body.type ?? 'CASHBACK').trim().toUpperCase() || 'CASHBACK';
    const defaultUserRuleType = type === 'NEW_USER'
      ? 'NEW_USER'
      : type === 'RETURNING_USER'
        ? 'RETURNING_USER'
        : 'ALL';
    const userRuleRaw = body.userRule && typeof body.userRule === 'object' && !Array.isArray(body.userRule)
      ? (body.userRule as Record<string, unknown>)
      : {};
    const userRuleType = String(userRuleRaw.type ?? userRuleRaw.audience ?? body.userRuleType ?? defaultUserRuleType).trim().toUpperCase() || defaultUserRuleType;
    const newUserDays = Math.max(Number(userRuleRaw.newUserDays ?? body.newUserDays ?? 7) || 7, 1);
    const inactiveDays = Math.max(Number(userRuleRaw.inactiveDays ?? body.inactiveDays ?? 30) || 30, 1);
    const autoIssue = userRuleRaw.autoIssue == null && body.autoIssue == null
      ? userRuleType !== 'ALL'
      : Boolean(userRuleRaw.autoIssue ?? body.autoIssue);

    return {
      scope: String(body.scope ?? 'ALL').trim().toUpperCase() || 'ALL',
      perUserLimit: Math.max(Number(body.perUserLimit ?? 1) || 1, 1),
      validStartAt: this.parseDate(body.validStartAt),
      validEndAt: this.parseDate(body.validEndAt),
      ruleJson: {
        ...(body.ruleJson && typeof body.ruleJson === 'object' ? (body.ruleJson as Record<string, unknown>) : {}),
        ...(categoryIds.length ? { categoryIds } : {}),
        ...(merchantIds.length ? { merchantIds } : {}),
        ...(userRuleType !== 'ALL'
          ? {
              userRule: {
                type: userRuleType,
                newUserDays,
                inactiveDays,
                autoIssue,
              },
            }
          : {}),
      } as Prisma.InputJsonValue,
    };
  }

  private validateCouponRuleConfig(coupon: {
    scope: string;
    ruleJson?: Prisma.JsonValue | Prisma.InputJsonValue | null;
  }) {
    const rule = this.getCouponRuleData(coupon as { scope: string; ruleJson?: Prisma.JsonValue | null });
    if (rule.scope === 'SHOP' && rule.merchantIds.length === 0) {
      throw new BadRequestException('店铺券必须至少选择一个店铺');
    }
    if ((rule.scope === 'CATEGORY' || rule.scope === 'PRODUCT') && rule.categoryIds.length === 0) {
      throw new BadRequestException('类目券必须至少选择一个类目');
    }
    if (rule.scope === 'CATEGORY_SHOP') {
      if (rule.categoryIds.length === 0) {
        throw new BadRequestException('类目店铺券必须至少选择一个类目');
      }
      if (rule.merchantIds.length === 0) {
        throw new BadRequestException('类目店铺券必须至少选择一个店铺');
      }
    }
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

  async getMerchantEntryStatus() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'merchantEntryEnabled' },
      select: { value: true },
    });
    const enabled = String(setting?.value ?? 'true') !== 'false';
    return { enabled };
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

  /**
   * 按实付金额发放订单积分（幂等：同一订单号只会发放一次）。
   * 默认 earnRate=1，即支付 1 元返还 1 积分。
   */
  private async awardOrderEarnPoints(
    client: Prisma.TransactionClient | PrismaService,
    params: {
      userId: bigint;
      orderNo: string;
      payAmount: Prisma.Decimal | number;
      remark?: string;
    },
  ) {
    const existing = await client.pointLog.findFirst({
      where: {
        userId: params.userId,
        sourceNo: params.orderNo,
        changeType: 'EARN',
        sourceType: 'ORDER',
      },
      select: { id: true },
    });
    if (existing) {
      return 0;
    }

    const pointRule = await this.getPointRuleConfig();
    const points = Math.max(Math.floor(Number(params.payAmount) * pointRule.earnRate), 0);
    if (points <= 0) {
      return 0;
    }

    await client.pointLog.create({
      data: {
        userId: params.userId,
        changeType: 'EARN',
        points,
        sourceType: 'ORDER',
        sourceNo: params.orderNo,
        remark: params.remark ?? '订单支付奖励',
      },
    });
    return points;
  }

  /** 退款/拼团失败时扣回该订单已发放的支付奖励积分（幂等）。 */
  private async clawBackOrderEarnPoints(
    tx: Prisma.TransactionClient,
    params: { userId: bigint; orderNo: string; remark: string },
  ) {
    const earnLog = await tx.pointLog.findFirst({
      where: {
        userId: params.userId,
        sourceNo: params.orderNo,
        changeType: 'EARN',
        sourceType: 'ORDER',
      },
      select: { points: true },
    });
    if (!earnLog) {
      return;
    }

    const earnPoints = Math.abs(Number(earnLog.points));
    if (earnPoints <= 0) {
      return;
    }

    const alreadyClawed = await tx.pointLog.findFirst({
      where: {
        userId: params.userId,
        sourceNo: params.orderNo,
        changeType: 'DEDUCT',
        sourceType: 'ORDER',
        remark: params.remark,
      },
      select: { id: true },
    });
    if (alreadyClawed) {
      return;
    }

    await tx.pointLog.create({
      data: {
        userId: params.userId,
        changeType: 'DEDUCT',
        points: -earnPoints,
        sourceType: 'ORDER',
        sourceNo: params.orderNo,
        remark: params.remark,
      },
    });
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

  private async finalizeLoggedInUser<T extends { id: bigint; createdAt: Date; accountNo?: string | null; lastLoginAt?: Date | null }>(
      user: T,
      previousLoginAt?: Date | null,
  ) {
    const normalizedUser = user.accountNo
      ? user
      : {
          ...user,
          accountNo: await this.backfillUserAccountNo(user.id),
        };

    await this.grantLifecycleCouponsForUser(normalizedUser, previousLoginAt);
    return normalizedUser;
  }

  private async grantLifecycleCouponsForUser(
      user: { id: bigint; createdAt: Date; lastLoginAt?: Date | null },
      previousLoginAt?: Date | null,
  ) {
    const coupons = await this.prisma.coupon.findMany({
      where: {
        deletedAt: null,
        status: 'ENABLED',
        type: { in: ['NEW_USER', 'RETURNING_USER'] },
      },
      orderBy: [{ id: 'asc' }],
    });

    for (const coupon of coupons) {
      const rule = this.getCouponRuleData(coupon as { scope: string; ruleJson?: Prisma.JsonValue | null });
      if (!rule.autoIssue) {
        continue;
      }
      if (!this.isCouponUserLifecycleEligible(coupon, user, previousLoginAt)) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.userCoupon.findUnique({
          where: {
            userId_couponId: {
              userId: user.id,
              couponId: coupon.id,
            },
          },
        });

        if (existing) {
          return;
        }

        const updated = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            deletedAt: null,
            status: 'ENABLED',
            issuedStock: { lt: coupon.stock },
          },
          data: { issuedStock: { increment: 1 } },
        });

        if (updated.count === 0) {
          return;
        }

        await tx.userCoupon.create({
          data: {
            userId: user.id,
            couponId: coupon.id,
            status: 'RECEIVED',
            sourceType: coupon.type,
            expiredAt: coupon.validEndAt ?? null,
          },
        });
      });
    }
  }

  async resolveWechatPhoneNumberForLogin(phoneCode: string): Promise<string> {
    return this.wechatAuthService.resolveWechatPhoneNumberForLogin(phoneCode);
  }

  async resolveWechatSmsPhoneNumberForLogin(phoneCode: string): Promise<string> {
    return this.wechatAuthService.resolveWechatSmsPhoneNumberForLogin(phoneCode);
  }

  async seedDemoData(): Promise<void> {
    const uploadCategoryIcon = async (name: string, svgContent: string) => {
      try {
        const uploadResult = await this.objectStorageService.uploadPublicObject({
          buffer: Buffer.from(svgContent, 'utf8'),
          fileName: `category-${name.replace(/\//g, '_')}.svg`,
          mimeType: 'image/svg+xml',
          folder: 'categories',
        });
        return uploadResult.url;
      } catch (e: any) {
        this.logger.error(`Failed to upload category icon ${name}: ${e.message}`);
        return '';
      }
    };

    // 1. Seed Categories (Parent & Child Categories dynamically)
    const parentCategories = [
      {
        name: '海鲜水产',
        sortOrder: 1,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E3F2FD"/><g transform="translate(32, 32) scale(2.66)"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="#1565C0" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="#1565C0"/><path d="M16 8l4-3M16 16l4 3" fill="none" stroke="#1565C0" stroke-width="1.8" stroke-linecap="round"/></g></svg>'
      },
      {
        name: '时令果蔬',
        sortOrder: 2,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E8F5E9"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 21a6 6 0 0 0 6-6c0-4-3-7-6-7s-6 3-6 7a6 6 0 0 0 6 6z" fill="none" stroke="#2C4A39" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8A4 4 0 0 1 8 12" fill="none" stroke="#2C4A39" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4l-4 4" fill="none" stroke="#2C4A39" stroke-width="1.8" stroke-linecap="round"/></g></svg>'
      },
      {
        name: '肉禽蛋奶',
        sortOrder: 3,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FFF3E0"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 4c-3 0-6 3-6 8 0 4 3 8 6 8s6-4 6-8c0-5-3-8-6-8z" fill="none" stroke="#E65100" stroke-width="1.8"/><path d="M9 10h6M10 14h4" fill="none" stroke="#E65100" stroke-width="1.8" stroke-linecap="round"/></g></svg>'
      },
      {
        name: '日用百货',
        sortOrder: 4,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E3F2FD"/><g transform="translate(32, 32) scale(2.66)"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="none" stroke="#1565C0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 6h18" fill="none" stroke="#1565C0" stroke-width="1.8"/><path d="M16 10a4 4 0 0 1-8 0" fill="none" stroke="#1565C0" stroke-width="1.8"/></g></svg>'
      },
      {
        name: '粮油干货',
        sortOrder: 5,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FFF8E1"/><g transform="translate(32, 32) scale(2.66)"><path d="M3 12h18" fill="none" stroke="#FF8F00" stroke-width="1.8"/><path d="M12 3v9" fill="none" stroke="#FF8F00" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12a8 8 0 0 0 8 8H4a8 8 0 0 0 8-8z" fill="none" stroke="#FF8F00" stroke-width="1.8" stroke-linejoin="round"/></g></svg>'
      },
      {
        name: '特产礼盒',
        sortOrder: 6,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FCE4EC"/><g transform="translate(32, 32) scale(2.66)"><rect x="3" y="11" width="18" height="10" rx="2" fill="none" stroke="#C2185B" stroke-width="1.8"/><path d="M12 2v18" fill="none" stroke="#C2185B" stroke-width="1.8"/><path d="M3 11h18" fill="none" stroke="#C2185B" stroke-width="1.8"/><path d="M12 7a2.5 2.5 0 1 0-2.5-2.5" fill="none" stroke="#C2185B" stroke-width="1.8" stroke-linecap="round"/><path d="M12 7a2.5 2.5 0 1 1 2.5-2.5" fill="none" stroke="#C2185B" stroke-width="1.8" stroke-linecap="round"/></g></svg>'
      },
    ];

    const subCategories = [
      {
        name: '调味品',
        parentName: '粮油干货',
        sortOrder: 1,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E0F7FA"/><g transform="translate(32, 32) scale(2.66)"><path d="M9 3h6M10 3v3m4-3v3M6 9h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" fill="none" stroke="#006064" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6h4v3h-4z" fill="none" stroke="#006064" stroke-width="1.8"/></g></svg>'
      },
      {
        name: '米/面/粉/杂粮',
        parentName: '粮油干货',
        sortOrder: 2,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#F3E5F5"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 3L6 12h12z" fill="none" stroke="#4A148C" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 12h20" fill="none" stroke="#4A148C" stroke-width="1.8"/><path d="M12 12a8 8 0 0 1-8 8h16a8 8 0 0 1-8-8z" fill="none" stroke="#4A148C" stroke-width="1.8"/><path d="M16 2l-6 10" fill="none" stroke="#4A148C" stroke-width="1.8"/></g></svg>'
      },
      {
        name: '南北干货',
        parentName: '粮油干货',
        sortOrder: 3,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#EFEBE9"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9z" fill="none" stroke="#3E2723" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 12v7a2 2 0 0 0 4 0v-7" fill="none" stroke="#3E2723" stroke-width="1.8" stroke-linecap="round"/></g></svg>'
      },
      {
        name: '即食海参',
        parentName: '特产礼盒',
        sortOrder: 1,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E0F2F1"/><g transform="translate(32, 32) scale(2.66)"><path d="M3 12s4-8 9-8s9 8 9 8s-4 8-9 8s-9-8-9-8z" fill="none" stroke="#004D40" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="12" r="1.5" fill="#004D40"/><path d="M21 12l2 2v-4z" fill="none" stroke="#004D40" stroke-width="1.8"/></g></svg>'
      },
      {
        name: '查干臻品',
        parentName: '特产礼盒',
        sortOrder: 2,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FFF3E0"/><g transform="translate(32, 32) scale(2.66)"><path d="M3 12c4-5 9-6 13-3s3 9-1 11s-9 0-12-8z" fill="none" stroke="#E65100" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9c3 0 4-2 3-3" fill="none" stroke="#E65100" stroke-width="1.8"/><path d="M16 12l4 4v-8z" fill="none" stroke="#E65100" stroke-width="1.8"/></g></svg>'
      },
    ];

    this.logger.log('Ensuring client parent/sub categories...');
    const parentMap = new Map<string, any>();

    for (const pCat of parentCategories) {
      const iconUrl = await uploadCategoryIcon(pCat.name, pCat.svg);
      let cat = await this.prisma.category.findFirst({ where: { name: pCat.name, parentId: null } });
      if (!cat) {
        cat = await this.prisma.category.create({
          data: { name: pCat.name, sortOrder: pCat.sortOrder, iconUrl, status: 1 },
        });
      } else {
        cat = await this.prisma.category.update({
          where: { id: cat.id },
          data: { iconUrl, sortOrder: pCat.sortOrder, status: 1 },
        });
      }
      parentMap.set(pCat.name, cat);
    }

    for (const sCat of subCategories) {
      const parent = parentMap.get(sCat.parentName);
      if (!parent) continue;
      const iconUrl = await uploadCategoryIcon(sCat.name, sCat.svg);
      const exists = await this.prisma.category.findFirst({ where: { name: sCat.name, parentId: parent.id } });
      if (!exists) {
        await this.prisma.category.create({
          data: { name: sCat.name, parentId: parent.id, sortOrder: sCat.sortOrder, iconUrl, status: 1 },
        });
      } else {
        await this.prisma.category.update({
          where: { id: exists.id },
          data: { iconUrl, sortOrder: sCat.sortOrder },
        });
      }
    }


    const user = await this.prisma.user.upsert({
      where: { openid: 'seed-user-openid' },
      create: {
        accountNo: await this.generateAccountNo('USER'),
        openid: 'seed-user-openid',
        nickname: '示例用户',
        mobile: '13800000000',
        status: 1,
      },
      update: {},
    });

    await this.prisma.userAddress.upsert({
      where: {
        id: BigInt(1),
      },
      create: {
        userId: user.id,
        receiverName: '示例用户',
        receiverMobile: '13800000000',
        province: '广东',
        city: '深圳',
        district: '南山',
        detailAddress: '示例路 1 号',
        isDefault: true,
      },
      update: {},
    }).catch(() => undefined);

    const merchant = await this.ensurePlatformMerchant();

    await this.prisma.merchantWallet.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        availableBalance: new Prisma.Decimal('1832.50'),
        frozenBalance: new Prisma.Decimal('500.00'),
        totalIncome: new Prisma.Decimal('6200.00'),
        totalWithdrawn: new Prisma.Decimal('4367.50'),
      },
      update: {},
    });

    const guestUser = await this.prisma.user.upsert({
      where: { openid: 'guest_demo' },
      create: {
        accountNo: await this.generateAccountNo('USER'),
        openid: 'guest_demo',
        nickname: '游客用户',
        mobile: '13000000000',
        status: 1,
      },
      update: {},
    });

    const guestAddressCount = await this.prisma.userAddress.count({
      where: { userId: guestUser.id, deletedAt: null },
    });
    if (guestAddressCount === 0) {
      await this.prisma.userAddress.create({
        data: {
          userId: guestUser.id,
          receiverName: '游客用户',
          receiverMobile: '13000000000',
          province: '广东',
          city: '深圳',
          district: '南山',
          detailAddress: '湾源县示例路 88 号',
          isDefault: true,
        },
      });
    }

    // 2. Seed/sync Products from client_products.json（按 skuCode 幂等；已有商品刷新富文本详情）
    const productCount = await this.prisma.product.count();
    {
      this.logger.log('Syncing client products from client_products.json...');
      const mockDir = this.findMockImagesDir();

      const uploadImage = async (relPath: string) => {
        if (!mockDir) return '';
        const fullPath = join(mockDir, relPath);
        if (existsSync(fullPath)) {
          try {
            const ext = extname(relPath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            const uploadResult = await this.objectStorageService.uploadPublicObject({
              buffer: readFileSync(fullPath),
              fileName: basename(relPath),
              mimeType,
              folder: 'products',
            });
            return uploadResult.url;
          } catch (e: any) {
            this.logger.error(`Failed to upload seed image ${relPath}: ${e.message}`);
          }
        }
        return '';
      };

      const uploadVideo = async (relPath: string) => {
        if (!mockDir) return '';
        const fullPath = join(mockDir, relPath);
        if (existsSync(fullPath)) {
          try {
            const uploadResult = await this.objectStorageService.uploadPublicObject({
              buffer: readFileSync(fullPath),
              fileName: basename(relPath),
              mimeType: 'video/mp4',
              folder: 'products',
            });
            return uploadResult.url;
          } catch (e: any) {
            this.logger.error(`Failed to upload seed video ${relPath}: ${e.message}`);
          }
        }
        return '';
      };

      const jsonPath = join(process.cwd(), '../client_products.json');
      if (existsSync(jsonPath)) {
        const jsonStr = readFileSync(jsonPath, 'utf8');
        const seeds = JSON.parse(jsonStr);
        const defaultOriginsByCategory: Record<string, string[]> = {
          时令果蔬: ['云南昭通', '山东寿光', '广西南宁', '海南琼海'],
          肉禽蛋奶: ['黑龙江哈尔滨', '内蒙古通辽', '河北邢台', '四川成都'],
          海鲜水产: ['辽宁大连', '浙江舟山', '山东青岛', '福建霞浦'],
          粮油干货: ['黑龙江牡丹江', '河南周口', '山东临沂', '安徽亳州'],
          特产礼盒: ['黑龙江牡丹江', '福建厦门', '云南普洱', '四川成都'],
        };
        const defaultOriginPool = ['云南昭通', '黑龙江牡丹江', '山东寿光', '广西南宁', '福建厦门', '四川成都'];
        let seedIndex = 0;
        let createdCount = 0;
        let updatedCount = 0;
        const uploadedPathMap = new Map<string, string>();

        const uploadCached = async (relPath: string) => {
          const key = String(relPath || '').trim();
          if (!key) return '';
          if (uploadedPathMap.has(key)) {
            return uploadedPathMap.get(key) || '';
          }
          const url = await uploadImage(key);
          uploadedPathMap.set(key, url);
          return url;
        };

        const rewriteDetailDesc = (html: string | undefined, pathMap: Map<string, string>) => {
          const raw = String(html || '');
          if (!raw) return '';
          return raw.replace(/src=(["'])([^"']+)\1/gi, (full, quote: string, src: string) => {
            const mapped = pathMap.get(src) || (src.startsWith('http') ? src : '');
            if (!mapped) return full;
            return `src=${quote}${mapped}${quote}`;
          });
        };

        const pickFallbackOrigin = (seed: { categoryName?: string; subCategoryName?: string; title?: string; originPlace?: string }) => {
          const explicit = String(seed.originPlace ?? '').trim();
          if (explicit) {
            return explicit;
          }

          const categoryKey = String(seed.subCategoryName || seed.categoryName || '').trim();
          const pool = defaultOriginsByCategory[categoryKey] || defaultOriginPool;
          const title = String(seed.title ?? '');
          const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), seedIndex);
          return pool[hash % pool.length] || defaultOriginPool[seedIndex % defaultOriginPool.length] || '产地直供';
        };

        for (const seed of seeds) {
          let category = null;
          if (seed.subCategoryName) {
            category = await this.prisma.category.findFirst({ where: { name: seed.subCategoryName } });
          }
          if (!category) {
            category = await this.prisma.category.findFirst({ where: { name: seed.categoryName } });
          }
          if (!category) {
            category = await this.prisma.category.findFirst();
          }
          if (!category) continue;

          const pathMap = new Map<string, string>();
          let coverUrl = '';
          if (seed.coverUrl) {
            coverUrl = await uploadCached(seed.coverUrl);
            if (coverUrl) pathMap.set(seed.coverUrl, coverUrl);
          }

          const imageUrls: string[] = [];
          if (Array.isArray(seed.images)) {
            for (const imgPath of seed.images) {
              const url = await uploadCached(imgPath);
              if (url) {
                imageUrls.push(url);
                pathMap.set(imgPath, url);
              }
            }
          }

          let videoUrl = '';
          if (seed.videoUrl) {
            videoUrl = await uploadVideo(seed.videoUrl);
          }

          const detailDesc = rewriteDetailDesc(seed.detailDesc, pathMap) || seed.detailDesc || null;
          const skuCode = seed.skuCode || '';
          const existingSku = skuCode
            ? await this.prisma.productSku.findFirst({ where: { skuCode } })
            : null;

          if (existingSku) {
            await this.prisma.product.update({
              where: { id: existingSku.productId },
              data: {
                title: seed.title,
                subtitle: seed.subtitle,
                coverUrl: coverUrl || undefined,
                detailDesc,
                originPlace: pickFallbackOrigin(seed),
                brand: seed.brand || null,
                supplierName: seed.supplierName || null,
                ingredients: seed.ingredients || null,
                shelfLife: seed.shelfLife || null,
                productionDate: seed.productionDate || null,
                material: seed.material || null,
                dimensions: seed.dimensions || null,
                leadTime: seed.leadTime || null,
                shippingRestrictedRegions: seed.shippingRestrictedRegions || null,
                afterSalesCommitment: seed.afterSalesCommitment || null,
                logisticsCompany: seed.logisticsCompany || null,
                productNature: seed.productNature || null,
                categoryId: category.id,
              },
            });
            if (imageUrls.length > 0) {
              await this.prisma.productImage.deleteMany({ where: { productId: existingSku.productId } });
              await this.prisma.productImage.createMany({
                data: imageUrls.map((url, idx) => ({
                  productId: existingSku.productId,
                  imageUrl: url,
                  sortOrder: idx + 1,
                })),
              });
            }
            updatedCount += 1;
            seedIndex += 1;
            continue;
          }

          const createdProduct = await this.prisma.product.create({
            data: {
              merchantId: merchant.id,
              categoryId: category.id,
              title: seed.title,
              subtitle: seed.subtitle,
              coverUrl: coverUrl || null,
              detailDesc,
              originPlace: pickFallbackOrigin(seed),
              deliveryType: 1,
              status: 1,
              auditStatus: 2,
              isPreSale: false,
              isHot: seed.title.includes('海参') || seed.title.includes('胖头鱼'),
              brand: seed.brand || null,
              supplierName: seed.supplierName || null,
              ingredients: seed.ingredients || null,
              shelfLife: seed.shelfLife || null,
              productionDate: seed.productionDate || null,
              material: seed.material || null,
              dimensions: seed.dimensions || null,
              leadTime: seed.leadTime || null,
              shippingRestrictedRegions: seed.shippingRestrictedRegions || null,
              afterSalesCommitment: seed.afterSalesCommitment || null,
              logisticsCompany: seed.logisticsCompany || null,
              productNature: seed.productNature || null,
              liveCities: seed.liveCities || null,
              sessionAttribute: seed.sessionAttribute || null,
              liveMechanism: seed.liveMechanism || null,
            },
          });
          seedIndex += 1;
          createdCount += 1;

          const originalPriceDecimal = seed.originalPrice ? new Prisma.Decimal(seed.originalPrice) : new Prisma.Decimal(seed.price);
          const offlinePriceDecimal = seed.offlinePrice ? new Prisma.Decimal(seed.offlinePrice) : null;
          const createdSku = await this.prisma.productSku.create({
            data: {
              productId: createdProduct.id,
              skuName: seed.skuName || '默认规格',
              skuCode: seed.skuCode || `SKU${createdProduct.id.toString()}1`,
              price: new Prisma.Decimal(seed.price),
              originalPrice: originalPriceDecimal,
              offlinePrice: offlinePriceDecimal,
              stock: seed.stock,
              lockedStock: 0,
              safetyStock: seed.safetyStock || null,
              status: 1,
            },
          });

          if (imageUrls.length > 0) {
            await this.prisma.productImage.createMany({
              data: imageUrls.map((url, idx) => ({
                productId: createdProduct.id,
                imageUrl: url,
                sortOrder: idx + 1,
              })),
            });
          }

          if (videoUrl) {
            await this.prisma.productVideo.create({
              data: {
                productId: createdProduct.id,
                videoUrl: videoUrl,
                coverUrl: coverUrl || null,
                sortOrder: 1,
              },
            });
          }

          await this.prisma.productTrace.create({
            data: {
              productId: createdProduct.id,
              traceCode: `TRACE${createdProduct.id.toString()}`,
              traceDesc: seed.ingredients ? `配料符合国家标准：${seed.ingredients}` : '产品通过出厂安全质检',
              traceJson: {
                traceCode: `TRACE${createdProduct.id.toString()}`,
                skuId: createdSku.id.toString(),
              },
            },
          });
        }
        this.logger.log(`Synced products from JSON: created=${createdCount}, updated=${updatedCount}, totalSeeds=${seeds.length}.`);
      }
    }

    if (productCount === 0) {
      await this.prisma.banner.createMany({
        data: scaffoldBanners.map((banner) => ({
          title: banner.title,
          imageUrl: banner.imageUrl,
          linkType: banner.linkType,
          linkId: BigInt(Number(banner.linkId)),
          sortOrder: banner.sortOrder,
          status: banner.status,
        })),
      }).catch(() => undefined);

      await this.prisma.activity.createMany({
        data: scaffoldAdminActivities.map((activity) => ({
          activityName: activity.activityName,
          activityType: activity.activityType,
          status: activity.status,
          startAt: activity.startAt ? new Date(activity.startAt.replace(' ', 'T') + ':00.000Z') : null,
          endAt: activity.endAt ? new Date(activity.endAt.replace(' ', 'T') + ':00.000Z') : null,
          productCount: activity.productCount,
        })),
      }).catch(() => undefined);

      await this.prisma.coupon.createMany({
        data: scaffoldCoupons.map((coupon) => ({
          name: coupon.name,
          type: coupon.type,
          thresholdAmount: new Prisma.Decimal(coupon.thresholdAmount),
          discountAmount: new Prisma.Decimal(coupon.discountAmount),
          stock: coupon.stock,
          issuedStock: coupon.issuedStock,
          status: coupon.received ? 'ENABLED' : 'ENABLED',
        })),
      }).catch(() => undefined);

      await this.prisma.logisticsRule.createMany({
        data: scaffoldLogisticsRules.map((rule) => ({
          name: rule.name,
          province: rule.province,
          thresholdAmount: new Prisma.Decimal(rule.thresholdAmount),
          freightAmount: new Prisma.Decimal(rule.freightAmount),
          active: rule.active,
        })),
      }).catch(() => undefined);

      await this.prisma.systemSetting.createMany({
        data: [
          { key: 'siteName', value: '湾源农仓运营管理后台' },
          { key: 'customerServiceHotline', value: '400-800-2026' },
          { key: 'platformOfficialMerchantName', value: DEFAULT_PLATFORM_OFFICIAL_MERCHANT_NAME },
          { key: 'auditMode', value: 'STRICT' },
          { key: 'pointsRedeemEnabled', value: 'true' },
          { key: 'pointsEarnRate', value: '1' },
          { key: 'pointsRedeemRate', value: '100' },
          { key: 'merchantEntryEnabled', value: 'true' },
        ],
      }).catch(() => undefined);

      await this.prisma.systemSetting.upsert({
        where: { key: 'platformSupportMerchantId' },
        create: { key: 'platformSupportMerchantId', value: this.toNumber(merchant.id).toString() },
        update: { value: this.toNumber(merchant.id).toString() },
      }).catch(() => undefined);

      await this.prisma.favorite.createMany({
        data: [
          {
            userId: user.id,
            productId: (await this.prisma.product.findFirst({ where: { title: '云南高山苹果' } }))?.id ?? (await this.prisma.product.findFirst())?.id ?? BigInt(0),
          },
        ].filter((item) => item.productId !== BigInt(0)),
      }).catch(() => undefined);

      await this.prisma.userCoupon.createMany({
        data: [
          {
            userId: user.id,
            couponId: (await this.prisma.coupon.findFirst({ where: { name: '新人立减券' } }))?.id ?? BigInt(0),
            status: 'RECEIVED',
          },
        ].filter((item) => item.couponId !== BigInt(0)),
      }).catch(() => undefined);

      await this.prisma.pointLog.createMany({
        data: scaffoldPointsLogs.map((log, index) => ({
          userId: user.id,
          changeType: log.changeType,
          points: log.points,
          sourceType: log.sourceType,
          sourceNo: log.sourceNo,
          remark: log.remark,
          createdAt: new Date(log.createdAt),
        })),
      }).catch(() => undefined);

      const demoProduct = await this.prisma.product.findFirst({
        where: { title: '云南高山苹果' },
        include: { skus: true, merchant: true },
      }) || await this.prisma.product.findFirst({
        include: { skus: true, merchant: true },
      });

      if (demoProduct && (await this.prisma.order.count()) === 0) {
        const demoSku = demoProduct.skus[0];
        const orderNo = scaffoldOrders[0]?.orderNo ?? `NO${randomUUID().replace(/-/g, '').slice(0, 12)}`;
        const order = await this.prisma.order.create({
          data: {
            orderNo,
            userId: user.id,
            merchantId: demoProduct.merchantId,
            addressSnapshot: {
              receiverName: user.nickname ?? '示例用户',
              receiverMobile: user.mobile ?? '13800000000',
              province: '广东',
              city: '深圳',
              district: '南山',
              detailAddress: '示例路 1 号',
            },
            goodsAmount: new Prisma.Decimal('79.80'),
            freightAmount: new Prisma.Decimal('0.00'),
            discountAmount: new Prisma.Decimal('0.00'),
            payAmount: new Prisma.Decimal('79.80'),
            orderStatus: 3,
            payStatus: 1,
            deliveryStatus: 2,
            refundStatus: 0,
            paidAt: this.now(),
            completedAt: this.now(),
            remark: '示例订单',
            items: {
              create: {
                productId: demoProduct.id,
                skuId: demoSku?.id ?? BigInt(0),
                productTitle: demoProduct.title,
                skuName: demoSku?.skuName ?? '默认规格',
                productImage: demoProduct.coverUrl,
                unitPrice: new Prisma.Decimal('39.90'),
                quantity: 2,
                lineAmount: new Prisma.Decimal('79.80'),
              },
            },
          },
          include: { items: true },
        });

        await this.prisma.paymentRecord.create({
          data: {
            payNo: `PAY${randomUUID().replace(/-/g, '').slice(0, 12)}`,
            orderNo: order.orderNo,
            orderId: order.id,
            userId: user.id,
            payChannel: 1,
            amount: order.payAmount,
            payStatus: 1,
            paidAt: this.now(),
          },
        });

        await this.prisma.deliveryRecord.create({
          data: {
            orderId: order.id,
            merchantId: demoProduct.merchantId,
            logisticsCompany: '默认物流',
            trackingNo: `DL${randomUUID().replace(/-/g, '').slice(0, 12)}`,
            deliveryStatus: 2,
            shippedAt: this.now(),
            deliveredAt: this.now(),
          },
        });

        await this.prisma.leaderBinding.createMany({
          data: [
            {
              userId: user.id,
              leaderId: BigInt(100),
              bindingNo: `LB${randomUUID().replace(/-/g, '').slice(0, 12)}`,
              status: 'BOUND',
            },
          ],
        }).catch(() => undefined);

        await this.prisma.leaderCommission.createMany({
          data: scaffoldLeaderCommissions.map((item) => ({
            userId: user.id,
            orderNo: item.orderNo,
            commissionAmount: new Prisma.Decimal(item.commissionAmount),
            status: item.status,
            remark: item.remark,
            boundLeaderId: BigInt(100),
          })),
        }).catch(() => undefined);

        if ((await this.prisma.refundApply.count()) === 0 && demoSku) {
          await this.prisma.refundApply.create({
            data: {
              refundNo: scaffoldAdminRefunds[0]?.refundNo ?? `RF${randomUUID().replace(/-/g, '').slice(0, 12)}`,
              orderId: order.id,
              orderItemId: order.items[0].id,
              userId: user.id,
              merchantId: demoProduct.merchantId,
              applyType: 1,
              applyReason: '不想要了',
              applyImages: [],
              refundAmount: new Prisma.Decimal('20.00'),
              status: 1,
            },
          });
        }
      }
    }

    const roleCount = await this.prisma.role.count();
    if (roleCount === 0) {
      await this.prisma.role.createMany({
        data: [
          { code: 'GUEST', name: '游客' },
          { code: 'USER', name: '普通用户' },
          { code: 'MERCHANT', name: '商家/农户' },
          { code: 'ADMIN', name: '管理员' },
        ],
      });
    }

    if ((await this.prisma.flashSaleWindow.count()) === 0) {
      const now = new Date();
      // 滚动生成：从当前整点 - 30min 开始，每 2h 一场，到次日 06:00 截止
      const firstStart = new Date(now);
      firstStart.setMinutes(0, 0, 0);
      firstStart.setMinutes(firstStart.getMinutes() - 30);
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + 1);
      cutoff.setHours(6, 0, 0, 0);

      let sortOrder = 1;
      let skipOffset = 0;
      let cursor = new Date(firstStart);
      while (cursor < cutoff) {
        const startAt = new Date(cursor);
        const endAt = new Date(cursor);
        endAt.setHours(endAt.getHours() + 2);
        const hh = String(startAt.getHours()).padStart(2, '0');

        const created = await this.prisma.flashSaleWindow.create({
          data: {
            label: `${hh}:00 限时秒杀`,
            startAt,
            endAt,
            sortOrder: sortOrder++,
            status: 'UPCOMING',
          },
        });
        const candidates = await this.prisma.product.findMany({
          where: { status: 1, auditStatus: 2, deletedAt: null },
          include: { skus: { orderBy: { id: 'asc' } } },
          take: 4,
          orderBy: { id: 'asc' },
          skip: skipOffset,
        });
        skipOffset += 4;
        for (const product of candidates) {
          const sku = product.skus[0];
          if (!sku) continue;
          const originPrice = Number(sku.price);
          if (originPrice <= 0) continue;
          const totalStock = Math.min(Number(sku.stock) || 50, 100);
          await this.prisma.flashSaleItem.create({
            data: {
              windowId: created.id,
              productId: product.id,
              skuId: sku.id,
              flashPrice: new Prisma.Decimal((originPrice * 0.6).toFixed(2)),
              originPrice: new Prisma.Decimal(originPrice.toFixed(2)),
              totalStock,
              stockLeft: totalStock,
              perUserLimit: 2,
            },
          });
        }
        cursor = endAt;
      }
    }

    if ((await this.prisma.groupBuy.count()) === 0) {
      const candidates = await this.prisma.product.findMany({
        where: { status: 1, auditStatus: 2, deletedAt: null },
        include: { skus: { orderBy: { id: 'asc' } } },
        take: 4,
        orderBy: { id: 'asc' },
      });
      const areaLabels = ['城东', '城西', '城南', '城北'];
      const now = new Date();
      let areaIdx = 0;
      for (const product of candidates) {
        const sku = product.skus[0];
        if (!sku) continue;
        const originPrice = Number(sku.price);
        if (originPrice <= 0) continue;
        const groupPrice = Number((originPrice * 0.7).toFixed(2));
        const needed = 3;
        const expireAt = new Date(now.getTime() + 18 * 60 * 60 * 1000);
        const roughArea = `${areaLabels[areaIdx % areaLabels.length]}附近`;
        areaIdx += 1;
        const group = await this.prisma.groupBuy.create({
          data: {
            groupNo: `GB${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
            productId: product.id,
            skuId: sku.id,
            initiatorId: user.id,
            groupPrice: new Prisma.Decimal(groupPrice.toFixed(2)),
            originPrice: new Prisma.Decimal(originPrice.toFixed(2)),
            needed,
            status: 'OPEN',
            expireAt,
            roughArea,
            latitude: new Prisma.Decimal((30.5 + areaIdx * 0.01).toFixed(6)),
            longitude: new Prisma.Decimal((114.3 + areaIdx * 0.01).toFixed(6)),
          },
        });
        await this.prisma.groupBuyMember.create({
          data: { groupId: group.id, userId: user.id, isInitiator: true },
        });
      }
    }

    const admin = await this.prisma.adminUser.upsert({
      where: { username: 'admin' },
      create: {
        accountNo: await this.generateAccountNo('ADMIN'),
        username: 'admin',
        passwordHash: this.hashPassword('admin123456'),
        loginPassword: 'admin123456',
        nickname: '平台管理员',
        mobile: '13800000001',
        status: 1,
      },
      update: {
        loginPassword: 'admin123456',
      },
    });

    const adminRoleSeedCount = await this.prisma.adminRole.count();
    if (adminRoleSeedCount === 0) {
      await this.prisma.adminRole.createMany({
        data: [
          { code: 'ADMIN', name: '平台管理员', status: 1 },
          { code: 'OPERATOR', name: '运营', status: 1 },
          { code: 'AUDITOR', name: '审核员', status: 1 },
          { code: 'CS', name: '客服', status: 1 },
          {
            code: 'MERCHANT_ADMIN',
            name: '商户管理员',
            permissionJson: { permissionKeys: [...MERCHANT_ADMIN_PERMISSION_KEYS] },
            status: 1,
          },
        ],
      });
    }

    await this.ensureMerchantAdminRole();

    const adminRole = await this.prisma.adminRole.findUnique({ where: { code: 'ADMIN' } });
    if (adminRole) {
      await this.prisma.adminUserRole.upsert({
        where: {
          adminUserId_adminRoleId: {
            adminUserId: admin.id,
            adminRoleId: adminRole.id,
          },
        },
        create: {
          adminUserId: admin.id,
          adminRoleId: adminRole.id,
        },
        update: {},
      });
    }

    const [bannerCount, activityCount, couponCount, exchangeCouponCount, logisticsCount, settingCount, operationLogCount, pointLogCount, leaderCommissionCount, cartCount] =
        await Promise.all([
          this.prisma.banner.count(),
          this.prisma.activity.count(),
          this.prisma.coupon.count(),
          this.prisma.coupon.count({ where: { type: 'CASHBACK', deletedAt: null } }),
          this.prisma.logisticsRule.count(),
          this.prisma.systemSetting.count(),
          this.prisma.adminOperationLog.count(),
          this.prisma.pointLog.count({ where: { userId: guestUser.id } }),
          this.prisma.leaderCommission.count({ where: { userId: user.id } }),
          this.prisma.cartItem.count({ where: { userId: guestUser.id } }),
        ]);

    await this.backfillMissingAccountNumbers();

    if (bannerCount === 0) {
      let bannerUrl1 = `${this.getDemoCdnBaseUrl()}/banner-spring.png`;
      let bannerUrl2 = `${this.getDemoCdnBaseUrl()}/banner-fruit.png`;

      const mockDir = this.findMockImagesDir();
      if (mockDir) {
        try {
          const bannerPath = join(mockDir, 'banner_farm_fresh.png');
          const orangePath = join(mockDir, 'product_orange.png');

          if (existsSync(bannerPath)) {
            const bannerResult = await this.objectStorageService.uploadPublicObject({
              buffer: readFileSync(bannerPath),
              fileName: 'banner_spring.png',
              mimeType: 'image/png',
              folder: 'banners',
            });
            bannerUrl1 = bannerResult.url;
          }

          if (existsSync(orangePath)) {
            const orangeResult = await this.objectStorageService.uploadPublicObject({
              buffer: readFileSync(orangePath),
              fileName: 'banner_fruit.png',
              mimeType: 'image/png',
              folder: 'banners',
            });
            bannerUrl2 = orangeResult.url;
          }
        } catch (e: any) {
          this.logger.error(`Failed to upload seed banner images: ${e.message}`);
        }
      }

      await this.prisma.banner.createMany({
        data: [
          {
            title: '春季产地直发',
            imageUrl: bannerUrl1,
            linkType: 'activity',
            linkId: BigInt(1),
            sortOrder: 1,
            status: 'ENABLED',
          },
          {
            title: '新鲜水果专场',
            imageUrl: bannerUrl2,
            linkType: 'product',
            linkId: BigInt(1),
            sortOrder: 2,
            status: 'ENABLED',
          },
        ],
      });
    }

    await this.ensureHomeBannerAssets();

    if (activityCount === 0) {
      await this.prisma.activity.createMany({
        data: [
          {
            activityName: '限时秒杀',
            activityType: 'SECKILL',
            status: 'RUNNING',
            startAt: new Date('2026-06-07T10:00:00+08:00'),
            endAt: new Date('2026-06-07T22:00:00+08:00'),
            productCount: 8,
          },
          {
            activityName: '周末拼团',
            activityType: 'GROUP_BUY',
            status: 'DRAFT',
            startAt: new Date('2026-06-08T09:00:00+08:00'),
            endAt: new Date('2026-06-10T23:00:00+08:00'),
            productCount: 5,
          },
        ],
      });
    }

    if (couponCount === 0) {
      await this.prisma.coupon.createMany({
        data: [
          {
            name: '满39减10',
            type: 'FULL_REDUCTION',
            thresholdAmount: new Prisma.Decimal('39.00'),
            discountAmount: new Prisma.Decimal('10.00'),
            stock: 200,
            issuedStock: 48,
            status: 'ENABLED',
          },
          {
            name: '满79减20',
            type: 'FULL_REDUCTION',
            thresholdAmount: new Prisma.Decimal('79.00'),
            discountAmount: new Prisma.Decimal('20.00'),
            stock: 150,
            issuedStock: 32,
            status: 'ENABLED',
          },
          {
            name: '满129减30',
            type: 'FULL_REDUCTION',
            thresholdAmount: new Prisma.Decimal('129.00'),
            discountAmount: new Prisma.Decimal('30.00'),
            stock: 100,
            issuedStock: 15,
            status: 'ENABLED',
          },
        ],
      });
    }

    if (exchangeCouponCount === 0) {
      await this.prisma.coupon.createMany({
        data: [
          {
            name: '积分兑换 10 元券',
            type: 'CASHBACK',
            thresholdAmount: new Prisma.Decimal('0.00'),
            discountAmount: new Prisma.Decimal('10.00'),
            stock: 300,
            issuedStock: 26,
            scope: 'ALL',
            perUserLimit: 1,
            ruleJson: {
              exchangeKind: 'COUPON',
            },
            status: 'ENABLED',
          },
          {
            name: '积分兑换 20 元专区券',
            type: 'CASHBACK',
            thresholdAmount: new Prisma.Decimal('59.00'),
            discountAmount: new Prisma.Decimal('20.00'),
            stock: 200,
            issuedStock: 11,
            scope: 'CATEGORY',
            perUserLimit: 1,
            ruleJson: {
              exchangeKind: 'PRODUCT',
            },
            status: 'ENABLED',
          },
        ],
      });
    }

    if (logisticsCount === 0) {
      await this.prisma.logisticsRule.createMany({
        data: [
          {
            name: '同城冷链配送',
            province: '广东',
            thresholdAmount: new Prisma.Decimal('88.00'),
            freightAmount: new Prisma.Decimal('0.00'),
            active: true,
          },
          {
            name: '跨省标准配送',
            province: '全国',
            thresholdAmount: new Prisma.Decimal('99.00'),
            freightAmount: new Prisma.Decimal('8.00'),
            active: true,
          },
        ],
      });
    }

    if (settingCount === 0) {
      await this.prisma.systemSetting.createMany({
        data: [
          { key: 'siteName', value: '湾源农仓运营管理后台' },
          { key: 'customerServiceHotline', value: '400-800-2026' },
          { key: 'platformOfficialMerchantName', value: DEFAULT_PLATFORM_OFFICIAL_MERCHANT_NAME },
          { key: 'auditMode', value: 'STRICT' },
          { key: 'pointsRedeemEnabled', value: 'true' },
          { key: 'pointsEarnRate', value: '1' },
          { key: 'pointsRedeemRate', value: '100' },
        ],
      });

      const officialMerchant = await this.ensurePlatformMerchant();
      await this.prisma.systemSetting.upsert({
        where: { key: 'platformSupportMerchantId' },
        create: { key: 'platformSupportMerchantId', value: this.toNumber(officialMerchant.id).toString() },
        update: { value: this.toNumber(officialMerchant.id).toString() },
      }).catch(() => undefined);
    }

    if (operationLogCount === 0) {
      await this.prisma.adminOperationLog.createMany({
        data: [
          {
            adminUserId: admin.id,
            action: 'LOGIN',
            targetType: '系统',
            content: { note: '管理员初始化登录' },
          },
          {
            adminUserId: admin.id,
            action: 'AUDIT_PRODUCT',
            targetType: '商品管理',
            targetId: BigInt(1),
            content: { result: 'APPROVED' },
          },
        ],
      });
    }

    if (pointLogCount === 0) {
      await this.prisma.pointLog.createMany({
        data: [
          {
            userId: guestUser.id,
            changeType: 'INCREASE',
            points: 128,
            sourceType: 'ORDER',
            sourceNo: 'NO202606070001',
            remark: '下单奖励',
          },
          {
            userId: guestUser.id,
            changeType: 'INCREASE',
            points: 80,
            sourceType: 'REGISTER',
            sourceNo: 'REG202606070001',
            remark: '新用户注册奖励',
          },
        ],
      });
    }

    if (leaderCommissionCount === 0) {
      await this.prisma.leaderCommission.createMany({
        data: [
          {
            userId: user.id,
            orderNo: 'NO202606070001',
            commissionAmount: new Prisma.Decimal('8.30'),
            status: 'PENDING_SETTLEMENT',
            remark: '订单分佣',
          },
          {
            userId: user.id,
            orderNo: 'NO202606070006',
            commissionAmount: new Prisma.Decimal('12.60'),
            status: 'SETTLED',
            remark: '已结算',
          },
        ],
      });
    }

    if (cartCount === 0) {
      const firstProduct = await this.prisma.product.findFirst({
        include: { skus: true, merchant: true },
        orderBy: { id: 'asc' },
      });
      const secondProduct = await this.prisma.product.findMany({
        include: { skus: true, merchant: true },
        orderBy: { id: 'asc' },
        skip: 1,
        take: 1,
      });

      if (firstProduct?.skus[0]) {
        await this.prisma.cartItem.create({
          data: {
            userId: guestUser.id,
            merchantId: firstProduct.merchantId,
            productId: firstProduct.id,
            skuId: firstProduct.skus[0].id,
            quantity: 1,
            checked: true,
          },
        });
      }

      if (secondProduct[0]?.skus[0]) {
        await this.prisma.cartItem.create({
          data: {
            userId: guestUser.id,
            merchantId: secondProduct[0].merchantId,
            productId: secondProduct[0].id,
            skuId: secondProduct[0].skus[0].id,
            quantity: 2,
            checked: true,
          },
        });
      }
    }
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private resolvePasswordHash(password: string, passwordHashed = false): string {
    const value = String(password ?? '').trim();
    if (passwordHashed || /^[a-f0-9]{64}$/i.test(value)) {
      return value.toLowerCase();
    }
    return this.hashPassword(value);
  }

  async ensureUser(authUser: AuthUser) {
    if (!authUser || !this.isUserFacingRole(authUser.role)) {
      throw new UnauthorizedException('Admin session cannot access user data');
    }

    const defaultNickname = authUser.role === RoleCode.GUEST
        ? '游客用户'
        : buildFallbackNickname(authUser.sub, '微信用户');

    const existingUser = await this.prisma.user.findUnique({
      where: { openid: authUser.sub },
    });

    if (existingUser) {
      if (existingUser.status !== 1) {
        throw new ForbiddenException('User account is disabled');
      }
      const previousLoginAt = existingUser.lastLoginAt ?? null;

      const updatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastLoginAt: this.now(),
        },
      });

      if (updatedUser.accountNo) {
        return this.finalizeLoggedInUser(updatedUser, previousLoginAt);
      }

      const accountNo = await this.backfillUserAccountNo(updatedUser.id);
      return this.finalizeLoggedInUser({
        ...updatedUser,
        accountNo,
      }, previousLoginAt);
    }

    if (authUser.role !== RoleCode.GUEST) {
      throw new UnauthorizedException('User session has expired or account has been deleted');
    }

    const user = await this.prisma.user.create({
      data: {
        accountNo: await this.generateAccountNo('USER'),
        openid: authUser.sub,
        nickname: defaultNickname,
        status: 1,
        lastLoginAt: this.now(),
      },
    });

    if (user.accountNo) {
      if (!user.lastLoginAt) {
        await this.prisma.user.updateMany({
          where: {
            id: user.id,
            lastLoginAt: null,
          },
          data: {
            lastLoginAt: this.now(),
          },
        });
      }

      return this.finalizeLoggedInUser(user, null);
    }

    const accountNo = await this.backfillUserAccountNo(user.id);
    return this.finalizeLoggedInUser({
      ...user,
      accountNo,
    }, null);
  }

  async getUserDBRole(userId: bigint): Promise<RoleCode> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const hasMerchant = roles.some((r) => r.role.code === 'MERCHANT');
    if (hasMerchant) {
      return RoleCode.MERCHANT;
    }

    const approvedLeader = await this.prisma.communityLeader.findFirst({
      where: { userId, status: 'APPROVED', deletedAt: null },
      select: { id: true },
    });
    if (approvedLeader) {
      return RoleCode.LEADER;
    }

    return RoleCode.USER;
  }

  async getUserAllRoles(userId: bigint): Promise<RoleCode[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleCodes = new Set(roles.map((r) => r.role.code as RoleCode));
    const hasMerchant = roleCodes.has(RoleCode.MERCHANT);
    const hasLeader = roleCodes.has(RoleCode.LEADER);

    // USER is the default role; include it unless the user only holds merchant/leader admin-only roles
    // with no explicit USER record. To keep switch UX simple, always expose USER when the user is not
    // exclusively a merchant/leader context without the user role.
    if (!roleCodes.has(RoleCode.USER) && !hasMerchant && !hasLeader) {
      roleCodes.add(RoleCode.USER);
    }

    // Ensure derived roles are also represented so the frontend can switch.
    if (hasMerchant) {
      roleCodes.add(RoleCode.MERCHANT);
    }
    const approvedLeader = await this.prisma.communityLeader.findFirst({
      where: { userId, status: 'APPROVED', deletedAt: null },
      select: { id: true },
    });
    if (approvedLeader) {
      roleCodes.add(RoleCode.LEADER);
    }

    return Array.from(roleCodes);
  }

  async getUserProfile(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: user.id },
    });

    return {
      userId: this.toNumber(user.id),
      accountNo: user.accountNo ?? '',
      openid: user.openid,
      nickname: resolveProfileNickname(
          user.nickname,
          user.openid,
          authUser.role === RoleCode.GUEST ? '游客用户' : '微信用户',
      ),
      avatarUrl: this.resolvePublicUrl(resolveProfileText(user.avatarUrl, '')) ?? '',
      mobile: resolveProfileText(user.mobile, ''),
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      merchantStatus: merchant ? (merchant.status === 1 ? 'APPROVED' : (merchant.status === 3 ? 'REJECTED' : 'PENDING_AUDIT')) : 'NOT_APPLIED',
    };
  }

  async updateUserProfile(authUser: AuthUser, body: Record<string, unknown>) {
    await this.withSeed();

    if (authUser.role !== RoleCode.USER && authUser.role !== RoleCode.MERCHANT && authUser.role !== RoleCode.LEADER) {
      throw new UnauthorizedException('Guest session cannot update profile');
    }

    const displayName = String(body.displayName ?? body.nickname ?? '').trim();
    const rawAvatarUrl = String(body.avatarUrl ?? '').trim();
    const contactMobile = String(body.contactMobile ?? body.mobile ?? '').trim();
    const contactName = String(body.contactName ?? '').trim();
    const avatarUrl = /^https?:\/\//i.test(rawAvatarUrl) ? rawAvatarUrl : '';

    if (!displayName && !avatarUrl && !contactMobile && !contactName) {
      throw new BadRequestException('Profile fields are required');
    }

    const user = await this.ensureUser(authUser);
    await this.ensureMobileAvailable(contactMobile, user.id);
    const updatedUser = await this.withMobileConflictGuard(() =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            ...(displayName ? { nickname: displayName } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
            ...(contactMobile ? { mobile: contactMobile } : {}),
          },
        }),
    );

    if (authUser.role === RoleCode.MERCHANT) {
      const existingMerchant = await this.prisma.merchant.findUnique({
        where: { userId: user.id },
      });
      if (existingMerchant) {
        await this.prisma.merchant.update({
          where: { userId: user.id },
          data: {
            ...(displayName ? { storeName: displayName } : {}),
            ...(avatarUrl ? { storeLogo: avatarUrl } : {}),
            ...(contactName ? { contactName } : {}),
            ...(contactMobile ? { contactMobile } : {}),
          },
        });
      } else {
        await this.prisma.merchant.create({
          data: {
            userId: user.id,
            storeName: displayName || `${updatedUser.nickname ?? '默认商户'}店铺`,
            storeLogo: avatarUrl || null,
            contactName: contactName || updatedUser.nickname || '联系人',
            contactMobile: contactMobile || updatedUser.mobile || '13800000000',
            status: 2,
          },
        });
      }
    }

    return {
      userId: this.toNumber(updatedUser.id),
      accountNo: updatedUser.accountNo ?? '',
      openid: updatedUser.openid,
      nickname: resolveProfileNickname(
          updatedUser.nickname,
          updatedUser.openid,
          '微信用户',
      ),
      avatarUrl: this.resolvePublicUrl(resolveProfileText(updatedUser.avatarUrl, '')) ?? '',
      mobile: resolveProfileText(updatedUser.mobile, ''),
      status: updatedUser.status,
      lastLoginAt: updatedUser.lastLoginAt ? updatedUser.lastLoginAt.toISOString() : '',
    };
  }

  async ensureCurrentMerchant(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);
    const merchant = await this.prisma.merchant.findUnique({ where: { userId: user.id } });

    if (merchant) {
      await this.prisma.merchantWallet.upsert({
        where: { merchantId: merchant.id },
        create: {
          merchantId: merchant.id,
          availableBalance: new Prisma.Decimal('0.00'),
          frozenBalance: new Prisma.Decimal('0.00'),
          totalIncome: new Prisma.Decimal('0.00'),
          totalWithdrawn: new Prisma.Decimal('0.00'),
        },
        update: {},
      });

      return merchant;
    }

    const newMerchant = await this.prisma.merchant.create({
      data: {
        userId: user.id,
        storeName: `${user.nickname ?? '默认商户'}店铺`,
        contactName: user.nickname ?? '联系人',
        contactMobile: user.mobile ?? '13800000000',
        status: 2,
      },
    });

    await this.prisma.merchantWallet.upsert({
      where: { merchantId: newMerchant.id },
      create: {
        merchantId: newMerchant.id,
        availableBalance: new Prisma.Decimal('0.00'),
        frozenBalance: new Prisma.Decimal('0.00'),
        totalIncome: new Prisma.Decimal('0.00'),
        totalWithdrawn: new Prisma.Decimal('0.00'),
      },
      update: {},
    });

    return newMerchant;
  }

  private async ensurePlatformMerchant() {
    const officialMerchantNameSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'platformOfficialMerchantName' },
    });
    const officialMerchantName = resolveProfileText(
        officialMerchantNameSetting?.value,
        DEFAULT_PLATFORM_OFFICIAL_MERCHANT_NAME,
    );

    const platformUser = await this.prisma.user.upsert({
      where: { openid: 'platform_merchant' },
      create: {
        accountNo: await this.generateAccountNo('USER'),
        openid: 'platform_merchant',
        nickname: officialMerchantName,
        mobile: '19900000000',
        status: 1,
      },
      update: {
        nickname: officialMerchantName,
        mobile: '19900000000',
        status: 1,
      },
    });

    const merchant = await this.prisma.merchant.upsert({
      where: { userId: platformUser.id },
      create: {
        userId: platformUser.id,
        storeName: officialMerchantName,
        storeLogo: `${this.getDemoCdnBaseUrl()}/store-logo.png`,
        contactName: '平台管理员',
        contactMobile: '19900000000',
        status: 1,
      },
      update: {
        storeName: officialMerchantName,
        contactName: '平台管理员',
        contactMobile: '19900000000',
        status: 1,
      },
    });

    await this.prisma.merchantWallet.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        availableBalance: new Prisma.Decimal('0.00'),
        frozenBalance: new Prisma.Decimal('0.00'),
        totalIncome: new Prisma.Decimal('0.00'),
        totalWithdrawn: new Prisma.Decimal('0.00'),
      },
      update: {},
    });

    return merchant;
  }

  async upsertWechatUser(body: Record<string, unknown>) {
    await this.withSeed();

    const code = String(body.code ?? body.loginCode ?? '').trim();
    if (!code) {
      throw new BadRequestException('Wechat login code is required');
    }

    const session = await this.wechatAuthService.resolveWechatCodeSession(code);
    const openid = session.openid;
    const nickname = resolveProfileNickname(body.nickName, openid, '微信用户');
    const avatarUrl = resolveProfileText(body.avatarUrl, '');
    const mobile = resolveProfileText(body.mobile, '');
    const existingUser = await this.prisma.user.findUnique({
      where: { openid },
    });

    if (existingUser && existingUser.status !== 1) {
      throw new ForbiddenException('User account is disabled');
    }

    if (existingUser) {
      const mobileOwner = await this.findActiveUserByMobile(mobile);
      const canWriteMobile = !mobileOwner || mobileOwner.id === existingUser.id;
      const previousLoginAt = existingUser.lastLoginAt ?? null;
      return this.withMobileConflictGuard(() =>
          this.prisma.user
              .update({
                where: { id: existingUser.id },
                data: {
                  nickname,
                  ...(avatarUrl ? { avatarUrl } : {}),
                  ...(mobile && canWriteMobile ? { mobile } : {}),
                  lastLoginAt: this.now(),
                },
              })
              .then(async (user) => this.finalizeLoggedInUser(user, previousLoginAt)),
      );
    }

    const accountNo = await this.generateAccountNo('USER');
    return this.withMobileConflictGuard(() =>
        this.prisma.user
            .create({
              data: {
                accountNo,
                openid,
                nickname,
                ...(avatarUrl ? { avatarUrl } : {}),
                ...(mobile ? { mobile } : {}),
                status: 1,
                lastLoginAt: this.now(),
              },
            })
            .then(async (user) => this.finalizeLoggedInUser(user, null)),
    );
  }

  async upsertPhoneLoginUser(body: Record<string, unknown>) {
    await this.withSeed();

    const mobile = String(body.mobile ?? body.phone ?? body.phoneNumber ?? '').trim();
    if (!mobile) {
      throw new BadRequestException('Mobile number is required');
    }

    const nickname = resolveProfileNickname(body.nickName ?? body.nickname, mobile, '手机号用户');
    const avatarUrl = resolveProfileText(body.avatarUrl, '');
    const existingUsers = await this.prisma.user.findMany({
      where: { mobile, deletedAt: null },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
    });
    const existingUser = existingUsers.find((user) => user.status === 1) ?? existingUsers[0];

    if (existingUsers.length > 1) {
      this.logger.warn(`Duplicate active mobile records detected for ${mobile}; using user ${existingUser ? String(existingUser.id) : 'none'}`);
    }

    if (existingUser) {
      if (existingUser.status !== 1) {
        throw new ForbiddenException('User account is disabled');
      }
      const previousLoginAt = existingUser.lastLoginAt ?? null;

      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          nickname,
          ...(avatarUrl ? { avatarUrl } : {}),
          mobile,
          lastLoginAt: this.now(),
        },
      }).then(async (user) => {
        if (user.accountNo) {
          return this.finalizeLoggedInUser(user, previousLoginAt);
        }

        const accountNo = await this.backfillUserAccountNo(user.id);
        return this.finalizeLoggedInUser({
          ...user,
          accountNo,
        }, previousLoginAt);
      });
    }

    const accountNo = await this.generateAccountNo('USER');
    try {
      return await this.prisma.user
          .create({
            data: {
              accountNo,
              openid: `phone_${mobile}`,
              nickname,
              ...(avatarUrl ? { avatarUrl } : {}),
              mobile,
              status: 1,
              lastLoginAt: this.now(),
            },
          })
          .then(async (user) => {
            if (user.accountNo) {
              return this.finalizeLoggedInUser(user, null);
            }

            const backfilledAccountNo = await this.backfillUserAccountNo(user.id);
            return this.finalizeLoggedInUser({
              ...user,
              accountNo: backfilledAccountNo,
            }, null);
          });
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        const fallbackUser = await this.findActiveUserByMobile(mobile);
        if (fallbackUser) {
          const previousLoginAt = fallbackUser.lastLoginAt ?? null;
          return this.withMobileConflictGuard(() =>
              this.prisma.user
                  .update({
                    where: { id: fallbackUser.id },
                    data: {
                      nickname,
                      ...(avatarUrl ? { avatarUrl } : {}),
                      lastLoginAt: this.now(),
                    },
                  })
                  .then(async (user) => this.finalizeLoggedInUser(user, previousLoginAt)),
          );
        }
      }

      throw error;
    }
  }

  async bindWechatPhone(body: Record<string, unknown>) {
    await this.withSeed();

    const loginCode = String(body.loginCode ?? body.code ?? '').trim();
    if (!loginCode) {
      throw new BadRequestException('Wechat login code is required');
    }

    const phoneCode = String(body.phoneCode ?? body.phoneNumberCode ?? '').trim();
    if (!phoneCode) {
      throw new BadRequestException('Phone verification code is required');
    }

    const mobile = await this.wechatAuthService.resolveWechatPhoneNumberForLogin(phoneCode);
    const session = await this.wechatAuthService.resolveWechatCodeSession(loginCode);
    const openid = session.openid;
    const avatarUrl = resolveProfileText(body.avatarUrl, '');
    const nickname = resolveProfileText(body.nickName ?? body.nickname, '');
    let user = await this.prisma.user.findUnique({ where: { openid } });

    // 开发态或异常情况下，login 与 bind 可能短暂拿不到同一用户；
    // 找不到时按 openid 自动建号，避免 phone-bind 直接 404。
    if (!user) {
      user = await this.upsertWechatUser({ loginCode, nickName: '微信用户' });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 1) {
      throw new ForbiddenException('User account is disabled');
    }

    const existingMobileOwner = await this.prisma.user.findFirst({
      where: {
        mobile,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    if (existingMobileOwner && existingMobileOwner.status !== 1) {
      throw new ForbiddenException('User account is disabled');
    }

    if (existingMobileOwner && existingMobileOwner.id !== user.id) {
      const previousLoginAt = existingMobileOwner.lastLoginAt ?? null;
      return this.withMobileConflictGuard(() =>
          this.prisma.user
              .update({
                where: { id: existingMobileOwner.id },
                data: {
                  ...(avatarUrl ? { avatarUrl } : {}),
                  ...(nickname ? { nickname } : {}),
                  lastLoginAt: this.now(),
                },
              })
              .then(async (updatedUser) => this.finalizeLoggedInUser(updatedUser, previousLoginAt)),
      );
    }

    const previousLoginAt = user.lastLoginAt ?? null;
    return this.withMobileConflictGuard(() =>
        this.prisma.user
            .update({
              where: { id: user.id },
              data: {
                ...(mobile ? { mobile } : {}),
                ...(avatarUrl ? { avatarUrl } : {}),
                ...(nickname ? { nickname } : {}),
                lastLoginAt: this.now(),
              },
            })
            .then(async (updatedUser) => this.finalizeLoggedInUser(updatedUser, previousLoginAt)),
    );
  }

  async getHomeBanners() {
    await this.withSeed();
    const now = this.now();

    const banners = await this.prisma.banner.findMany({
      where: {
        deletedAt: null,
        status: 'ENABLED',
        AND: [
          {
            OR: [{ startAt: null }, { startAt: { lte: now } }],
          },
          {
            OR: [{ endAt: null }, { endAt: { gte: now } }],
          },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return banners.map((banner) => ({
      id: this.toNumber(banner.id),
      title: banner.title,
      imageUrl: this.resolvePublicUrl(banner.imageUrl) ?? '',
      linkType: banner.linkType,
      linkId: banner.linkId != null ? this.toNumber(banner.linkId) : null,
      startAt: this.toIso(banner.startAt),
      endAt: this.toIso(banner.endAt),
      sortOrder: banner.sortOrder,
      status: banner.status,
    }));
  }

  async getHomeQuickEntries() {
    return [
      { id: 1, title: '限时秒杀', icon: 'flash', linkType: 'flashSale', linkId: 1 },
      { id: 2, title: '拼团专区', icon: 'group', linkType: 'groupBuy', linkId: 2 },
      { id: 3, title: '礼盒专区', icon: 'gift', linkType: 'gift', linkId: 3 },
      { id: 4, title: '产地直供', icon: 'origin', linkType: 'origin', linkId: 4 },
    ];
  }

  private defaultProductServiceTags(deliveryType?: number | null): ProductServiceTagView[] {
    const tags: ProductServiceTagView[] = [
      {
        key: 'badFruit',
        title: '坏果包赔',
        desc: '签收后如遇坏果可申请售后处理',
        icon: 'shield',
      },
    ];

    tags.push(
        Number(deliveryType ?? 1) === 2
            ? {
              key: 'coldChain',
              title: '冷链直发',
              desc: '冷链仓发货，尽量保证商品鲜度',
              icon: 'truck',
            }
            : {
              key: 'originDirect',
              title: '产地直发',
              desc: '源头产地打包后尽快安排发货',
              icon: 'truck',
            },
    );

    return tags;
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
    const expireHours = Math.max(Number(source.expireHours ?? 24), 1);
    const discountRate = Math.min(Math.max(Number(source.discountRate ?? 0.7), 0.1), 0.95);

    return {
      enabled,
      needed,
      expireHours,
      discountRate,
    };
  }

  private isGroupBuyEnabled(groupBuyConfig: Prisma.JsonValue | Record<string, unknown> | null | undefined) {
    const config = this.asJsonObject(groupBuyConfig);
    if (!config) {
      return true;
    }
    return config.enabled !== false;
  }

  private asJsonObject(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asTraceRecord(traceJson: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
    if (!traceJson || typeof traceJson !== 'object' || Array.isArray(traceJson)) {
      return null;
    }

    return traceJson as Record<string, unknown>;
  }

  private readTraceText(record: Record<string, unknown> | null, ...keys: string[]) {
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
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

  private readTraceTimeline(record: Record<string, unknown> | null): TraceTimelineItemView[] {
    const source = record?.timeline ?? record?.steps;
    if (!Array.isArray(source)) {
      return [];
    }

    return source
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          title: this.readTraceText(item, 'title', 'name') || '溯源节点',
          desc: this.readTraceText(item, 'desc', 'description', 'content') || '已完成该节点登记',
          time: this.readTraceText(item, 'time', 'createdAt', 'date'),
          status: (this.readTraceText(item, 'status') === 'pending' ? 'pending' : 'done') as 'done' | 'pending',
        }))
        .filter((item) => item.title && item.desc);
  }

  private buildTraceDetailLines(params: {
    traceRecord: Record<string, unknown> | null;
    originPlace?: string | null;
    storeName?: string | null;
    categoryName?: string | null;
    recordedAt: Date;
  }): TraceDetailLineView[] {
    const { traceRecord, originPlace, storeName, categoryName, recordedAt } = params;
    const detailLines: TraceDetailLineView[] = [
      {
        label: '产地信息',
        value: this.readTraceText(traceRecord, 'originPlace', 'farmName', 'baseName') || originPlace || '待商家补充',
      },
      {
        label: '建档商家',
        value: this.readTraceText(traceRecord, 'merchantName', 'storeName') || storeName || '待商家补充',
      },
      {
        label: '商品分类',
        value: this.readTraceText(traceRecord, 'categoryName') || categoryName || '待商家补充',
      },
      {
        label: '登记时间',
        value: this.toIso(recordedAt),
      },
    ];

    const optionalFields: Array<[string, string[]]> = [
      ['批次号', ['batchNo', 'batchCode']],
      ['采摘时间', ['pickedAt', 'harvestedAt', 'harvestDate']],
      ['检测结果', ['inspectionResult', 'inspectionSummary']],
      ['物流信息', ['logisticsNo', 'expressNo']],
      ['承运方', ['logisticsCompany', 'carrier']],
    ];

    optionalFields.forEach(([label, keys]) => {
      const value = this.readTraceText(traceRecord, ...keys);
      if (value) {
        detailLines.push({ label, value });
      }
    });

    return detailLines;
  }

  private buildTraceTimeline(params: {
    traceCode: string;
    traceDesc?: string | null;
    traceRecord: Record<string, unknown> | null;
    recordedAt: Date;
    productCreatedAt: Date;
    storeName?: string | null;
    originPlace?: string | null;
  }): TraceTimelineItemView[] {
    const { traceCode, traceDesc, traceRecord, recordedAt, productCreatedAt, storeName, originPlace } = params;
    const explicitTimeline = this.readTraceTimeline(traceRecord);
    if (explicitTimeline.length > 0) {
      return explicitTimeline;
    }

    return [
      {
        title: '产地建档',
        desc: `${originPlace || '产地待补充'} 已完成商品基础建档`,
        time: this.toIso(productCreatedAt),
        status: 'done',
      },
      {
        title: '商家录入',
        desc: `${storeName || '商家'} 已登记商品流转信息`,
        time: this.toIso(recordedAt),
        status: 'done',
      },
      {
        title: '溯源码绑定',
        desc: `${traceCode} ${traceDesc ? `· ${traceDesc}` : '已绑定当前商品'}`,
        time: this.toIso(recordedAt),
        status: 'done',
      },
    ];
  }

  async getHomeHotProducts() {
    return this.getHotProducts();
  }

  async listUserAddresses(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);
    const addresses = await this.prisma.userAddress.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });

    return addresses.map((address) => ({
      id: this.toNumber(address.id),
      receiverName: address.receiverName,
      receiverMobile: address.receiverMobile,
      province: address.province,
      city: address.city,
      district: address.district,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
    }));
  }

  async createUserAddress(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const receiverName = String(body.receiverName ?? body.name ?? '').trim();
    const receiverMobile = String(body.receiverMobile ?? body.mobile ?? '').trim();
    const province = String(body.province ?? '').trim();
    const city = String(body.city ?? '').trim();
    const district = String(body.district ?? '').trim();
    const detailAddress = String(body.detailAddress ?? body.address ?? '').trim();
    const isDefault = body.isDefault !== false;

    if (!receiverName || !receiverMobile || !province || !city || !district || !detailAddress) {
      throw new BadRequestException('Address fields are required');
    }

    if (isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.userAddress.create({
      data: {
        userId: user.id,
        receiverName,
        receiverMobile,
        province,
        city,
        district,
        detailAddress,
        isDefault,
      },
    });

    return {
      id: this.toNumber(address.id),
      receiverName: address.receiverName,
      receiverMobile: address.receiverMobile,
      province: address.province,
      city: address.city,
      district: address.district,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
    };
  }

  async updateUserAddress(authUser: AuthUser, addressId: number, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const address = await this.prisma.userAddress.findFirst({
      where: { id: BigInt(addressId), userId: user.id, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const updateDefault = body.isDefault === true;
    if (updateDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.userAddress.update({
      where: { id: address.id },
      data: {
        ...(typeof body.receiverName === 'string' && body.receiverName.trim()
            ? { receiverName: body.receiverName.trim() }
            : {}),
        ...(typeof body.receiverMobile === 'string' && body.receiverMobile.trim()
            ? { receiverMobile: body.receiverMobile.trim() }
            : {}),
        ...(typeof body.province === 'string' && body.province.trim() ? { province: body.province.trim() } : {}),
        ...(typeof body.city === 'string' && body.city.trim() ? { city: body.city.trim() } : {}),
        ...(typeof body.district === 'string' && body.district.trim() ? { district: body.district.trim() } : {}),
        ...(typeof body.detailAddress === 'string' && body.detailAddress.trim()
            ? { detailAddress: body.detailAddress.trim() }
            : {}),
        ...(body.isDefault != null ? { isDefault: Boolean(body.isDefault) } : {}),
      },
    });

    return {
      id: this.toNumber(updated.id),
      receiverName: updated.receiverName,
      receiverMobile: updated.receiverMobile,
      province: updated.province,
      city: updated.city,
      district: updated.district,
      detailAddress: updated.detailAddress,
      isDefault: updated.isDefault,
    };
  }

  async deleteUserAddress(authUser: AuthUser, addressId: number) {
    const user = await this.ensureUser(authUser);
    const result = await this.prisma.userAddress.updateMany({
      where: { id: BigInt(addressId), userId: user.id, deletedAt: null },
      data: { deletedAt: this.now() },
    });

    if (result.count === 0) {
      throw new NotFoundException('Address not found');
    }

    return { addressId, deleted: true };
  }

  async getCatalogCategories() {
    await this.withSeed();

    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null, status: 1 },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const roots = categories.filter((item) => item.parentId == null);
    return roots.map((root) => ({
      id: this.toNumber(root.id),
      name: root.name,
      iconUrl: this.resolvePublicUrl(root.iconUrl) ?? '',
      sortOrder: root.sortOrder,
      children: categories
          .filter((item) => item.parentId === root.id)
          .map((child) => ({
            id: this.toNumber(child.id),
            name: child.name,
            iconUrl: this.resolvePublicUrl(child.iconUrl) ?? '',
            sortOrder: child.sortOrder,
          })),
    }));
  }

  async getCategoryTags() {
    await this.withSeed();

    const tags = await this.prisma.category.findMany({
      where: {
        parentId: null,
        deletedAt: null,
        status: 1,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return tags.map((tag) => ({
      id: this.toNumber(tag.id),
      name: tag.name,
      iconUrl: this.resolvePublicUrl(tag.iconUrl) ?? '',
      sortOrder: tag.sortOrder,
    }));
  }

  async listAdminCategories() {
    await this.withSeed();

    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const productCounts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const countMap = new Map(productCounts.map((item) => [item.categoryId.toString(), item._count._all]));
    const nameMap = new Map(categories.map((item) => [item.id.toString(), item.name]));

    return categories.map((item) => ({
      id: this.toNumber(item.id),
      parentId: item.parentId != null ? this.toNumber(item.parentId) : null,
      parentName: item.parentId != null ? nameMap.get(item.parentId.toString()) ?? '' : '',
      name: item.name,
      iconUrl: this.resolvePublicUrl(item.iconUrl) ?? '',
      sortOrder: item.sortOrder,
      status: item.status,
      productCount: countMap.get(item.id.toString()) ?? 0,
      isTag: item.parentId == null,
    }));
  }

  async createAdminCategory(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const name = String(body.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const parentIdRaw = body.parentId;
    const parentId =
      parentIdRaw != null && String(parentIdRaw).trim() !== '' ? Number(parentIdRaw) : null;
    if (parentId != null && (!Number.isFinite(parentId) || parentId <= 0)) {
      throw new BadRequestException('Invalid parent category');
    }

    const sortOrder = body.sortOrder != null ? Number(body.sortOrder) : 0;
    const status = body.status != null ? Number(body.status) : 1;
    const iconUrl = String(body.iconUrl ?? '').trim() || null;

    if (parentId != null) {
      const parent = await this.prisma.category.findFirst({
        where: { id: BigInt(parentId), deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const created = await this.prisma.category.create({
      data: {
        name,
        parentId: parentId != null ? BigInt(parentId) : null,
        iconUrl,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        status: status === 0 ? 0 : 1,
      },
    });

    await this.recordAdminOperation(authUser, 'CREATE_CATEGORY', '分类管理', created.id, {
      name: created.name,
      parentId,
    });

    return {
      id: this.toNumber(created.id),
      parentId,
      parentName: '',
      name: created.name,
      iconUrl: this.resolvePublicUrl(created.iconUrl) ?? '',
      sortOrder: created.sortOrder,
      status: created.status,
      productCount: 0,
      isTag: parentId == null,
    };
  }

  async updateAdminCategory(categoryId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const category = await this.prisma.category.findFirst({
      where: { id: BigInt(categoryId), deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const name = body.name != null ? String(body.name).trim() : category.name;
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    let parentId = category.parentId != null ? this.toNumber(category.parentId) : null;
    if (body.parentId !== undefined) {
      const parentIdRaw = body.parentId;
      parentId =
        parentIdRaw != null && String(parentIdRaw).trim() !== '' ? Number(parentIdRaw) : null;
      if (parentId != null && (!Number.isFinite(parentId) || parentId <= 0)) {
        throw new BadRequestException('Invalid parent category');
      }
      if (parentId === categoryId) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      if (parentId != null) {
        const parent = await this.prisma.category.findFirst({
          where: { id: BigInt(parentId), deletedAt: null },
        });
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: category.id },
      data: {
        name,
        parentId: parentId != null ? BigInt(parentId) : null,
        iconUrl: body.iconUrl != null ? String(body.iconUrl).trim() || null : category.iconUrl,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : category.sortOrder,
        status: body.status != null ? (Number(body.status) === 0 ? 0 : 1) : category.status,
      },
    });

    const productCount = await this.prisma.product.count({
      where: { categoryId: updated.id, deletedAt: null },
    });
    let parentName = '';
    if (updated.parentId != null) {
      const parent = await this.prisma.category.findUnique({ where: { id: updated.parentId } });
      parentName = parent?.name ?? '';
    }

    await this.recordAdminOperation(authUser, 'UPDATE_CATEGORY', '分类管理', updated.id, {
      name: updated.name,
      parentId,
    });

    return {
      id: this.toNumber(updated.id),
      parentId,
      parentName,
      name: updated.name,
      iconUrl: this.resolvePublicUrl(updated.iconUrl) ?? '',
      sortOrder: updated.sortOrder,
      status: updated.status,
      productCount,
      isTag: updated.parentId == null,
    };
  }

  async deleteAdminCategory(categoryId: number, authUser?: AuthUser) {
    await this.withSeed();

    const category = await this.prisma.category.findFirst({
      where: { id: BigInt(categoryId), deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const childCount = await this.prisma.category.count({
      where: { parentId: category.id, deletedAt: null },
    });
    if (childCount > 0) {
      throw new BadRequestException('Please delete child categories first');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: category.id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new BadRequestException('Category still has products and cannot be deleted');
    }

    await this.prisma.category.update({
      where: { id: category.id },
      data: { deletedAt: this.now() },
    });

    await this.recordAdminOperation(authUser, 'DELETE_CATEGORY', '分类管理', category.id, {
      name: category.name,
    });

    return {
      id: categoryId,
      deleted: true,
    };
  }

  async listProducts(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();

    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const categoryId = query.categoryId ? Number(query.categoryId) : undefined;
    const keyword = String(query.keyword ?? '').trim();
    const productNature = String(query.productNature ?? '').trim();
    const isPreSale = query.isPreSale != null ? query.isPreSale === 'true' : undefined;
    const isHot = query.isHot != null ? query.isHot === 'true' : undefined;
    const deliveryType = query.deliveryType ? Number(query.deliveryType) : undefined;

    // 1. 生成 Redis 缓存 Key（公共列表不包含状态覆盖参数）
    const cacheKeyParts = {
      categoryId,
      isPreSale,
      isHot,
      deliveryType,
      productNature,
      keyword,
      page,
      pageSize,
    };
    const cacheKey = `app:products:list:${createHash('md5').update(JSON.stringify(cacheKeyParts)).digest('hex')}`;

    let resultData: { page: number; pageSize: number; total: number; items: any[] } | null = null;

    // 2. 尝试从缓存获取数据
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        resultData = JSON.parse(cached);
      }
    } catch (e: any) {
      this.logger.error(`Redis read error in listProducts: ${e.message}`);
    }

    // 3. 缓存未命中，进行数据库查询
    if (!resultData) {
      let categoryIds: bigint[] | undefined;
      if (categoryId) {
        const allCats = await this.prisma.category.findMany({
          select: { id: true, parentId: true },
          where: { deletedAt: null, status: 1 },
        });
        const flat = allCats.map((item) => ({
          id: Number(item.id),
          parentId: item.parentId != null ? Number(item.parentId) : null,
        }));
        categoryIds = this.collectCategoryDescendants(categoryId, flat).map((id) => BigInt(id));
      }

      const where: Prisma.ProductWhereInput = {
        ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
        ...(typeof isPreSale === 'boolean' ? { isPreSale } : {}),
        ...(typeof isHot === 'boolean' ? { isHot } : {}),
        ...(deliveryType ? { deliveryType } : {}),
        ...(productNature
          ? {
              productNature: {
                contains: productNature,
              },
            }
          : {}),
        status: 1,
        auditStatus: 2,
        deletedAt: null,
        ...(keyword
            ? {
              OR: [
                { title: { contains: keyword } },
                { subtitle: { contains: keyword } },
                { detailDesc: { contains: keyword } },
                { originPlace: { contains: keyword } },
                { merchant: { storeName: { contains: keyword } } },
                { merchant: { contactName: { contains: keyword } } },
                { skus: { some: { skuName: { contains: keyword } } } },
              ],
            }
            : {}),
      };

      const [total, products] = await Promise.all([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
          where,
          include: {
            merchant: true,
            category: true,
            skus: { orderBy: { id: 'asc' } },
          },
          orderBy: [{ isHot: 'desc' }, { id: 'desc' }],
          skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
          take: Math.max(pageSize, 1),
        }),
      ]);

      const salesRows = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
      });
      const salesMap = new Map<string, number>();
      for (const row of salesRows) {
        salesMap.set(String(row.productId), Number(row._sum.quantity ?? 0));
      }

      resultData = {
        page: Math.max(page, 1),
        pageSize: Math.max(pageSize, 1),
        total,
        items: products.map((product) => ({
          id: this.toNumber(product.id),
          categoryId: this.toNumber(product.categoryId),
          merchantId: this.toNumber(product.merchantId),
          title: product.title,
          subtitle: product.subtitle,
          detailDesc: product.detailDesc ?? '',
          merchantName: product.merchant?.storeName ?? '',
          skuNames: product.skus.map((sku) => sku.skuName),
          originPlace: this.normalizeOriginPlace(product.originPlace),
          productNature: product.productNature ?? '',
          coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
          minPrice: product.skus[0] ? this.computeDisplayPrice(product.skus[0]) : '0.00',
          maxPrice: product.skus.at(-1) ? this.computeDisplayPrice(product.skus.at(-1)!) : '0.00',
          saleCount: salesMap.get(product.id.toString()) ?? 0,
          createdAt: this.toIso(product.createdAt),
          isFavorite: false, // 默认设为 false，用户真实收藏态在后面动态融合
          status: product.status === 1 ? 'ON_SHELF' : 'OFF_SHELF',
          isPreSale: product.isPreSale,
          isHot: product.isHot,
          deliveryType: product.deliveryType ?? 1,
        })),
      };

      // 4. 将结果写入 Redis 缓存（缓存 5 分钟）
      try {
        await this.redisService.setex(cacheKey, 300, JSON.stringify(resultData));
      } catch (e: any) {
        this.logger.error(`Redis write error in listProducts: ${e.message}`);
      }
    }

    // 5. 异步记录热搜词权重（ZSET zincrby）
    if (keyword) {
      this.redisService.zincrby('app:search:hot_words', 1, keyword).catch((e) => {
        this.logger.error(`Failed to record hot keyword: ${e.message}`);
      });
    }

    // 6. 动态融合当前请求用户的收藏态 (isFavorite)
    const user = await this.resolveOptionalUser(authUser);
    const favoriteProductIds = user
        ? new Set(
            (
                await this.prisma.favorite.findMany({
                  where: { userId: user.id },
                  select: { productId: true },
                })
            ).map((item) => this.toNumber(item.productId)),
        )
        : new Set<number>();

    const items = resultData.items.map((item) => ({
      ...item,
      isFavorite: favoriteProductIds.has(item.id),
    }));

    return {
      ...resultData,
      items,
    };
  }

  // ============================================================
  // 店铺公开接口（user / 游客 / merchant 均可访问）
  // ============================================================

  async listPublicMerchants(query: Record<string, string>) {
    await this.withSeed();

    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const status = query.status != null ? Number(query.status) : 1; // 默认仅展示已通过

    const where: Prisma.MerchantWhereInput = {
      deletedAt: null,
      status,
      ...(keyword
        ? {
            OR: [
              { storeName: { contains: keyword } },
              { contactName: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [total, merchants] = await Promise.all([
      this.prisma.merchant.count({ where }),
      this.prisma.merchant.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    const merchantIds = merchants.map((m) => m.id);
    const productCountMap = new Map<string, number>();
    if (merchantIds.length > 0) {
      const rows = await this.prisma.product.groupBy({
        by: ['merchantId'],
        where: {
          merchantId: { in: merchantIds },
          status: 1,
          auditStatus: 2,
          deletedAt: null,
        },
        _count: { _all: true },
      });
      for (const row of rows) {
        productCountMap.set(String(row.merchantId), Number(row._count._all));
      }
    }

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: merchants.map((m) => ({
        merchantId: this.toNumber(m.id),
        storeName: m.storeName,
        storeLogo: this.resolvePublicUrl(m.storeLogo) ?? '',
        contactName: m.contactName,
        // contactMobile 不外露，敏感字段隔离
        auditStatus: m.status === 1 ? 'APPROVED' : m.status === 3 ? 'REJECTED' : 'PENDING_AUDIT',
        onShelfProductCount: productCountMap.get(m.id.toString()) ?? 0,
        settledAt: m.settledAt ? this.toIso(m.settledAt) : null,
      })),
    };
  }

  async getPublicMerchantDetail(merchantId: number) {
    await this.withSeed();

    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null, status: 1 },
    });
    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found or not approved`);
    }

    const [onShelfCount, soldCount, qualifiedCount] = await Promise.all([
      this.prisma.product.count({
        where: { merchantId: merchant.id, status: 1, auditStatus: 2, deletedAt: null },
      }),
      this.prisma.orderItem.count({
        where: { product: { merchantId: merchant.id } },
      }),
      this.prisma.merchantQualification.count({
        where: { merchantId: merchant.id, status: 1 },
      }),
    ]);

    return {
      merchantId: this.toNumber(merchant.id),
      storeName: merchant.storeName,
      storeLogo: this.resolvePublicUrl(merchant.storeLogo) ?? '',
      contactName: merchant.contactName,
      // contactMobile 不外露
      auditStatus: 'APPROVED',
      onShelfProductCount: onShelfCount,
      soldCount,
      qualifiedCount,
      settledAt: merchant.settledAt ? this.toIso(merchant.settledAt) : null,
      createdAt: this.toIso(merchant.createdAt),
    };
  }

  async listMerchantPublicProducts(merchantId: number, query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();

    // 1. 校验店铺存在且已通过
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null, status: 1 },
      select: { id: true, storeName: true, storeLogo: true },
    });
    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found or not approved`);
    }

    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const isPreSale = query.isPreSale != null ? query.isPreSale === 'true' : undefined;
    const isHot = query.isHot != null ? query.isHot === 'true' : undefined;
    const sort = String(query.sort ?? 'default'); // default | sales | price_asc | price_desc | newest

    const where: Prisma.ProductWhereInput = {
      merchantId: merchant.id,
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(typeof isPreSale === 'boolean' ? { isPreSale } : {}),
      ...(typeof isHot === 'boolean' ? { isHot } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { subtitle: { contains: keyword } },
              { detailDesc: { contains: keyword } },
              { originPlace: { contains: keyword } },
              { skus: { some: { skuName: { contains: keyword } } } },
            ],
          }
        : {}),
    };

    // 2. 排序：默认 isHot 降序 + id 降序；sales/price/newest 走不同字段
    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ isHot: 'desc' }, { id: 'desc' }];
    if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    } else if (sort === 'price_asc' || sort === 'price_desc') {
      orderBy = [{ createdAt: 'desc' }];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          skus: { orderBy: { id: 'asc' } },
        },
        orderBy,
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    // 3. 销量聚合
    const salesRows = total > 0
      ? await this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: { productId: { in: products.map((p) => p.id) } },
          _sum: { quantity: true },
        })
      : [];
    const salesMap = new Map<string, number>();
    for (const row of salesRows) {
      salesMap.set(String(row.productId), Number(row._sum.quantity ?? 0));
    }

    // 4. 收藏态融合
    const user = await this.resolveOptionalUser(authUser);
    const favoriteIds = user
      ? new Set(
          (
            await this.prisma.favorite.findMany({
              where: { userId: user.id, productId: { in: products.map((p) => p.id) } },
              select: { productId: true },
            })
          ).map((f) => this.toNumber(f.productId)),
        )
      : new Set<number>();

    // 5. 价格排序需要在内存里二次排
    let items = products.map((p) => {
      const minPrice = p.skus[0] ? this.toMoney(p.skus[0].price) : '0.00';
      const maxPrice = p.skus.at(-1) ? this.toMoney(p.skus.at(-1)!.price) : '0.00';
      return {
        id: this.toNumber(p.id),
        categoryId: this.toNumber(p.categoryId),
        title: p.title,
        subtitle: p.subtitle,
        originPlace: this.normalizeOriginPlace(p.originPlace),
        productNature: p.productNature ?? '',
        coverUrl: this.resolvePublicUrl(p.coverUrl) ?? '',
        minPrice,
        maxPrice,
        saleCount: salesMap.get(p.id.toString()) ?? 0,
        isFavorite: favoriteIds.has(this.toNumber(p.id)),
        isPreSale: p.isPreSale,
        isHot: p.isHot,
        deliveryType: p.deliveryType ?? 1,
        createdAt: this.toIso(p.createdAt),
      };
    });

    if (sort === 'sales') {
      items.sort((a, b) => b.saleCount - a.saleCount);
    } else if (sort === 'price_asc') {
      items.sort((a, b) => Number(a.minPrice) - Number(b.minPrice));
    } else if (sort === 'price_desc') {
      items.sort((a, b) => Number(b.maxPrice) - Number(a.maxPrice));
    }

    return {
      merchant: {
        merchantId: this.toNumber(merchant.id),
        storeName: merchant.storeName,
        storeLogo: this.resolvePublicUrl(merchant.storeLogo) ?? '',
      },
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items,
    };
  }

  async getHotKeywords(): Promise<string[]> {
    try {
      const list = await this.redisService.zrevrange('app:search:hot_words', 0, 9);
      if (list && list.length > 0) {
        return list;
      }
    } catch (e: any) {
      this.logger.error(`Failed to get hot keywords from Redis: ${e.message}`);
    }
    // Fallback: 如果 Redis 没有数据或报错，从热门商品中抽取前几个商品标题的分段
    try {
      const hotProducts = await this.prisma.product.findMany({
        where: { isHot: true, status: 1, auditStatus: 2, deletedAt: null },
        take: 5,
        orderBy: { id: 'desc' },
      });
      return hotProducts.map((p) => p.title.split(/\s+/)[0]).filter(Boolean);
    } catch (e) {
      return ['苹果', '番茄', '牛奶', '鸡蛋', '大米']; // 兜底静态词
    }
  }

  async getProductDetail(productId: number, authUser?: AuthUser) {
    await this.withSeed();

    const user = await this.resolveOptionalUser(authUser);
    const favorite = user
        ? await this.prisma.favorite.findUnique({
          where: {
            userId_productId: {
              userId: user.id,
              productId: BigInt(productId),
            },
          },
        })
        : null;

    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: {
        merchant: true,
        category: true,
        skus: { orderBy: { id: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        videos: { orderBy: { sortOrder: 'asc' } },
        traces: { orderBy: { id: 'desc' } },
      },
    });

    if (!product) {
      return null;
    }

    if (!this.isPublicProductVisible(product)) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: this.toNumber(product.id),
      categoryId: this.toNumber(product.categoryId),
      merchantId: this.toNumber(product.merchantId),
      title: product.title,
      subtitle: product.subtitle,
      originPlace: this.normalizeOriginPlace(product.originPlace),
      coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
      detailDesc: product.detailDesc,
      deliveryType: product.deliveryType ?? 1,
      serviceTags: this.normalizeProductServiceTags(product.serviceTags, product.deliveryType),
      isPreSale: product.isPreSale,
      isFavorite: Boolean(favorite),
      groupBuyConfig: this.normalizeGroupBuyConfig(product.groupBuyConfig),
      images: product.images.map((image) => this.resolvePublicUrl(image.imageUrl) ?? ''),
      videos: product.videos.map((video) => ({
        videoUrl: this.resolvePublicUrl(video.videoUrl) ?? '',
        coverUrl: this.resolvePublicUrl(video.coverUrl) ?? '',
      })),
      skus: product.skus.map((sku) => {
        const priceView = this.getDisplayPriceSplit(sku);
        return {
          ...priceView,
          id: this.toNumber(sku.id),
          skuName: sku.skuName,
          imageUrl: this.resolvePublicUrl(sku.imageUrl) ?? '',
          price: priceView.displayPrice,
          originalPrice: priceView.originalPrice ?? this.toMoney(sku.originalPrice ?? sku.price),
          offlinePrice: sku.offlinePrice ? this.toMoney(sku.offlinePrice) : null,
          stock: sku.stock,
          lockedStock: sku.lockedStock,
          safetyStock: sku.safetyStock,
          specJson: sku.specJson ?? {},
        };
      }),
      traceInfo: product.traces[0]
          ? {
            traceCode: product.traces[0].traceCode,
            traceDesc: product.traces[0].traceDesc,
            traceUrl: `/pages/trace/detail/detail?traceCode=${encodeURIComponent(product.traces[0].traceCode)}`,
          }
          : null,
      merchant: {
        id: this.toNumber(product.merchant.id),
        storeName: product.merchant.storeName,
        contactName: product.merchant.contactName,
        contactMobile: product.merchant.contactMobile,
        storeLogo: product.merchant.storeLogo,
      },
      category: {
        id: this.toNumber(product.category.id),
        name: product.category.name,
      },
      // 品牌与商家扩展
      brand: product.brand,
      supplierName: product.supplierName,
      ingredients: product.ingredients,
      // 规格与尺寸参数
      shelfLife: product.shelfLife,
      productionDate: product.productionDate,
      material: product.material,
      dimensions: product.dimensions,
      // 备货与配送限制
      leadTime: product.leadTime,
      shippingRestrictedRegions: product.shippingRestrictedRegions,
      afterSalesCommitment: product.afterSalesCommitment,
      logisticsCompany: product.logisticsCompany,
      // 直播与运营属性
      productNature: product.productNature,
      liveCities: product.liveCities,
      sessionAttribute: product.sessionAttribute,
      liveMechanism: product.liveMechanism,
    };
  }

  async getTraceDetail(traceCode: string) {
    await this.withSeed();

    const normalizedTraceCode = decodeURIComponent(String(traceCode ?? '')).trim();
    if (!normalizedTraceCode) {
      throw new BadRequestException('traceCode is required');
    }

    const trace = await this.prisma.productTrace.findUnique({
      where: { traceCode: normalizedTraceCode },
      include: {
        product: {
          include: {
            merchant: true,
            category: true,
          },
        },
      },
    });

    if (!trace || trace.product.deletedAt) {
      throw new NotFoundException('Trace not found');
    }

    if (!this.isPublicProductVisible(trace.product)) {
      throw new NotFoundException('Trace not found');
    }

    const traceRecord = this.asTraceRecord(trace.traceJson);

    return {
      traceCode: trace.traceCode,
      traceDesc: trace.traceDesc ?? '',
      status: 'verified' as const,
      recordedAt: this.toIso(trace.createdAt),
      product: {
        id: this.toNumber(trace.product.id),
        title: trace.product.title,
        subtitle: trace.product.subtitle ?? '',
        coverUrl: this.resolvePublicUrl(trace.product.coverUrl) ?? '',
        originPlace: this.normalizeOriginPlace(trace.product.originPlace),
        categoryName: trace.product.category?.name ?? '',
      },
      merchant: {
        id: this.toNumber(trace.product.merchant.id),
        storeName: trace.product.merchant.storeName,
        contactName: trace.product.merchant.contactName,
        contactMobile: trace.product.merchant.contactMobile,
      },
      detailLines: this.buildTraceDetailLines({
        traceRecord,
        originPlace: this.normalizeOriginPlace(trace.product.originPlace),
        storeName: trace.product.merchant.storeName,
        categoryName: trace.product.category?.name,
        recordedAt: trace.createdAt,
      }),
      timeline: this.buildTraceTimeline({
        traceCode: trace.traceCode,
        traceDesc: trace.traceDesc,
        traceRecord,
        recordedAt: trace.createdAt,
        productCreatedAt: trace.product.createdAt,
        storeName: trace.product.merchant.storeName,
        originPlace: this.normalizeOriginPlace(trace.product.originPlace),
      }),
      raw: traceRecord,
    };
  }

  async addFavorite(authUser: AuthUser, productId: number) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);

    const exists = await this.prisma.product.findUnique({ where: { id: BigInt(productId) } });

    if (!exists || !this.isPublicProductVisible(exists)) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId: BigInt(productId),
        },
      },
      create: {
        userId: user.id,
        productId: BigInt(productId),
      },
      update: {},
    });

    return {
      productId,
      favorite: true,
      affectedRows: this.toNumber(result.id) > 0 ? 1 : 0,
    };
  }

  async removeFavorite(authUser: AuthUser, productId: number) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);

    const exists = Boolean(await this.prisma.product.findUnique({ where: { id: BigInt(productId) } }));

    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        productId: BigInt(productId),
      },
    });

    return {
      productId,
      favorite: false,
      affectedRows: result.count,
    };
  }

  async listFavorites(authUser: AuthUser, query: Record<string, string> = {}) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const where = {
      userId: user.id,
      product: {
        deletedAt: null,
        status: 1,
        auditStatus: 2,
      },
    };

    const total = await this.prisma.favorite.count({ where });
    const favorites = await this.prisma.favorite.findMany({
      where,
      include: {
        product: {
          include: {
            merchant: true,
            skus: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const items = favorites.map((favorite) => {
      const sku = favorite.product.skus[0];

      return {
        favoriteId: this.toNumber(favorite.id),
        productId: this.toNumber(favorite.product.id),
        merchantId: this.toNumber(favorite.product.merchantId),
        skuId: sku ? this.toNumber(sku.id) : 0,
        title: favorite.product.title,
        subtitle: favorite.product.subtitle,
        coverUrl: this.resolvePublicUrl(favorite.product.coverUrl) ?? '',
        originPlace: this.normalizeOriginPlace(favorite.product.originPlace),
        minPrice: sku ? this.computeDisplayPrice(sku) : '0.00',
        storeName: favorite.product.merchant.storeName,
        isPreSale: favorite.product.isPreSale,
        createdAt: this.toIso(favorite.createdAt),
      };
    });

    return {
      page,
      pageSize,
      total,
      items,
    };
  }

  private async resolveOrderAddressSnapshot(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
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

  // P0-8: 服务端按物流规则计算运费
  private async calculateFreight(province: string, goodsAmount: number): Promise<number> {
    await this.withSeed();
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

  async addCartItem(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const skuId = Number(body.skuId ?? body.id ?? 0);
    const quantity = Math.max(Number(body.quantity ?? 1), 1);
    const checked = body.checked !== false;

    const sku = await this.prisma.productSku.findUnique({
      where: { id: BigInt(skuId) },
      include: { product: true },
    });

    if (!sku) {
      throw new BadRequestException('SKU not found');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        userId_skuId: {
          userId: user.id,
          skuId: sku.id,
        },
      },
    });

    const cartItem = existing
        ? await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
            checked,
          },
        })
        : await this.prisma.cartItem.create({
          data: {
            userId: user.id,
            merchantId: sku.product.merchantId,
            productId: sku.productId,
            skuId: sku.id,
            quantity,
            checked,
          },
        });

    return {
      message: 'cart item added',
      input: body,
      cartCount: await this.prisma.cartItem.count({ where: { userId: user.id } }),
      cartId: this.toNumber(cartItem.id),
    };
  }

  async getCart(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);
    const items = await this.prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            merchant: true,
          },
        },
        sku: true,
      },
      orderBy: [{ merchantId: 'asc' }, { id: 'asc' }],
    });

    const groups = new Map<number, { merchantId: number; storeName: string; items: unknown[] }>();

    for (const item of items) {
      if (!this.isPublicProductVisible(item.product)) {
        continue;
      }

      const merchantId = this.toNumber(item.merchantId);
      const group = groups.get(merchantId) ?? {
        merchantId,
        storeName: item.product.merchant.storeName,
        items: [],
      };

      group.items.push({
        cartId: this.toNumber(item.id),
        productId: this.toNumber(item.productId),
        skuId: this.toNumber(item.skuId),
        title: item.product.title,
        skuName: item.sku.skuName,
        price: this.computeDisplayPrice(item.sku),
        originalPrice: this.toMoney(item.sku.originalPrice ?? item.sku.price),
        quantity: item.quantity,
        checked: item.checked,
        stock: item.sku.stock,
        coverUrl: this.resolvePublicUrl(item.product.coverUrl) ?? '',
      });

      groups.set(merchantId, group);
    }

    return {
      groups: [...groups.values()],
      freightPromo: await this.getPublicFreightPromo(),
    };
  }

  async updateCartItem(authUser: AuthUser, cartId: number, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const quantity = body.quantity != null ? Math.max(Number(body.quantity), 1) : undefined;
    const checked = body.checked != null ? Boolean(body.checked) : undefined;

    const cartItem = await this.prisma.cartItem.updateMany({
      where: { id: BigInt(cartId), userId: user.id },
      data: {
        ...(quantity ? { quantity } : {}),
        ...(checked != null ? { checked } : {}),
      },
    });

    return {
      cartId,
      message: 'cart item updated',
      input: body,
      affectedRows: cartItem.count,
    };
  }

  async removeCartItem(authUser: AuthUser, cartId: number) {
    const user = await this.ensureUser(authUser);
    const cartItem = await this.prisma.cartItem.deleteMany({
      where: { id: BigInt(cartId), userId: user.id },
    });

    return {
      cartId,
      message: 'cart item removed',
      affectedRows: cartItem.count,
    };
  }

  async previewOrder(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);

    // 秒杀预览
    const flashSaleItemId = body.flashSaleItemId != null ? Number(body.flashSaleItemId) : 0;
    const flashSkuId = body.skuId != null ? Number(body.skuId) : 0;
    if (flashSaleItemId > 0 && flashSkuId > 0) {
      const flashItem = await this.prisma.flashSaleItem.findUnique({
        where: { id: BigInt(flashSaleItemId) },
        include: { window: true, sku: { include: { product: true } } },
      });
      if (!flashItem) throw new BadRequestException('秒杀商品不存在');
      if (this.computeFlashSaleStatus(flashItem.window.startAt, flashItem.window.endAt, new Date()) !== 'ONGOING') {
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
      if (group.members.length >= group.needed && !group.members.some((m) => this.toNumber(m.userId) === this.toNumber(user.id))) {
        throw new BadRequestException('拼团已满员');
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
      const couponUsage = this.evaluateCouponUsage(coupon, userCoupon, subtotal, {
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
    // P0-8: 运费服务端计算，拒绝客户端传入
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
    const couponUsage = this.evaluateCouponUsage(coupon, userCoupon, subtotal, { merchantId: this.toNumber(cartItems[0].merchantId), categoryIds });
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

  async createOrder(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const expireAt = new Date(Date.now() + 30 * 60 * 1000);
    const groupBuyId = body.groupBuyId != null ? Number(body.groupBuyId) : 0;
    const groupProductId = body.productId != null ? Number(body.productId) : 0;
    const groupSkuId = body.skuId != null ? Number(body.skuId) : 0;
    const isGroupBuyMode = String(body.orderMode ?? '').trim().toUpperCase() === 'GROUP_BUY';

    // 开新团下单：此时还没有 groupBuyId，提交订单时才创建 GroupBuy 容器并挂上订单。
    // 成员名额仍要等支付成功（settleGroupBuyOrderPayment）才写入。
    if (isGroupBuyMode && !(groupBuyId > 0) && groupProductId > 0 && groupSkuId > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: BigInt(groupProductId) },
        include: { skus: { where: { id: BigInt(groupSkuId) }, take: 1 } },
      });
      if (!product) {
        throw new BadRequestException('商品不存在');
      }
      const sku = product.skus[0] || (await this.prisma.productSku.findUnique({ where: { id: BigInt(groupSkuId) } }));
      if (!sku || this.toNumber(sku.productId) !== groupProductId) {
        throw new BadRequestException('SKU 不存在');
      }
      const groupConfig = this.normalizeGroupBuyConfig(product.groupBuyConfig);
      if (!groupConfig?.enabled) {
        throw new BadRequestException('该商品暂不支持拼团');
      }

      const quantity = Math.max(Number(body.quantity ?? 1) || 1, 1);
      if (quantity !== 1) {
        throw new BadRequestException('拼团商品仅支持单件下单');
      }
      if (sku.stock < quantity) {
        throw new BadRequestException('该拼团商品库存不足');
      }

      const originPrice = Number(sku.price);
      const groupPrice = Number((originPrice * Number(groupConfig.discountRate)).toFixed(2));
      const goodsAmount = groupPrice * quantity;
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
      const categoryIds = [this.toNumber(product.categoryId)];
      const couponUsage = this.evaluateCouponUsage(coupon, userCoupon, goodsAmount, {
        merchantId: this.toNumber(product.merchantId),
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
        const lockedSku = await tx.productSku.updateMany({
          where: { id: sku.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity }, lockedStock: { increment: quantity } },
        });
        if (lockedSku.count === 0) {
          throw new BadRequestException('该拼团商品库存不足');
        }

        const groupNo = `GB${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
        const inviteCode = await this.generateUniqueInviteCode(tx);
        const expireGroupAt = new Date(Date.now() + Number(groupConfig.expireHours) * 60 * 60 * 1000);
        const group = await tx.groupBuy.create({
          data: {
            groupNo,
            inviteCode,
            productId: product.id,
            skuId: sku.id,
            initiatorId: user.id,
            groupPrice: new Prisma.Decimal(groupPrice.toFixed(2)),
            originPrice: new Prisma.Decimal(originPrice.toFixed(2)),
            needed: Number(groupConfig.needed),
            status: 'OPEN',
            expireAt: expireGroupAt,
            roughArea: '附近',
            latitude: null,
            longitude: null,
          },
        });

        const created = await tx.order.create({
          data: {
            orderNo,
            userId: user.id,
            merchantId: product.merchantId,
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
                  productId: product.id,
                  skuId: sku.id,
                  productTitle: product.title,
                  skuName: sku.skuName,
                  productImage: product.coverUrl,
                  unitPrice: new Prisma.Decimal(groupPrice.toFixed(2)),
                  quantity,
                  lineAmount: new Prisma.Decimal((groupPrice * quantity).toFixed(2)),
                },
              ],
            },
          },
          include: { items: true },
        });

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
          await tx.userCoupon.update({
            where: {
              userId_couponId: {
                userId: user.id,
                couponId: BigInt(couponId),
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

    // 秒杀订单
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
      if (this.computeFlashSaleStatus(flashItem.window.startAt, flashItem.window.endAt, new Date()) !== 'ONGOING') {
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

      // 名额只在支付成功后才占用（见 settleGroupBuyOrderPayment），此处的 members 均为已支付的真实成员
      const alreadyPaidMember = group.members.find((member) => this.toNumber(member.userId) === this.toNumber(user.id));
      if (alreadyPaidMember) {
        throw new BadRequestException('你已参加该拼团');
      }
      if (group.members.length >= group.needed) {
        throw new BadRequestException('拼团已满员');
      }

      // 避免用户反复点击下单生成多个待支付订单，重复锁库存
      const existingPendingOrder = await this.prisma.order.findFirst({
        where: { groupBuyId: group.id, userId: user.id, orderStatus: PlatformDataService.ORDER_STATUS.PENDING, payStatus: PlatformDataService.PAY_STATUS.UNPAID },
        orderBy: { createdAt: 'desc' },
      });
      if (existingPendingOrder) {
        return { orderNo: existingPendingOrder.orderNo, status: 'PENDING', payAmount: existingPendingOrder.payAmount.toFixed(2) };
      }

      const quantity = Math.max(Number(body.quantity ?? 1) || 1, 1);
      if (quantity !== 1) {
        throw new BadRequestException('拼团商品仅支持单件下单');
      }
      if (group.sku.stock < quantity) {
        throw new BadRequestException('该拼团商品库存不足');
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
      const couponUsage = this.evaluateCouponUsage(coupon, userCoupon, goodsAmount, {
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
        // 事务内二次校验，防止并发下超卖/超员（例如同一时刻两人下单最后一个名额/最后一件库存）
        const freshGroup = await tx.groupBuy.findUnique({
          where: { id: group.id },
          select: { status: true, expireAt: true, needed: true, members: { select: { id: true } } },
        });
        if (!freshGroup || freshGroup.status !== 'OPEN' || freshGroup.expireAt < this.now()) {
          throw new BadRequestException('拼团已结束');
        }
        if (freshGroup.members.length >= freshGroup.needed) {
          throw new BadRequestException('拼团已满员');
        }

        // P0：拼团下单同样锁定库存，与普通购物车订单保持一致，避免"失败时释放从未锁定的库存"
        const lockedSku = await tx.productSku.updateMany({
          where: { id: group.skuId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity }, lockedStock: { increment: quantity } },
        });
        if (lockedSku.count === 0) {
          throw new BadRequestException('该拼团商品库存不足');
        }

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

        // 注意：这里【不】创建 GroupBuyMember、不判断成团——名额与成团判定统一放到支付成功回调
        // （settleGroupBuyOrderPayment）里做，确保"占名额"="真实付款"。

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

    // P0-5: 校验购物车中所有商品均处于上架且已审核通过状态
    const inactiveItems = cartItems.filter(
        (item) => item.product.status !== 1 || item.product.auditStatus !== 2 || item.product.deletedAt,
    );
    if (inactiveItems.length > 0) {
      const titles = inactiveItems.map((item) => item.product.title).join('、');
      throw new BadRequestException(`以下商品已下架或未审核通过：${titles}`);
    }

    // P0-6: 校验每个 SKU 库存充足
    const insufficientItems = cartItems.filter((item) => item.sku.stock < item.quantity);
    if (insufficientItems.length > 0) {
      const titles = insufficientItems.map((item) => `${item.sku.skuName}(库存${item.sku.stock},需${item.quantity})`).join('、');
      throw new BadRequestException(`以下商品库存不足：${titles}`);
    }

    const parentMerchantId = cartItems[0].merchantId;
    const goodsAmount = cartItems.reduce((sum, item) => sum + Number(this.computeDisplayPrice(item.sku)) * item.quantity, 0);
    const addressSnapshot = await this.resolveOrderAddressSnapshot(authUser, body);
    // P0-8: 运费服务端计算，拒绝客户端传入
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
    const couponUsage = this.evaluateCouponUsage(coupon, userCoupon, goodsAmount, { merchantId: this.toNumber(parentMerchantId), categoryIds });
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
    const pickupMeta = await this.leaderService.resolvePickupOrderMeta(body);

    // 按商品拆单：每个 cartItem 生成一个独立的子订单
    // 子订单按 goodsAmount 比例分摊运费和折扣
    const childPlans = cartItems.map((item, index) => {
      const childGoodsAmount = Number(this.computeDisplayPrice(item.sku)) * item.quantity;
      const proportion = goodsAmount > 0 ? childGoodsAmount / goodsAmount : 1 / cartItems.length;
      const isLast = index === cartItems.length - 1;
      return {
        cartItem: item,
        childGoodsAmount,
        proportion,
        isLast,
      };
    });

    // 分摊计算：最后一单兜底剩余金额，避免浮点累计误差
    let accumulatedFreight = 0;
    let accumulatedDiscount = 0;
    const childAllocations = childPlans.map((plan) => {
      const childFreight = plan.isLast
          ? Math.max(freightAmount - accumulatedFreight, 0)
          : Math.round(freightAmount * plan.proportion * 100) / 100;
      const childDiscount = plan.isLast
          ? Math.max(couponDiscount + pointsDiscount - accumulatedDiscount, 0)
          : Math.round((couponDiscount + pointsDiscount) * plan.proportion * 100) / 100;
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
      // 创建父订单（聚合金额，无 items，用于支付）
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
          ...pickupMeta,
        },
      });

      // 创建子订单（每个 cartItem 一个，挂 parentOrderNo）
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
            ...pickupMeta,
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

      // P0-6: 扣减库存
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

  async listOrders(authUser: AuthUser, query: Record<string, string>) {
    const user = await this.ensureUser(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const statusFilter = String(query.status ?? query.type ?? '').trim().toUpperCase();

    const andFilters: Prisma.OrderWhereInput[] = [];

    if (keyword) {
      andFilters.push({
        OR: [
          { orderNo: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      });
    }

    if (statusFilter === 'PENDING_PAY' || statusFilter === 'PAY') {
      andFilters.push({
        payStatus: 0,
        orderStatus: PlatformDataService.ORDER_STATUS.PENDING,
        OR: [{ expireAt: null }, { expireAt: { gt: this.now() } }],
      });
    } else if (statusFilter === 'PENDING_SHIP' || statusFilter === 'SHIP') {
      andFilters.push({
        payStatus: 1,
        deliveryStatus: { in: [0, 1] },
        orderStatus: { in: [PlatformDataService.ORDER_STATUS.PENDING, PlatformDataService.ORDER_STATUS.ACCEPTED] },
        refundStatus: { in: [0, 4] },
      });
    } else if (statusFilter === 'PENDING_RECEIVE' || statusFilter === 'RECEIVE') {
      andFilters.push({
        payStatus: 1,
        deliveryStatus: 2,
        orderStatus: { not: PlatformDataService.ORDER_STATUS.COMPLETED },
        refundStatus: { in: [0, 4] },
      });
    } else if (statusFilter === 'REFUNDING' || statusFilter === 'REFUND' || statusFilter === 'AFTER_SALE') {
      andFilters.push({
        refundStatus: { in: [1, 2] },
      });
    } else if (statusFilter === 'COMPLETED' || statusFilter === 'DONE') {
      andFilters.push({
        orderStatus: PlatformDataService.ORDER_STATUS.COMPLETED,
      });
    } else if (statusFilter === 'CANCELLED') {
      andFilters.push({
        orderStatus: PlatformDataService.ORDER_STATUS.CANCELLED,
      });
    }

    const where: Prisma.OrderWhereInput = {
      userId: user.id,
      deletedAt: null,
      // 只返回子订单和普通订单（拼团等），不返回父订单聚合记录
      isParent: false,
      ...(andFilters.length ? { AND: andFilters } : {}),
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

  async getOrderDetail(authUser: AuthUser, orderNo: string) {
    const user = await this.ensureUser(authUser);
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
    const latestRefund = await this.prisma.refundApply.findFirst({
      where: { orderId: order.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const rejectReason = latestRefund
      ? String(latestRefund.adminRemark ?? latestRefund.merchantRemark ?? '').trim() || null
      : null;
    const refundInfo = latestRefund
      ? {
          refundNo: latestRefund.refundNo,
          applyType: latestRefund.applyType,
          applyTypeLabel: latestRefund.applyType === 2 ? '退货退款' : '仅退款',
          applyReason: latestRefund.applyReason,
          applyImages: this.normalizeRefundImages(latestRefund.applyImages),
          refundAmount: this.toMoney(latestRefund.refundAmount),
          status: latestRefund.status,
          statusLabel: this.getRefundStatusLabel(latestRefund.status),
          rejectReason,
          merchantRemark: latestRefund.merchantRemark,
          adminRemark: latestRefund.adminRemark,
          processedAt: this.toIso(latestRefund.processedAt),
          createdAt: this.toIso(latestRefund.createdAt),
        }
      : null;

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
      refund: refundInfo,
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

  async cancelOrder(authUser: AuthUser, orderNo: string) {
    const user = await this.ensureUser(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      select: { id: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true, parentOrderNo: true, isParent: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 子订单取消时，定位到父订单号；父订单/普通订单直接用本订单号
    const targetParentOrderNo = order.parentOrderNo ?? (order.isParent ? orderNo : null);

    // 收集本次取消涉及的所有订单（父 + 全部子；或单独订单）
    const ordersToCancel = targetParentOrderNo
        ? await this.prisma.order.findMany({
            where: {
              userId: user.id,
              OR: [
                { orderNo: targetParentOrderNo },
                { parentOrderNo: targetParentOrderNo },
              ],
            },
            select: { id: true, orderNo: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true, isParent: true },
          })
        : [order as any];

    // 校验所有订单都处于可取消状态
    for (const o of ordersToCancel) {
      if (o.orderStatus !== 1 || o.payStatus !== 0 || o.refundStatus !== 0) {
        throw new BadRequestException('仅待支付且无售后的订单可取消');
      }
    }

    // P0-6: 取消时恢复库存（聚合所有涉及订单的 items）
    const orderIds = ordersToCancel.map((o) => o.id);
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId: { in: orderIds }, deletedAt: null },
      select: { skuId: true, quantity: true },
    });

    // 优惠券是挂在父订单号上的（USED 状态）
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

  async confirmOrder(authUser: AuthUser, orderNo: string) {
    const user = await this.ensureUser(authUser);
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
            orderStatus: PlatformDataService.ORDER_STATUS.ACCEPTED,
            payStatus: PlatformDataService.PAY_STATUS.PAID,
            deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
            refundStatus: PlatformDataService.REFUND_STATUS.NONE,
          },
        ],
        '仅已发货待收货的订单可确认收货',
    );

    await this.prisma.order.update({
      where: { id: order.id, orderStatus: 2, payStatus: 1, deliveryStatus: 2, refundStatus: 0 },
      data: { orderStatus: 3, deliveryStatus: 2, completedAt: this.now() },
    });

    // 积分主流程已改为支付成功时发放；此处仅对历史已支付但未发积分的订单做一次补发（幂等）。
    await this.awardOrderEarnPoints(this.prisma, {
      userId: user.id,
      orderNo: order.orderNo,
      payAmount: order.payAmount,
      remark: '订单完成奖励',
    });

    const commissionRate = Number(order.merchant.commissionRate ?? 0.05);
    const commissionAmount = Number(order.payAmount) * commissionRate;
    const boundLeader = await this.prisma.leaderBinding.findUnique({ where: { userId: user.id } });
    const leaderId = order.leaderId ?? boundLeader?.leaderId ?? null;
    if (leaderId) {
      const leader = await this.prisma.communityLeader.findFirst({
        where: { id: leaderId, status: 'APPROVED', deletedAt: null },
      });
      const rate = leader ? Number(leader.commissionRate) : commissionRate;
      const amount = Number(order.payAmount) * rate;
      await this.prisma.leaderCommission.create({
        data: {
          userId: user.id,
          leaderId,
          orderId: order.id,
          orderNo: order.orderNo,
          orderAmount: new Prisma.Decimal(Number(order.payAmount).toFixed(2)),
          commissionRate: new Prisma.Decimal(rate.toFixed(4)),
          commissionAmount: new Prisma.Decimal(amount.toFixed(2)),
          status: 'PENDING_SETTLEMENT',
          remark: order.leaderId ? '自提订单分佣' : '订单完成分佣',
          boundLeaderId: boundLeader?.leaderId ?? leaderId,
        },
      });
    } else if (boundLeader) {
      await this.prisma.leaderCommission.create({
        data: {
          userId: user.id,
          orderNo: order.orderNo,
          commissionAmount: new Prisma.Decimal(commissionAmount.toFixed(2)),
          status: 'PENDING_SETTLEMENT',
          remark: '订单完成分佣',
          boundLeaderId: boundLeader.leaderId,
        },
      });
    }

    return { orderNo, status: 'COMPLETED' };
  }

  async createWechatPayment(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const orderNo = String(body.orderNo ?? '').trim();
    if (!orderNo) {
      throw new BadRequestException('Order number is required');
    }

    const order = await this.prisma.order.findFirst({ where: { orderNo, userId: user.id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payStatus === 1) {
      throw new BadRequestException('Order already paid');
    }

    if (order.orderStatus === 4) {
      throw new BadRequestException('Order has been cancelled');
    }

    if (order.expireAt && order.expireAt < new Date()) {
      throw new BadRequestException('Order has expired');
    }

    // P0-12: 事务内 find-or-create 防并发重复创建支付记录
    const payNo = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentRecord.findFirst({
        where: { orderNo: order.orderNo, userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return existing.payNo;
      }
      const newPayNo = `PAY${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      await tx.paymentRecord.create({
        data: {
          payNo: newPayNo,
          orderNo: order.orderNo,
          orderId: order.id,
          userId: user.id,
          payChannel: 1,
          amount: order.payAmount,
          payStatus: 0,
        },
      });
      return newPayNo;
    });

    return {
      appId: this.wechatAuthService.getMiniProgramAppId(),
      paymentNo: payNo,
      orderNo,
      prepayId: `prepay_${payNo}`,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: randomUUID().replace(/-/g, ''),
      package: `prepay_id=${payNo}`,
      packageVal: `prepay_id=${payNo}`,
      signType: 'RSA',
      paySign: createHash('sha256').update(`${payNo}:${orderNo}:${user.id.toString()}`).digest('hex'),
    };
  }

  async getWechatPaymentStatus(authUser: AuthUser, orderNo: string) {
    const user = await this.ensureUser(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      select: {
        orderNo: true,
        payStatus: true,
        payAmount: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const paid = order.payStatus === 1;
    return {
      orderNo: order.orderNo,
      paymentNo: `PAY${order.orderNo}`,
      tradeState: paid ? 'SUCCESS' : 'NOTPAY',
      tradeStateDesc: paid ? '支付成功' : '未支付',
      totalAmount: this.toMoney(order.payAmount),
      paidAt: paid ? order.paidAt : null,
      outTradeNo: order.orderNo,
      transactionId: paid ? `T${order.orderNo}` : null,
      complianceStatus: paid ? 'PASS' : 'PENDING',
      createdAt: order.createdAt,
    };
  }

  async getOrderLogisticsDetail(authUser: AuthUser, orderNo: string) {
    const user = await this.ensureUser(authUser);
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

  async handleWechatCallback(body: Record<string, unknown>) {
    const orderNo = String(body.orderNo ?? body.out_trade_no ?? '').trim();
    if (!orderNo) {
      return {
        received: true,
        processed: false,
      };
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNo },
      select: { id: true, payStatus: true, merchantId: true, payAmount: true, isParent: true, expireAt: true, userId: true, groupBuyId: true },
    });

    if (!order || order.payStatus === 1) {
      return {
        received: true,
        processed: false,
      };
    }

    if (order.expireAt && order.expireAt < new Date()) {
      return {
        received: true,
        processed: false,
        error: 'order_expired',
      };
    }

    // P0-9: 回调金额对账，防止金额篡改
    const callbackAmount = body.amount ?? body.total_fee ?? body.transaction_amount;
    if (callbackAmount != null) {
      const callbackAmountDecimal = new Prisma.Decimal(String(callbackAmount));
      if (!callbackAmountDecimal.equals(order.payAmount)) {
        this.logger.error(`Callback amount mismatch: order=${order.payAmount}, callback=${callbackAmountDecimal}, orderNo=${orderNo}`);
        return {
          received: true,
          processed: false,
          error: 'amount_mismatch',
        };
      }
    }

    // 若是父订单，同步更新所有挂在其下的子订单
    const childOrders = order.isParent
        ? await this.prisma.order.findMany({
            where: { parentOrderNo: orderNo },
            select: { id: true, merchantId: true, payAmount: true },
          })
        : [];

    const overflowRefunded = await this.prisma.$transaction(async (tx) => {
      // 父订单/普通订单本体置为已支付
      await tx.order.updateMany({
        where: { orderNo, payStatus: { not: 1 } },
        data: {
          payStatus: 1,
          orderStatus: 1,
          paidAt: this.now(),
        },
      });

      // 所有子订单同步置为已支付
      if (childOrders.length > 0) {
        await tx.order.updateMany({
          where: { parentOrderNo: orderNo, payStatus: { not: 1 } },
          data: {
            payStatus: 1,
            orderStatus: 1,
            paidAt: this.now(),
          },
        });
      }

      await tx.paymentRecord.updateMany({
        where: { orderNo },
        data: {
          payStatus: 1,
          paidAt: this.now(),
          callbackData: body as Prisma.InputJsonValue,
        },
      });

      // P0：拼团订单支付成功后才真正占用成团名额，若此时团已满员/已结束（并发竞态），
      // 则这笔钱直接走自动退款，不进入商家钱包，避免"钱付了但没入团、商家却已收到货款"。
      if (order.groupBuyId != null) {
        const refunded = await this.settleGroupBuyOrderPayment(tx, {
          orderId: order.id,
          orderNo,
          groupBuyId: order.groupBuyId,
          userId: order.userId,
        });
        if (refunded) {
          return true;
        }
      }

      // 商家钱包入账：父订单按各子订单 merchantId 分别入账；普通订单直接入账
      if (childOrders.length > 0) {
        const merchantTotals = new Map<bigint, Prisma.Decimal>();
        for (const child of childOrders) {
          const current = merchantTotals.get(child.merchantId) ?? new Prisma.Decimal('0.00');
          merchantTotals.set(child.merchantId, current.plus(child.payAmount));
        }
        for (const [merchantId, total] of merchantTotals.entries()) {
          await tx.merchantWallet.upsert({
            where: { merchantId },
            create: {
              merchantId,
              availableBalance: total,
              frozenBalance: new Prisma.Decimal('0.00'),
              totalIncome: total,
              totalWithdrawn: new Prisma.Decimal('0.00'),
            },
            update: {
              availableBalance: { increment: total },
              totalIncome: { increment: total },
            },
          });
        }
      } else {
        await tx.merchantWallet.upsert({
          where: { merchantId: order.merchantId },
          create: {
            merchantId: order.merchantId,
            availableBalance: order.payAmount,
            frozenBalance: new Prisma.Decimal('0.00'),
            totalIncome: order.payAmount,
            totalWithdrawn: new Prisma.Decimal('0.00'),
          },
          update: {
            availableBalance: { increment: order.payAmount },
            totalIncome: { increment: order.payAmount },
          },
        });
      }

      // 支付成功即按实付金额返还积分（同一订单幂等，不重复发放）
      await this.awardOrderEarnPoints(tx, {
        userId: order.userId,
        orderNo,
        payAmount: order.payAmount,
        remark: '订单支付奖励',
      });

      return false;
    });

    return {
      received: true,
      processed: !overflowRefunded,
    };
  }

  /**
   * 拼团订单支付成功后的结算：真正占用成团名额、判断是否成团。
   * 若团已结束(FAILED/COMPLETED)或恰好在并发下被其他人付款占满，
   * 则该笔订单自动退款（模拟退款：退库存/积分/优惠券，订单标记已退款）。
   *
   * @returns true 表示本次是"超员/团已结束"触发了自动退款（调用方应跳过商家钱包入账）
   */
  private async settleGroupBuyOrderPayment(
    tx: Prisma.TransactionClient,
    params: { orderId: bigint; orderNo: string; groupBuyId: bigint; userId: bigint },
  ): Promise<boolean> {
    const group = await tx.groupBuy.findUnique({
      where: { id: params.groupBuyId },
      include: { members: { select: { id: true, userId: true } } },
    });
    if (!group) {
      return false;
    }

    // 幂等：支付回调重复触发时不重复处理
    if (group.members.some((m) => m.userId === params.userId)) {
      return false;
    }

    const groupEnded = group.status !== 'OPEN' || group.expireAt < this.now();
    const groupFull = group.members.length >= group.needed;
    if (groupEnded || groupFull) {
      await this.autoRefundGroupBuyOrder(tx, params.orderId, groupEnded ? '拼团已结束，自动退款' : '拼团已满员，自动退款');
      return true;
    }

    await tx.groupBuyMember.create({
      data: {
        groupId: group.id,
        userId: params.userId,
        isInitiator: this.toNumber(group.initiatorId) === this.toNumber(params.userId),
        orderNo: params.orderNo,
      },
    });

    const newCount = group.members.length + 1;
    if (newCount >= group.needed) {
      await tx.groupBuy.update({
        where: { id: group.id },
        data: { status: 'COMPLETED', completedAt: this.now() },
      });
    }

    return false;
  }

  /**
   * 对一笔"已支付但无法计入拼团"的订单执行模拟退款：恢复库存、退还积分/优惠券，
   * 并把订单标记为已取消+已退款。用于支付回调里的并发超员/团已结束兜底，
   * 以及拼团超时失败后对已支付订单的批量退款（见 GroupBuyExpireService）。
   */
  private async autoRefundGroupBuyOrder(tx: Prisma.TransactionClient, orderId: bigint, reason: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { skuId: true, quantity: true } } },
    });
    if (!order) {
      return;
    }

    for (const item of order.items) {
      await tx.productSku.update({
        where: { id: item.skuId },
        data: { stock: { increment: item.quantity }, lockedStock: { decrement: item.quantity } },
      });
    }

    // 仅退还下单时抵扣的积分，避免误把「扣回支付奖励」的 DEDUCT 再退回去
    const pointsDeductLog = await tx.pointLog.findFirst({
      where: {
        sourceNo: order.orderNo,
        changeType: 'DEDUCT',
        remark: { in: ['订单抵扣积分', '拼团订单抵扣积分'] },
      },
    });
    if (pointsDeductLog) {
      const refundPoints = Math.abs(Number(pointsDeductLog.points));
      if (refundPoints > 0) {
        await tx.pointLog.create({
          data: {
            userId: order.userId,
            changeType: 'REFUND',
            points: refundPoints,
            sourceType: 'ORDER',
            sourceNo: order.orderNo,
            remark: reason,
          },
        });
      }
    }

    // 若该订单已发放支付奖励积分，一并扣回
    await this.clawBackOrderEarnPoints(tx, {
      userId: order.userId,
      orderNo: order.orderNo,
      remark: '订单退款扣回支付奖励积分',
    });

    await tx.userCoupon.updateMany({
      where: { orderNo: order.orderNo, status: 'USED' },
      data: { status: 'RECEIVED', usedAt: null, orderNo: null },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        orderStatus: PlatformDataService.ORDER_STATUS.CANCELLED,
        payStatus: PlatformDataService.PAY_STATUS.UNPAID,
        refundStatus: PlatformDataService.REFUND_STATUS.APPROVED,
        cancelReason: reason,
      },
    });
  }

  /**
   * 拼团成员发起售后/退款申请时，立即结束进行中的拼团并清理关联订单。
   * 仅处理 status=OPEN 的团，不影响已 COMPLETED 的团。
   */
  private async failOpenGroupBuyDueToRefund(
    groupBuyId: bigint,
    options?: { excludeOrderId?: bigint; reason?: string },
  ) {
    const reason = options?.reason ?? '拼团成员申请售后，拼团已结束';
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.groupBuy.updateMany({
        where: { id: groupBuyId, status: 'OPEN' },
        data: { status: 'FAILED' },
      });
      if (updated.count === 0) {
        return;
      }

      const pendingOrders = await tx.order.findMany({
        where: {
          groupBuyId,
          payStatus: PlatformDataService.PAY_STATUS.UNPAID,
          orderStatus: PlatformDataService.ORDER_STATUS.PENDING,
        },
        include: { items: true },
      });
      for (const order of pendingOrders) {
        for (const item of order.items) {
          await tx.productSku.update({
            where: { id: item.skuId },
            data: { stock: { increment: item.quantity }, lockedStock: { decrement: item.quantity } },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: PlatformDataService.ORDER_STATUS.CANCELLED,
            cancelReason: reason,
          },
        });
      }

      const paidOrders = await tx.order.findMany({
        where: {
          groupBuyId,
          payStatus: PlatformDataService.PAY_STATUS.PAID,
          refundStatus: PlatformDataService.REFUND_STATUS.NONE,
          orderStatus: {
            in: [PlatformDataService.ORDER_STATUS.PENDING, PlatformDataService.ORDER_STATUS.ACCEPTED],
          },
          ...(options?.excludeOrderId != null ? { id: { not: options.excludeOrderId } } : {}),
        },
        select: { id: true },
      });
      for (const paidOrder of paidOrders) {
        await this.autoRefundGroupBuyOrder(tx, paidOrder.id, reason);
      }
    });
  }

  async applyMerchant(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);

    const merchant = await this.prisma.merchant.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        storeName: String(body.storeName ?? `${user.nickname ?? '商户'}店铺`),
        storeLogo: typeof body.storeLogo === 'string' ? body.storeLogo : null,
        contactName: String(body.contactName ?? user.nickname ?? '联系人'),
        contactMobile: String(body.contactMobile ?? user.mobile ?? '13800000000'),
        status: 2,
      },
      update: {
        storeName: String(body.storeName ?? `${user.nickname ?? '商户'}店铺`),
        storeLogo: typeof body.storeLogo === 'string' ? body.storeLogo : null,
        contactName: String(body.contactName ?? user.nickname ?? '联系人'),
        contactMobile: String(body.contactMobile ?? user.mobile ?? '13800000000'),
        status: 2,
      },
    });

    const qualifications = Array.isArray(body.qualifications) ? body.qualifications : [];
    await this.prisma.$transaction(async (tx) => {
      await tx.merchantQualification.deleteMany({
        where: { merchantId: merchant.id },
      });
      if (qualifications.length > 0) {
        await tx.merchantQualification.createMany({
          data: qualifications.map((q: any) => ({
            merchantId: merchant.id,
            qualificationType: String(q.qualificationType ?? 'BUSINESS_LICENSE'),
            fileName: String(q.fileName ?? '资质证书'),
            fileUrl: String(q.fileUrl ?? ''),
            status: 2,
          })),
        });
      }
    });

    return {
      merchantId: this.toNumber(merchant.id),
      applicationNo: `MA${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      status: 'PENDING_AUDIT',
      input: body,
    };
  }

  async createMerchantProduct(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const categoryId = body.categoryId ? Number(body.categoryId) : this.toNumber(categories[0]?.id ?? 0);
    const imageUrls = Array.isArray(body.images)
        ? body.images.filter((item) => typeof item === 'string')
        : Array.isArray(body.imageUrls)
            ? body.imageUrls.filter((item) => typeof item === 'string')
            : [];
    const videoItems = Array.isArray(body.videos)
        ? body.videos.filter((item) => item && typeof item === 'object')
        : [];
    const skuItems = Array.isArray(body.skus) && body.skus.length > 0 ? body.skus.filter((item) => item && typeof item === 'object') : [];
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
        // 品牌与商家扩展
        brand: typeof body.brand === 'string' ? body.brand : null,
        supplierName: typeof body.supplierName === 'string' ? body.supplierName : null,
        ingredients: typeof body.ingredients === 'string' ? body.ingredients : null,
        // 规格与尺寸参数
        shelfLife: typeof body.shelfLife === 'string' ? body.shelfLife : null,
        productionDate: typeof body.productionDate === 'string' ? body.productionDate : null,
        material: typeof body.material === 'string' ? body.material : null,
        dimensions: typeof body.dimensions === 'string' ? body.dimensions : null,
        // 备货与配送限制
        leadTime: typeof body.leadTime === 'string' ? body.leadTime : null,
        shippingRestrictedRegions: typeof body.shippingRestrictedRegions === 'string' ? body.shippingRestrictedRegions : null,
        afterSalesCommitment: typeof body.afterSalesCommitment === 'string' ? body.afterSalesCommitment : null,
        logisticsCompany: typeof body.logisticsCompany === 'string' ? body.logisticsCompany : null,
        // 直播与运营属性
        productNature: typeof body.productNature === 'string' ? body.productNature : null,
        liveCities: typeof body.liveCities === 'string' ? body.liveCities : null,
        sessionAttribute: typeof body.sessionAttribute === 'string' ? body.sessionAttribute : null,
        liveMechanism: typeof body.liveMechanism === 'string' ? body.liveMechanism : null,
      },
    });

    if (skuItems.length > 0) {
      await this.prisma.productSku.createMany({
        data: skuItems.map((sku, index) => ({
          productId: created.id,
          skuName: String((sku as Record<string, unknown>).skuName ?? (sku as Record<string, unknown>).name ?? `规格${index + 1}`),
          skuCode: String((sku as Record<string, unknown>).skuCode ?? `SKU${created.id.toString()}${index + 1}`),
          imageUrl:
              typeof (sku as Record<string, unknown>).imageUrl === 'string'
                  ? String((sku as Record<string, unknown>).imageUrl)
                  : typeof (sku as Record<string, unknown>).skuImageUrl === 'string'
                      ? String((sku as Record<string, unknown>).skuImageUrl)
                      : null,
          ...(typeof (sku as Record<string, unknown>).specJson !== 'undefined'
              ? { specJson: (sku as Record<string, unknown>).specJson as Prisma.InputJsonValue }
              : typeof (sku as Record<string, unknown>).spec !== 'undefined'
                  ? { specJson: (sku as Record<string, unknown>).spec as Prisma.InputJsonValue }
                  : {}),
          price: new Prisma.Decimal(String((sku as Record<string, unknown>).price ?? defaultPrice)),
          originalPrice: new Prisma.Decimal(
              String((sku as Record<string, unknown>).originalPrice ?? (sku as Record<string, unknown>).price ?? defaultPrice),
          ),
          offlinePrice: (sku as Record<string, unknown>).offlinePrice ? new Prisma.Decimal(String((sku as Record<string, unknown>).offlinePrice)) : null,
          stock: Number((sku as Record<string, unknown>).stock ?? 0),
          lockedStock: Number((sku as Record<string, unknown>).lockedStock ?? 0),
          safetyStock: (sku as Record<string, unknown>).safetyStock ? Number((sku as Record<string, unknown>).safetyStock) : null,
          status: Number((sku as Record<string, unknown>).status ?? 1),
        })),
      });
    } else {
      await this.prisma.productSku.create({
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

    if (imageUrls.length > 0) {
      await this.prisma.productImage.createMany({
        data: imageUrls.map((imageUrl, index) => ({
          productId: created.id,
          imageUrl,
          sortOrder: index + 1,
        })),
      });
    }

    if (videoItems.length > 0) {
      await this.prisma.productVideo.createMany({
        data: videoItems.map((video, index) => ({
          productId: created.id,
          videoUrl: String((video as Record<string, unknown>).videoUrl ?? ''),
          coverUrl: typeof (video as Record<string, unknown>).coverUrl === 'string' ? String((video as Record<string, unknown>).coverUrl) : null,
          sortOrder: index + 1,
        })),
      });
    }

    if (traceInfo) {
      const traceCode =
          typeof traceInfo === 'object' && traceInfo !== null && 'traceCode' in traceInfo
              ? String((traceInfo as Record<string, unknown>).traceCode ?? `TRACE${created.id.toString()}`)
              : `TRACE${created.id.toString()}`;
      const traceDesc =
          typeof traceInfo === 'object' && traceInfo !== null && 'traceDesc' in traceInfo
              ? String((traceInfo as Record<string, unknown>).traceDesc ?? '')
              : typeof traceInfo === 'string'
                  ? traceInfo
                  : '';

      await this.prisma.productTrace.create({
        data: {
          productId: created.id,
          traceCode,
          traceDesc,
          traceJson: traceInfo as Prisma.InputJsonValue,
        },
      });
    }

    return {
      productId: this.toNumber(created.id),
      status: 'DRAFT',
      input: body,
    };
  }

  async createAdminProduct(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    const merchant = merchantScope != null
      ? await this.prisma.merchant.findFirst({ where: { id: BigInt(merchantScope), deletedAt: null } })
      : await this.ensurePlatformMerchant();
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const categoryId = body.categoryId ? Number(body.categoryId) : this.toNumber(categories[0]?.id ?? 0);
    if (!categoryId) {
      throw new BadRequestException('Category is required');
    }

    const imageUrls = Array.isArray(body.images)
        ? body.images.filter((item) => typeof item === 'string')
        : Array.isArray(body.imageUrls)
            ? body.imageUrls.filter((item) => typeof item === 'string')
            : [];
    const videoItems = Array.isArray(body.videos)
        ? body.videos.filter((item) => item && typeof item === 'object')
        : [];
    const skuItems = Array.isArray(body.skus) && body.skus.length > 0 ? body.skus.filter((item) => item && typeof item === 'object') : [];
    const serviceTags = this.normalizeProductServiceTags(body.serviceTags, Number(body.deliveryType ?? 1));
    const traceInfo = body.traceInfo ?? body.trace;
    const defaultPrice = String(body.price ?? '0.00');
    const isMerchantEditor = merchantScope != null;
    const publishImmediately = isMerchantEditor
      ? false
      : body.publishImmediately == null
        ? true
        : Boolean(body.publishImmediately);
    const groupBuyConfig = this.normalizeGroupBuyConfig(
      body.groupBuyConfig as Prisma.JsonValue | Record<string, unknown> | null | undefined,
    );

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
        status: publishImmediately ? 1 : 0,
        auditStatus: publishImmediately ? 2 : 1,
        auditRemark: publishImmediately ? '平台后台直接发布' : null,
        isPreSale: Boolean(body.isPreSale ?? false),
        isHot: Boolean(body.isHot ?? false),
        groupBuyConfig: groupBuyConfig ?? undefined,
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

    if (skuItems.length > 0) {
      await this.prisma.productSku.createMany({
        data: skuItems.map((sku, index) => ({
          productId: created.id,
          skuName: String((sku as Record<string, unknown>).skuName ?? (sku as Record<string, unknown>).name ?? `规格${index + 1}`),
          skuCode: String((sku as Record<string, unknown>).skuCode ?? `SKU${created.id.toString()}${index + 1}`),
          imageUrl:
              typeof (sku as Record<string, unknown>).imageUrl === 'string'
                  ? String((sku as Record<string, unknown>).imageUrl)
                  : typeof (sku as Record<string, unknown>).skuImageUrl === 'string'
                      ? String((sku as Record<string, unknown>).skuImageUrl)
                      : null,
          ...(typeof (sku as Record<string, unknown>).specJson !== 'undefined'
              ? { specJson: (sku as Record<string, unknown>).specJson as Prisma.InputJsonValue }
              : typeof (sku as Record<string, unknown>).spec !== 'undefined'
                  ? { specJson: (sku as Record<string, unknown>).spec as Prisma.InputJsonValue }
                  : {}),
          price: new Prisma.Decimal(String((sku as Record<string, unknown>).price ?? defaultPrice)),
          originalPrice: new Prisma.Decimal(
              String((sku as Record<string, unknown>).originalPrice ?? (sku as Record<string, unknown>).price ?? defaultPrice),
          ),
          offlinePrice: (sku as Record<string, unknown>).offlinePrice ? new Prisma.Decimal(String((sku as Record<string, unknown>).offlinePrice)) : null,
          stock: Number((sku as Record<string, unknown>).stock ?? 0),
          lockedStock: Number((sku as Record<string, unknown>).lockedStock ?? 0),
          safetyStock: (sku as Record<string, unknown>).safetyStock ? Number((sku as Record<string, unknown>).safetyStock) : null,
          status: Number((sku as Record<string, unknown>).status ?? 1),
        })),
      });
    } else {
      await this.prisma.productSku.create({
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

    if (imageUrls.length > 0) {
      await this.prisma.productImage.createMany({
        data: imageUrls.map((imageUrl, index) => ({
          productId: created.id,
          imageUrl,
          sortOrder: index + 1,
        })),
      });
    }

    if (videoItems.length > 0) {
      await this.prisma.productVideo.createMany({
        data: videoItems.map((video, index) => ({
          productId: created.id,
          videoUrl: String((video as Record<string, unknown>).videoUrl ?? ''),
          coverUrl: typeof (video as Record<string, unknown>).coverUrl === 'string' ? String((video as Record<string, unknown>).coverUrl) : null,
          sortOrder: index + 1,
        })),
      });
    }

    if (traceInfo) {
      const traceCode =
          typeof traceInfo === 'object' && traceInfo !== null && 'traceCode' in traceInfo
              ? String((traceInfo as Record<string, unknown>).traceCode ?? `TRACE${created.id.toString()}`)
              : `TRACE${created.id.toString()}`;
      const traceDesc =
          typeof traceInfo === 'object' && traceInfo !== null && 'traceDesc' in traceInfo
              ? String((traceInfo as Record<string, unknown>).traceDesc ?? '')
              : typeof traceInfo === 'string'
                  ? traceInfo
                  : '';

      await this.prisma.productTrace.create({
        data: {
          productId: created.id,
          traceCode,
          traceDesc,
          traceJson: traceInfo as Prisma.InputJsonValue,
        },
      });
    }

    await this.recordAdminOperation(authUser, 'CREATE_PLATFORM_PRODUCT', '平台商品', created.id, {
      title: created.title,
      categoryId,
      merchantId: this.toNumber(merchant.id),
      publishImmediately,
    });

    return {
      productId: this.toNumber(created.id),
      merchantId: this.toNumber(merchant.id),
      status: publishImmediately ? 'ON_SHELF' : 'DRAFT',
      auditStatus: publishImmediately ? 'APPROVED' : 'PENDING_AUDIT',
      input: body,
    };
  }

  async getAdminProductDetail(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId), deletedAt: null },
      include: {
        merchant: true,
        category: true,
        skus: { orderBy: { id: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        videos: { orderBy: { sortOrder: 'asc' } },
        traces: { orderBy: { id: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const trace = product.traces[0];

    return {
      id: this.toNumber(product.id),
      categoryId: this.toNumber(product.categoryId),
      merchantId: this.toNumber(product.merchantId),
      merchantStoreName: product.merchant.storeName,
      categoryName: product.category.name,
      title: product.title,
      subtitle: product.subtitle,
      coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
      detailDesc: product.detailDesc,
      originPlace: this.normalizeOriginPlace(product.originPlace),
      brand: product.brand,
      supplierName: product.supplierName,
      status: product.status === 1 ? 'ON_SHELF' : 'OFF_SHELF',
      auditStatus: product.auditStatus === 1 ? 'PENDING_AUDIT' : product.auditStatus === 2 ? 'APPROVED' : 'REJECTED',
      deliveryType: product.deliveryType ?? 1,
      serviceTags: this.normalizeProductServiceTags(product.serviceTags, product.deliveryType),
      isPreSale: product.isPreSale,
      isHot: product.isHot,
      groupBuyConfig: this.normalizeGroupBuyConfig(product.groupBuyConfig),
      images: product.images.map((image) => this.resolvePublicUrl(image.imageUrl) ?? ''),
      videos: product.videos.map((video) => ({
        videoUrl: this.resolvePublicUrl(video.videoUrl) ?? '',
        coverUrl: this.resolvePublicUrl(video.coverUrl) ?? '',
      })),
      traceCode: trace?.traceCode ?? '',
      traceDesc: trace?.traceDesc ?? '',
      skus: product.skus.map((sku) => ({
        id: this.toNumber(sku.id),
        skuName: sku.skuName,
        skuCode: sku.skuCode,
        imageUrl: this.resolvePublicUrl(sku.imageUrl) ?? '',
        price: this.toMoney(sku.price),
        originalPrice: this.toMoney(sku.originalPrice ?? sku.price),
        stock: sku.stock,
        specJson: (sku.specJson ?? {}) as Record<string, string>,
      })),
    };
  }

  async updateAdminProduct(productId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const oldProduct = await this.prisma.product.findFirst({
      where: { id: BigInt(productId), deletedAt: null },
    });

    if (!oldProduct) {
      throw new NotFoundException('Product not found');
    }

    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    if (merchantScope != null && this.toNumber(oldProduct.merchantId) !== merchantScope) {
      throw new ForbiddenException('只能修改本店商品');
    }

    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const categoryId = body.categoryId ? Number(body.categoryId) : this.toNumber(categories[0]?.id ?? 0);
    if (!categoryId) {
      throw new BadRequestException('Category is required');
    }

    const imageUrls = Array.isArray(body.images)
        ? body.images.filter((item) => typeof item === 'string')
        : Array.isArray(body.imageUrls)
            ? body.imageUrls.filter((item) => typeof item === 'string')
            : [];
    const videoItems = Array.isArray(body.videos)
        ? body.videos.filter((item) => item && typeof item === 'object')
        : [];
    const skuItems = Array.isArray(body.skus) && body.skus.length > 0 ? body.skus.filter((item) => item && typeof item === 'object') : [];
    const serviceTags = this.normalizeProductServiceTags(body.serviceTags, Number(body.deliveryType ?? oldProduct.deliveryType ?? 1));
    const traceInfo = body.traceInfo ?? body.trace;
    const defaultPrice = String(body.price ?? '0.00');
    // 商户改任意信息必须回待审；平台管理员可直接发布
    const isMerchantEditor = merchantScope != null;
    const publishImmediately = isMerchantEditor
      ? false
      : body.publishImmediately == null
        ? oldProduct.status === 1
        : Boolean(body.publishImmediately);
    const groupBuyConfig = this.normalizeGroupBuyConfig(
      body.groupBuyConfig as Prisma.JsonValue | Record<string, unknown> | null | undefined,
      oldProduct.groupBuyConfig ?? null,
    );

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
        status: publishImmediately ? 1 : 0,
        auditStatus: publishImmediately ? 2 : 1,
        isPreSale: body.isPreSale != null ? Boolean(body.isPreSale) : oldProduct.isPreSale,
        isHot: body.isHot != null ? Boolean(body.isHot) : oldProduct.isHot,
        groupBuyConfig: groupBuyConfig ?? undefined,
        brand: typeof body.brand === 'string' ? body.brand : null,
        supplierName: typeof body.supplierName === 'string' ? body.supplierName : null,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.productSku.deleteMany({ where: { productId: updated.id } });
      if (skuItems.length > 0) {
        await tx.productSku.createMany({
          data: skuItems.map((sku, index) => ({
            productId: updated.id,
            skuName: String((sku as Record<string, unknown>).skuName ?? (sku as Record<string, unknown>).name ?? `规格${index + 1}`),
            skuCode: String((sku as Record<string, unknown>).skuCode ?? `SKU${updated.id.toString()}${index + 1}`),
            imageUrl:
                typeof (sku as Record<string, unknown>).imageUrl === 'string'
                    ? String((sku as Record<string, unknown>).imageUrl)
                    : typeof (sku as Record<string, unknown>).skuImageUrl === 'string'
                        ? String((sku as Record<string, unknown>).skuImageUrl)
                        : null,
            price: new Prisma.Decimal(String((sku as Record<string, unknown>).price ?? defaultPrice)),
            originalPrice: new Prisma.Decimal(
                String((sku as Record<string, unknown>).originalPrice ?? (sku as Record<string, unknown>).price ?? defaultPrice),
            ),
            stock: Number((sku as Record<string, unknown>).stock ?? 0),
            lockedStock: 0,
            status: 1,
          })),
        });
      } else {
        await tx.productSku.create({
          data: {
            productId: updated.id,
            skuName: String(body.skuName ?? '默认规格'),
            skuCode: String(body.skuCode ?? `SKU${updated.id.toString()}1`),
            imageUrl: typeof body.skuImageUrl === 'string' ? body.skuImageUrl : null,
            price: new Prisma.Decimal(defaultPrice),
            originalPrice: new Prisma.Decimal(String(body.originalPrice ?? defaultPrice)),
            stock: Number(body.stock ?? 0),
            lockedStock: 0,
            status: 1,
          },
        });
      }

      await tx.productImage.deleteMany({ where: { productId: updated.id } });
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((imageUrl, index) => ({
            productId: updated.id,
            imageUrl,
            sortOrder: index + 1,
          })),
        });
      }

      await tx.productVideo.deleteMany({ where: { productId: updated.id } });
      if (videoItems.length > 0) {
        await tx.productVideo.createMany({
          data: videoItems.map((video, index) => ({
            productId: updated.id,
            videoUrl: String((video as Record<string, unknown>).videoUrl ?? ''),
            coverUrl: typeof (video as Record<string, unknown>).coverUrl === 'string' ? String((video as Record<string, unknown>).coverUrl) : null,
            sortOrder: index + 1,
          })),
        });
      }
    });

    await this.recordAdminOperation(authUser, 'UPDATE_PLATFORM_PRODUCT', '平台商品', updated.id, {
      title: updated.title,
      categoryId,
      publishImmediately,
    });

    return {
      productId: this.toNumber(updated.id),
      status: publishImmediately ? 'ON_SHELF' : 'DRAFT',
    };
  }

  async deleteAdminProduct(productId: number, authUser?: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId), deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: { deletedAt: new Date() },
    });

    await this.recordAdminOperation(authUser, 'DELETE_PLATFORM_PRODUCT', '平台商品', product.id, {
      title: product.title,
    });

    return { success: true };
  }

  async getMerchantProductDetail(authUser: AuthUser, productId: number) {
    const merchant = await this.ensureCurrentMerchant(authUser);
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
      videos: product.videos.map((vid) => ({
        videoUrl: this.resolvePublicUrl(vid.videoUrl) ?? '',
        coverUrl: this.resolvePublicUrl(vid.coverUrl) ?? '',
      })),
      serviceTags: this.normalizeProductServiceTags(product.serviceTags, product.deliveryType),
      traceCode: trace ? trace.traceCode : '',
      traceDesc: trace ? trace.traceDesc : '',
      // 品牌与商家扩展
      brand: product.brand ?? '',
      supplierName: product.supplierName ?? '',
      ingredients: product.ingredients ?? '',
      // 规格与尺寸参数
      shelfLife: product.shelfLife ?? '',
      productionDate: product.productionDate ?? '',
      material: product.material ?? '',
      dimensions: product.dimensions ?? '',
      // 备货与配送限制
      leadTime: product.leadTime ?? '',
      shippingRestrictedRegions: product.shippingRestrictedRegions ?? '',
      afterSalesCommitment: product.afterSalesCommitment ?? '',
      logisticsCompany: product.logisticsCompany ?? '',
      // 直播与运营属性
      productNature: product.productNature ?? '',
      liveCities: product.liveCities ?? '',
      sessionAttribute: product.sessionAttribute ?? '',
      liveMechanism: product.liveMechanism ?? '',
    };
  }

  async updateMerchantProduct(authUser: AuthUser, productId: number, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);

    const oldProduct = await this.prisma.product.findFirst({
      where: { id: BigInt(productId), merchantId: merchant.id, deletedAt: null },
    });

    if (!oldProduct) {
      throw new NotFoundException('Product not found');
    }

    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const categoryId = body.categoryId ? Number(body.categoryId) : this.toNumber(categories[0]?.id ?? 0);
    const imageUrls = Array.isArray(body.images)
        ? body.images.filter((item) => typeof item === 'string')
        : Array.isArray(body.imageUrls)
            ? body.imageUrls.filter((item) => typeof item === 'string')
            : [];
    const videoItems = Array.isArray(body.videos)
        ? body.videos.filter((item) => item && typeof item === 'object')
        : [];
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
        // 品牌与商家扩展
        brand: typeof body.brand === 'string' ? body.brand : null,
        supplierName: typeof body.supplierName === 'string' ? body.supplierName : null,
        ingredients: typeof body.ingredients === 'string' ? body.ingredients : null,
        // 规格与尺寸参数
        shelfLife: typeof body.shelfLife === 'string' ? body.shelfLife : null,
        productionDate: typeof body.productionDate === 'string' ? body.productionDate : null,
        material: typeof body.material === 'string' ? body.material : null,
        dimensions: typeof body.dimensions === 'string' ? body.dimensions : null,
        // 备货与配送限制
        leadTime: typeof body.leadTime === 'string' ? body.leadTime : null,
        shippingRestrictedRegions: typeof body.shippingRestrictedRegions === 'string' ? body.shippingRestrictedRegions : null,
        afterSalesCommitment: typeof body.afterSalesCommitment === 'string' ? body.afterSalesCommitment : null,
        logisticsCompany: typeof body.logisticsCompany === 'string' ? body.logisticsCompany : null,
        // 直播与运营属性
        productNature: typeof body.productNature === 'string' ? body.productNature : null,
        liveCities: typeof body.liveCities === 'string' ? body.liveCities : null,
        sessionAttribute: typeof body.sessionAttribute === 'string' ? body.sessionAttribute : null,
        liveMechanism: typeof body.liveMechanism === 'string' ? body.liveMechanism : null,
      },
    });

    // P0-11: 子记录删除和重建包裹在事务中，防止部分失败导致数据丢失
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
          data: imageUrls.map((imageUrl, index) => ({
            productId: updated.id,
            imageUrl,
            sortOrder: index + 1,
          })),
        });
      }

      await tx.productVideo.deleteMany({ where: { productId: updated.id } });
      if (videoItems.length > 0) {
        await tx.productVideo.createMany({
          data: videoItems.map((video, index) => ({
            productId: updated.id,
            videoUrl: String((video as Record<string, unknown>).videoUrl ?? ''),
            coverUrl: typeof (video as Record<string, unknown>).coverUrl === 'string' ? String((video as Record<string, unknown>).coverUrl) : null,
            sortOrder: index + 1,
          })),
        });
      }

      await tx.productTrace.deleteMany({ where: { productId: updated.id } });
      if (traceInfo) {
        const traceCode =
            typeof traceInfo === 'object' && traceInfo !== null && 'traceCode' in traceInfo
                ? String((traceInfo as Record<string, unknown>).traceCode ?? `TRACE${updated.id.toString()}`)
                : `TRACE${updated.id.toString()}`;
        const traceDesc =
            typeof traceInfo === 'object' && traceInfo !== null && 'traceDesc' in traceInfo
                ? String((traceInfo as Record<string, unknown>).traceDesc ?? '')
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
    let isMerchantActor = false;
    if (authUser) {
      if (authUser.role === RoleCode.MERCHANT || authUser.role === RoleCode.USER) {
        const merchant = await this.ensureCurrentMerchant(authUser);
        where.merchantId = merchant.id;
        isMerchantActor = true;
      } else if (authUser.role === RoleCode.ADMIN) {
        const merchantScope = await this.resolveAdminMerchantScope(authUser);
        if (merchantScope != null) {
          where.merchantId = BigInt(merchantScope);
          isMerchantActor = true;
        }
      }
    }

    const newStatus = String(body.status ?? 'ON_SHELF') === 'ON_SHELF' ? 1 : 0;

    // P0-5: 下架时检查是否有未完成的有效订单
    let activeOrderCount = 0;
    if (newStatus === 0) {
      const skuIds = await this.prisma.productSku.findMany({
        where: { productId: BigInt(productId), deletedAt: null },
        select: { id: true },
      });
      if (skuIds.length > 0) {
        activeOrderCount = await this.prisma.orderItem.count({
          where: {
            skuId: { in: skuIds.map((s) => s.id) },
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

    // 商户自行上下架：上架也需重新审核
    const result = await this.prisma.product.updateMany({
      where,
      data: isMerchantActor
        ? {
            status: 0,
            auditStatus: 1,
            auditRemark: newStatus === 1 ? '商户申请上架，待平台审核' : '商户已下架，待平台确认',
          }
        : { status: newStatus },
    });

    if (result.count === 0) {
      throw new NotFoundException('Product not found');
    }

    // P4-2: 管理员下架时向商家推送系统消息
    if (newStatus === 0 && !authUser) {
      const product = await this.prisma.product.findUnique({
        where: { id: BigInt(productId) },
        include: { merchant: true },
      });
      if (product?.merchant) {
        const message = await this.prisma.systemMessage.create({
          data: {
            type: 'NOTIFICATION',
            title: '商品被下架通知',
            summary: `您的商品「${product.title}」已被平台管理员下架${typeof body.remark === 'string' && body.remark ? `，原因：${body.remark}` : ''}`,
            contentType: 'TEXT',
            contentJson: {
              productId,
              productTitle: product.title,
              reason: typeof body.remark === 'string' ? body.remark : null,
              removedAt: this.now().toISOString(),
            } as Prisma.InputJsonValue,
            senderType: 'SYSTEM',
            bizType: 'PRODUCT_TAKEDOWN',
            bizId: String(productId),
            publishAt: this.now(),
            status: 'PUBLISHED',
          },
        });
        await this.prisma.userMessage.create({
          data: {
            userId: product.merchant.userId,
            messageId: message.id,
            isRead: false,
            deliveredAt: this.now(),
          },
        });
      }
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
      const merchant = await this.ensureCurrentMerchant(authUser);
      where.product = { is: { merchantId: merchant.id } };
    }

    const result = await this.prisma.productSku.updateMany({
      where,
      data: {
        stock: Number(body.stock ?? 0),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('SKU not found');
    }

    return {
      skuId,
      stock: body.stock ?? 0,
    };
  }

  async listMerchantOrders(authUser: AuthUser, query: Record<string, string> = {}) {
    const merchant = await this.ensureCurrentMerchant(authUser);
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
    const merchant = await this.ensureCurrentMerchant(authUser);
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
    const merchant = await this.ensureCurrentMerchant(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, merchantId: merchant.id, isParent: false },
      select: { id: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true, groupBuyId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateOrderStateTransition(
        order,
        [
          {
            orderStatus: PlatformDataService.ORDER_STATUS.PENDING,
            payStatus: PlatformDataService.PAY_STATUS.PAID,
            refundStatus: PlatformDataService.REFUND_STATUS.NONE,
          },
        ],
        '仅已支付的待接单订单可接单',
    );

    // P0：未成团的拼团订单禁止接单/发货，避免团失败后已发货造成资损
    await this.assertGroupBuyFulfillable(order.groupBuyId);

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
    const merchant = await this.ensureCurrentMerchant(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, merchantId: merchant.id, isParent: false },
      select: { id: true, orderStatus: true, payStatus: true, deliveryStatus: true, refundStatus: true, groupBuyId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateOrderStateTransition(
        order,
        [
          {
            orderStatus: PlatformDataService.ORDER_STATUS.ACCEPTED,
            payStatus: PlatformDataService.PAY_STATUS.PAID,
            deliveryStatus: PlatformDataService.DELIVERY_STATUS.TO_SHIP,
            refundStatus: PlatformDataService.REFUND_STATUS.NONE,
          },
        ],
        '仅已接单待发货的订单可发货',
    );

    // P0：未成团的拼团订单禁止接单/发货，避免团失败后已发货造成资损
    await this.assertGroupBuyFulfillable(order.groupBuyId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: 2, orderStatus: 2 },
    });

    const trackingNo = typeof body.trackingNo === 'string' ? body.trackingNo : `DL${randomUUID().replace(/-/g, '').slice(0, 12)}`;
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

  async processRefund(authUser: AuthUser, refundNo: string, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const refund = await this.prisma.refundApply.findFirst({
      where: { refundNo, merchantId: merchant.id },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 1 && refund.status !== 2) {
      throw new BadRequestException('Refund cannot be processed');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: refund.orderId },
      select: { orderStatus: true },
    });
    if (!order || order.orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('订单已取消，不可处理退款');
    }

    const isApprove = String(body.action ?? 'approve') !== 'reject';
    const status = isApprove ? 3 : 4;

    // P0-6: 获取订单项信息用于库存恢复
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: refund.orderItemId },
      select: { skuId: true, quantity: true },
    });

    if (isApprove) {
      const wallet = await this.prisma.merchantWallet.findUnique({
        where: { merchantId: merchant.id },
      });
      if (!wallet || wallet.availableBalance.lt(refund.refundAmount)) {
        throw new BadRequestException('商户余额不足，无法退款');
      }
    }

    const remark = String(body.remark ?? body.merchantRemark ?? '').trim();

    await this.prisma.$transaction(async (tx) => {
      // P0-7: 使用 CAS 条件更新防止重复退款
      const updated = await tx.refundApply.updateMany({
        where: { id: refund.id, status: { in: [1, 2] } },
        data: {
          status,
          merchantRemark: remark || null,
          processedAt: this.now(),
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException('退款状态已变更，请刷新后重试');
      }

      await tx.order.updateMany({
        where: { id: refund.orderId },
        data: { refundStatus: status },
      });

      if (isApprove) {
        await tx.merchantWallet.update({
          where: { merchantId: merchant.id },
          data: {
            availableBalance: { decrement: refund.refundAmount },
          },
        });

        // P0-6: 退款同意后恢复库存
        if (orderItem) {
          await tx.productSku.update({
            where: { id: orderItem.skuId },
            data: {
              stock: { increment: orderItem.quantity },
              lockedStock: { decrement: orderItem.quantity },
            },
          });
        }

        await tx.pointLog.create({
          data: {
            userId: refund.userId,
            changeType: 'DEDUCT',
            points: -Math.max(Math.floor(Number(refund.refundAmount)), 0),
            sourceType: 'REFUND',
            sourceNo: refund.refundNo,
            remark: '退款扣回积分',
          },
        });
      }
    });

    return {
      refundNo,
      status: isApprove ? 'APPROVED' : 'REJECTED',
      result: body.action ?? 'approve',
      remark: remark || 'ok',
    };
  }

  async getWallet(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const wallet = await this.prisma.merchantWallet.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        availableBalance: new Prisma.Decimal('0.00'),
        frozenBalance: new Prisma.Decimal('0.00'),
        totalIncome: new Prisma.Decimal('0.00'),
        totalWithdrawn: new Prisma.Decimal('0.00'),
      },
      update: {},
    });

    return {
      availableAmount: this.toMoney(wallet.availableBalance),
      frozenAmount: this.toMoney(wallet.frozenBalance),
      totalIncome: this.toMoney(wallet.totalIncome),
      totalWithdrawn: this.toMoney(wallet.totalWithdrawn),
    };
  }

  async getMerchantFinanceRecords(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);

    const orders = await this.prisma.order.findMany({
      where: { merchantId: merchant.id, payStatus: 1, isParent: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const withdrawals = await this.prisma.withdrawApply.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const refunds = await this.prisma.refundApply.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const list: Array<{
      key: string;
      title: string;
      desc: string;
      amount: string;
      tone: 'green' | 'warn' | 'blue' | 'danger';
      date: Date;
    }> = [];

    orders.forEach((order) => {
      list.push({
        key: `ORDER_${order.orderNo}`,
        title: '订单收入',
        desc: `${order.orderNo} · 买家支付`,
        amount: `+ ¥${this.toMoney(order.payAmount)}`,
        tone: 'green',
        date: order.createdAt,
      });
    });

    withdrawals.forEach((w) => {
      let statusLabel = '待审核';
      let tone: 'green' | 'warn' | 'blue' | 'danger' = 'warn';
      if (w.status === 2) {
        statusLabel = '提现成功';
        tone = 'blue';
      } else if (w.status === 3) {
        statusLabel = '已拒绝';
        tone = 'danger';
      }
      list.push({
        key: `WITHDRAW_${w.applyNo}`,
        title: '余额提现',
        desc: `${w.applyNo} · ${statusLabel}`,
        amount: `- ¥${this.toMoney(w.amount)}`,
        tone,
        date: w.createdAt,
      });
    });

    refunds.forEach((ref) => {
      let statusLabel = '退款待处理';
      let tone: 'green' | 'warn' | 'blue' | 'danger' = 'warn';
      if (ref.status === 3) {
        statusLabel = '退款成功';
        tone = 'danger';
      } else if (ref.status === 4) {
        statusLabel = '退款已驳回';
        tone = 'blue';
      }
      list.push({
        key: `REFUND_${ref.refundNo}`,
        title: '订单退款',
        desc: `${ref.refundNo} · ${statusLabel}`,
        amount: `- ¥${this.toMoney(ref.refundAmount)}`,
        tone,
        date: ref.createdAt,
      });
    });

    list.sort((a, b) => b.date.getTime() - a.date.getTime());

    return list.slice(0, 30).map((item) => ({
      key: item.key,
      title: item.title,
      desc: `${item.desc} · ${item.date.toISOString().slice(0, 10)}`,
      amount: item.amount,
      tone: item.tone,
      createdAt: item.date.toISOString(),
    }));
  }

  async getMerchantProfile(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const wallet = await this.prisma.merchantWallet.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        availableBalance: new Prisma.Decimal('0.00'),
        frozenBalance: new Prisma.Decimal('0.00'),
        totalIncome: new Prisma.Decimal('0.00'),
        totalWithdrawn: new Prisma.Decimal('0.00'),
      },
      update: {},
    });

    const productCount = await this.prisma.product.count({ where: { merchantId: merchant.id } });
    const orderCount = await this.prisma.order.count({ where: { merchantId: merchant.id, isParent: false } });
    const qualifications = await this.prisma.merchantQualification.findMany({
      where: { merchantId: merchant.id },
    });

    return {
      merchantId: this.toNumber(merchant.id),
      storeName: merchant.storeName,
      storeLogo: merchant.storeLogo ?? '',
      contactName: merchant.contactName,
      contactMobile: merchant.contactMobile,
      status: merchant.status === 1 ? 'APPROVED' : (merchant.status === 3 ? 'REJECTED' : 'PENDING_AUDIT'),
      productCount,
      orderCount,
      availableAmount: this.toMoney(wallet.availableBalance),
      frozenAmount: this.toMoney(wallet.frozenBalance),
      totalIncome: this.toMoney(wallet.totalIncome),
      totalWithdrawn: this.toMoney(wallet.totalWithdrawn),
      qualifications: qualifications.map((q) => ({
        id: this.toNumber(q.id),
        qualificationType: q.qualificationType,
        fileName: q.fileName,
        fileUrl: q.fileUrl,
        status: q.status,
        auditRemark: q.auditRemark ?? '',
      })),
    };
  }

  async listMerchantProducts(authUser: AuthUser, query: Record<string, string> = {}) {
    const merchant = await this.ensureCurrentMerchant(authUser);
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
        categoryName: product.category.name,
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

  async listMerchantActivities(authUser: AuthUser, query: Record<string, string> = {}) {
    await this.ensureCurrentMerchant(authUser);
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
            startAt: this.formatChinaDateTime(activity.startAt),
            endAt: this.formatChinaDateTime(activity.endAt),
            productCount: activity.productCount,
            coupon: couponInfo,
          };
        })
    );
  }

  async getMerchantDashboard(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const [profile, wallet, orders, productCount, activityCount] = await Promise.all([
      this.getMerchantProfile(authUser),
      this.getWallet(authUser),
      this.listMerchantOrders(authUser),
      this.prisma.product.count({ where: { merchantId: merchant.id, deletedAt: null } }),
      this.prisma.activity.count({ where: { deletedAt: null } }),
    ]);

    const pendingAccept = await this.prisma.order.count({
      where: { merchantId: merchant.id, orderStatus: 1, payStatus: 1, deletedAt: null, isParent: false },
    });
    const pendingShip = await this.prisma.order.count({
      where: { merchantId: merchant.id, orderStatus: 2, payStatus: 1, deliveryStatus: 1, deletedAt: null, isParent: false },
    });
    const pendingRefund = await this.prisma.refundApply.count({
      where: { merchantId: merchant.id, status: 1 },
    });
    const lowStock = await this.prisma.productSku.count({
      where: {
        product: { merchantId: merchant.id },
        stock: { lt: 10 },
      },
    });

    const recentOrders = orders.items.slice(0, 3);

    return {
      shop: {
        name: profile.storeName,
        status: profile.status === 'APPROVED' ? '营业中' : '待审核',
        location: '湾源县东山产区',
        desc: '产地直采 · 冷链直发 · 溯源码绑定',
      },
      heroStats: [
        { label: '今日收入', value: `¥${wallet.availableAmount}` },
        { label: '今日订单', value: String(profile.orderCount) },
        { label: '可提现', value: `¥${wallet.availableAmount}` },
      ],
      shortcuts: [
        { key: 'product', label: '发布商品', route: '/pages/merchant/products/products' },
        { key: 'stock', label: '库存调整', route: '/pages/merchant/products/products' },
        { key: 'order', label: '订单处理', route: '/pages/merchant/orders/orders' },
        { key: 'chat', label: '客服聊天', route: '/pages/chat/chat' },
        { key: 'marketing', label: '营销活动', route: '/pages/merchant/marketing/marketing' },
      ],
      todos: [
        { key: 'accept', title: '待接单', value: String(pendingAccept), desc: '新订单需要尽快确认', tone: 'danger' },
        { key: 'ship', title: '待发货', value: String(pendingShip), desc: '需要尽快安排发货', tone: 'warn' },
        { key: 'stock', title: '库存预警', value: String(lowStock), desc: '低于安全库存', tone: 'warn' },
        { key: 'after', title: '售后待处理', value: String(pendingRefund), desc: '有新申请', tone: 'blue' },
      ],
      orders: recentOrders.map((order) => ({
        key: order.orderNo,
        no: order.orderNo,
        status: order.status,
        buyer: order.userName,
        goods: `实付 ${order.totalAmount}`,
        price: `¥${order.totalAmount}`,
      })),
      finance: {
        week: `¥${wallet.totalIncome}`,
        profit: `¥${wallet.availableAmount}`,
        note: `当前共 ${productCount} 个商品，${activityCount} 场活动`,
      },
    };
  }

  async createWithdraw(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const amountText = String(body.amount ?? '').trim();
    if (!amountText) {
      throw new BadRequestException('Withdraw amount is required');
    }

    const amount = new Prisma.Decimal(amountText);
    if (amount.lte(0)) {
      throw new BadRequestException('Withdraw amount must be positive');
    }

    const fee = body.fee != null ? new Prisma.Decimal(String(body.fee)) : new Prisma.Decimal('0');
    if (fee.lt(0)) {
      throw new BadRequestException('Withdraw fee must not be negative');
    }

    const apply = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.merchantWallet.upsert({
        where: { merchantId: merchant.id },
        create: {
          merchantId: merchant.id,
          availableBalance: new Prisma.Decimal('0.00'),
          frozenBalance: new Prisma.Decimal('0.00'),
          totalIncome: new Prisma.Decimal('0.00'),
          totalWithdrawn: new Prisma.Decimal('0.00'),
        },
        update: {},
      });

      if (wallet.availableBalance.lt(amount)) {
        throw new BadRequestException('Insufficient merchant balance');
      }

      // P0-7: 使用 CAS 条件更新防止超额提现
      const walletUpdate = await tx.merchantWallet.updateMany({
        where: {
          merchantId: merchant.id,
          availableBalance: { gte: amount },
        },
        data: {
          availableBalance: { decrement: amount },
          frozenBalance: { increment: amount },
        },
      });
      if (walletUpdate.count === 0) {
        throw new BadRequestException('余额不足或并发操作冲突，请重试');
      }

      const created = await tx.withdrawApply.create({
        data: {
          merchantId: merchant.id,
          applyNo: `WD${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          amount,
          fee,
          status: 1,
          remark: typeof body.remark === 'string' ? body.remark : null,
        },
      });

      return created;
    });

    return {
      merchantId: this.toNumber(merchant.id),
      withdrawNo: apply.applyNo,
      status: 'PENDING_AUDIT',
      amount: this.toMoney(apply.amount),
      fee: this.toMoney(apply.fee),
      input: body,
    };
  }

  async listMerchantWithdraws(authUser: AuthUser, query: Record<string, string> = {}) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const status = query.status ? Number(query.status) : undefined;
    const keyword = String(query.keyword ?? '').trim();
    const where: Prisma.WithdrawApplyWhereInput = {
      merchantId: merchant.id,
      ...(status != null ? { status } : {}),
      ...(keyword
          ? {
            OR: [
              { applyNo: { contains: keyword } },
              { remark: { contains: keyword } },
            ],
          }
          : {}),
    };

    const withdraws = await this.prisma.withdrawApply.findMany({
      where,
      include: { auditor: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.slicePage(withdraws, page, pageSize).map((withdraw) => ({
      withdrawNo: withdraw.applyNo,
      amount: this.toMoney(withdraw.amount),
      fee: this.toMoney(withdraw.fee),
      status: this.getWithdrawStatusLabel(withdraw.status),
      auditedAt: withdraw.auditedAt ? withdraw.auditedAt.toISOString().slice(0, 16).replace('T', ' ') : '',
      auditedBy: withdraw.auditor?.nickname ?? '',
      remark: withdraw.remark ?? '',
      createdAt: withdraw.createdAt.toISOString().slice(0, 16).replace('T', ' '),
    }));
  }

  async listAdminWithdraws(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const status = query.status ? Number(query.status) : undefined;
    const keyword = String(query.keyword ?? '').trim();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const where: Prisma.WithdrawApplyWhereInput = {
      ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      ...(status != null ? { status } : {}),
      ...(keyword
          ? {
            OR: [
              { applyNo: { contains: keyword } },
              { merchant: { storeName: { contains: keyword } } },
              { merchant: { contactName: { contains: keyword } } },
            ],
          }
          : {}),
    };

    const [total, withdraws] = await Promise.all([
      this.prisma.withdrawApply.count({ where }),
      this.prisma.withdrawApply.findMany({
        where,
        include: { merchant: true, auditor: true },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: withdraws.map((withdraw) => ({
        withdrawNo: withdraw.applyNo,
        merchantName: withdraw.merchant.storeName,
        amount: this.toMoney(withdraw.amount),
        fee: this.toMoney(withdraw.fee),
        status: this.getWithdrawStatusLabel(withdraw.status),
        auditedBy: withdraw.auditor?.nickname ?? '',
        auditedAt: withdraw.auditedAt ? withdraw.auditedAt.toISOString().slice(0, 16).replace('T', ' ') : '',
        remark: withdraw.remark ?? '',
        createdAt: withdraw.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
    };
  }

  async auditWithdraw(authUser: AuthUser, applyNo: string, body: Record<string, unknown>) {
    await this.withSeed();
    const adminUserId = this.resolveAdminUserId(authUser);
    if (!adminUserId) {
      throw new UnauthorizedException('Admin session required');
    }

    const withdraw = await this.prisma.withdrawApply.findUnique({
      where: { applyNo },
      include: { merchant: true },
    });

    if (!withdraw) {
      throw new NotFoundException('Withdraw not found');
    }

    if (withdraw.status !== 1) {
      throw new BadRequestException('Withdraw cannot be audited');
    }

    const rawAction = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    const rawAuditStatus = Number(body.auditStatus);
    // 兼容前端旧参数 auditStatus，以及新参数 action。
    const approve = rawAction
        ? rawAction !== 'reject'
        : Number.isFinite(rawAuditStatus)
            ? rawAuditStatus !== 4
            : true;
    const newStatus = approve ? 2 : 3;
    await this.prisma.$transaction(async (tx) => {
      // P0-7 续: CAS 原子操作 + 提现状态校验防重复审核
      const updated = await tx.withdrawApply.updateMany({
        where: { id: withdraw.id, status: 1 },
        data: {
          status: newStatus,
          auditedBy: adminUserId,
          auditedAt: this.now(),
          remark: typeof body.remark === 'string' ? body.remark : withdraw.remark,
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException('提现状态已变更，请刷新后重试');
      }

      if (approve) {
        await tx.merchantWallet.updateMany({
          where: {
            merchantId: withdraw.merchantId,
            frozenBalance: { gte: withdraw.amount },
          },
          data: {
            frozenBalance: { decrement: withdraw.amount },
            totalWithdrawn: { increment: withdraw.amount },
          },
        });
      } else {
        await tx.merchantWallet.updateMany({
          where: {
            merchantId: withdraw.merchantId,
            frozenBalance: { gte: withdraw.amount },
          },
          data: {
            availableBalance: { increment: withdraw.amount },
            frozenBalance: { decrement: withdraw.amount },
          },
        });
      }
    });

    await this.recordAdminOperation(authUser, 'AUDIT_WITHDRAW', '提现申请', withdraw.id, {
      applyNo,
      action: approve ? 'approve' : 'reject',
      remark: body.remark ?? '',
    });

    return {
      withdrawNo: applyNo,
      status: approve ? 'APPROVED' : 'REJECTED',
      remark: body.remark ?? '',
    };
  }

  async createRefundApply(authUser: AuthUser, body: Record<string, unknown>) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);
    const orderNo = String(body.orderNo ?? '').trim();
    const orderItemId = body.orderItemId != null ? Number(body.orderItemId) : undefined;

    if (!orderNo || !orderItemId) {
      throw new BadRequestException('Order number and order item are required');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id },
      include: { items: true, merchant: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payStatus !== 1) {
      throw new BadRequestException('Only paid orders can apply for refund');
    }

    if (order.orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('已取消的订单不可申请退款');
    }

    if (order.refundStatus === PlatformDataService.REFUND_STATUS.APPROVED) {
      throw new BadRequestException('该订单已退款，不可重复申请');
    }

    const orderItem = order.items.find((item) => this.toNumber(item.id) === orderItemId);
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const existing = await this.prisma.refundApply.findFirst({
      where: {
        orderItemId: orderItem.id,
        deletedAt: null,
        status: { in: [1, 2, 3] },
      },
    });

    if (existing) {
      return {
        refundNo: existing.refundNo,
        orderNo,
        orderItemId: this.toNumber(orderItem.id),
        status: existing.status === 3 ? 'APPROVED' : 'PENDING_MERCHANT',
        alreadyExists: true,
      };
    }

    const refundAmountText = body.refundAmount != null ? String(body.refundAmount) : this.toMoney(orderItem.lineAmount);
    const refundAmount = new Prisma.Decimal(refundAmountText);
    if (refundAmount.lte(0)) {
      throw new BadRequestException('Refund amount must be positive');
    }
    if (refundAmount.gt(orderItem.lineAmount)) {
      throw new BadRequestException('退款金额不可超过商品实付金额');
    }

    const applyType = Number(body.applyType ?? 1);
    const applyReason = String(body.applyReason ?? '用户申请退款').trim();
    const applyImages = Array.isArray(body.applyImages)
        ? (body.applyImages.filter((item) => typeof item === 'string') as string[])
        : [];

    const refund = await this.prisma.refundApply.create({
      data: {
        refundNo: `RF${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        orderId: order.id,
        orderItemId: orderItem.id,
        userId: user.id,
        merchantId: order.merchantId,
        applyType,
        applyReason,
        applyImages: applyImages as Prisma.InputJsonValue,
        refundAmount,
        status: 1,
      },
    });

    await this.prisma.order.updateMany({
      where: { id: order.id },
      data: { refundStatus: PlatformDataService.REFUND_STATUS.PENDING_MERCHANT },
    });

    if (order.groupBuyId != null) {
      await this.failOpenGroupBuyDueToRefund(order.groupBuyId, {
        excludeOrderId: order.id,
        reason: '拼团成员申请售后，拼团已结束',
      });
    }

    return {
      refundNo: refund.refundNo,
      orderNo,
      orderItemId: this.toNumber(orderItem.id),
      refundAmount: this.toMoney(refund.refundAmount),
      applyType,
      status: 'PENDING_MERCHANT',
    };
  }

  createAdminLoginCaptcha() {
    return this.adminAuthSecurityService.createCaptcha();
  }

  async adminLogin(body: Record<string, unknown>, clientIp = 'unknown') {
    await this.withSeed();
    await this.ensureMerchantAdminRole();

    const loginId = String(body.username ?? body.mobile ?? body.account ?? '').trim();
    const password = String(body.password ?? '');
    const passwordHashed = Boolean(body.passwordHashed);
    const captchaId = String(body.captchaId ?? '').trim();
    const captchaCode = String(body.captchaCode ?? '').trim();

    await this.adminAuthSecurityService.assertLoginAllowed(clientIp, loginId);

    const captchaOk = await this.adminAuthSecurityService.verifyCaptcha(captchaId, captchaCode);
    if (!captchaOk) {
      await this.adminAuthSecurityService.recordLoginFailure(clientIp, loginId);
      throw this.adminAuthSecurityService.buildInvalidCaptchaError();
    }

    const passwordHash = this.resolvePasswordHash(password, passwordHashed);
    const admin = await this.prisma.adminUser.findFirst({
      where: {
        passwordHash,
        status: 1,
        deletedAt: null,
        OR: [
          { username: loginId },
          { mobile: loginId },
        ],
      },
      include: {
        roles: {
          include: {
            adminRole: true,
          },
        },
      },
    });

    if (!admin) {
      await this.adminAuthSecurityService.recordLoginFailure(clientIp, loginId);
      throw this.adminAuthSecurityService.buildInvalidCredentialsError();
    }

    await this.adminAuthSecurityService.clearLoginFailures(clientIp, loginId);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: this.now() },
    });

    const accountNo = await this.backfillAdminAccountNo(admin.id);
    const merchantId = admin.merchantId != null ? this.toNumber(admin.merchantId) : null;
    const accountType = merchantId != null ? 'MERCHANT' : 'PLATFORM';

    await this.recordAdminOperation(
        {
          sub: `admin_${String(admin.id)}`,
          role: RoleCode.ADMIN,
          tokenType: TokenType.ACCESS,
          merchantId,
          accountType,
        },
        'LOGIN',
        '系统',
        admin.id,
        { username: admin.username, mobile: admin.mobile, accountType },
    );

    const payload: AuthUser = {
      sub: `admin_${String(admin.id)}`,
      role: RoleCode.ADMIN,
      tokenType: TokenType.ACCESS,
      merchantId,
      accountType,
    };
    const activeRoles = admin.roles.map((item) => item.adminRole).filter((role) => role.status === 1);
    const roleCodes = activeRoles.map((role) => role.code);
    const roleNames = activeRoles.map((role) => role.name);
    const permissionKeys = activeRoles.length > 0
      ? Array.from(new Set(activeRoles.flatMap((role) => this.resolveAdminPermissionKeys((role as any).permissionJson, role.code))))
      : accountType === 'MERCHANT'
        ? [...MERCHANT_ADMIN_PERMISSION_KEYS]
        : [...ADMIN_PERMISSION_KEYS];
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return {
      accessToken,
      tokenType: TokenType.ACCESS,
      role: 'ADMIN',
      roleCodes,
      roleNames,
      permissionKeys,
      accountNo,
      merchantId,
      accountType,
      nickname: admin.nickname,
      username: admin.username,
      mobile: admin.mobile ?? '',
      input: body,
    };
  }

  async listAdminUsers(query: Record<string, string>) {
    await this.withSeed();
    const keyword = String(query.keyword ?? '').trim();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const userType = String(query.userType ?? '').trim().toUpperCase();

    const statusFilter = (() => {
      const rawStatus = String(query.status ?? '').trim().toUpperCase();

      if (!rawStatus) {
        return undefined;
      }

      if (rawStatus === 'NORMAL' || rawStatus === '1') {
        return 1;
      }

      if (rawStatus === 'DISABLED' || rawStatus === '2') {
        return 2;
      }

      const numericStatus = Number(rawStatus);
      return Number.isFinite(numericStatus) ? numericStatus : undefined;
    })();

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(typeof statusFilter === 'number' ? { status: statusFilter } : {}),
      ...(userType === 'GUEST'
          ? { openid: { startsWith: 'guest_' } }
          : userType === 'REGULAR'
              ? { openid: { not: { startsWith: 'guest_' } } }
              : {}),
      ...(keyword
          ? {
            OR: [
              { accountNo: { contains: keyword } },
              { nickname: { contains: keyword } },
              { mobile: { contains: keyword } },
            ],
          }
          : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    const userIds = users.map((user) => user.id);
    const [pointTotals, orderCounts] = await Promise.all([
      userIds.length
          ? this.prisma.pointLog.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _sum: { points: true },
          })
          : Promise.resolve([]),
      userIds.length
          ? this.prisma.order.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, deletedAt: null },
            _count: { _all: true },
          })
          : Promise.resolve([]),
    ]);

    const pointsMap = new Map(pointTotals.map((item) => [item.userId.toString(), Number(item._sum.points ?? 0)]));
    const orderCountMap = new Map(orderCounts.map((item) => [item.userId.toString(), Number(item._count._all ?? 0)]));

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: users.map((user) => ({
        id: this.toNumber(user.id),
        accountNo: user.accountNo ?? '',
        nickname: user.nickname ?? '',
        mobile: user.mobile ?? '',
        status: user.status === 1 ? 'NORMAL' : 'DISABLED',
        avatarUrl: user.avatarUrl ?? '',
        role: this.isGuestUser(user) ? 'GUEST' : 'USER',
        points: pointsMap.get(user.id.toString()) ?? 0,
        orderCount: orderCountMap.get(user.id.toString()) ?? 0,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      })),
    };
  }

  async listAdminAccounts(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope, '商户账号无权查看管理员列表');
    const keyword = String(query.keyword ?? '').trim();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const statusFilter = (() => {
      const rawStatus = String(query.status ?? '').trim().toUpperCase();
      if (!rawStatus) return undefined;
      if (rawStatus === 'NORMAL' || rawStatus === '1') return 1;
      if (rawStatus === 'DISABLED' || rawStatus === '2') return 2;
      const numericStatus = Number(rawStatus);
      return Number.isFinite(numericStatus) && [1, 2].includes(numericStatus) ? numericStatus : undefined;
    })();

    const where: Prisma.AdminUserWhereInput = {
      deletedAt: null,
      ...(typeof statusFilter === 'number' ? { status: statusFilter } : {}),
      ...(keyword
        ? {
            OR: [
              { username: { contains: keyword } },
              { nickname: { contains: keyword } },
              { mobile: { contains: keyword } },
              { accountNo: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [total, admins] = await Promise.all([
      this.prisma.adminUser.count({ where }),
      this.prisma.adminUser.findMany({
        where,
        include: {
          roles: {
            include: {
              adminRole: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: admins.map((admin) => {
        const roles = admin.roles.map((item) => item.adminRole).filter((role) => role.status === 1);
        return {
          id: this.toNumber(admin.id),
          accountNo: admin.accountNo ?? '',
          username: admin.username,
          nickname: admin.nickname,
          mobile: admin.mobile ?? '',
          loginPassword: admin.loginPassword ?? '',
          merchantId: admin.merchantId != null ? this.toNumber(admin.merchantId) : null,
          accountType: admin.merchantId != null ? 'MERCHANT' : 'PLATFORM',
          status: this.mapAdminStatus(admin.status),
          lastLoginAt: this.toIso(admin.lastLoginAt),
          roleCodes: roles.map((role) => role.code),
          roleNames: roles.map((role) => role.name),
        };
      }),
    };
  }

  async createAdminAccount(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope);

    const username = String(body.username ?? '').trim();
    const nickname = String(body.nickname ?? '').trim();
    const mobile = String(body.mobile ?? '').trim();
    const rawPassword = String(body.password ?? '').trim();
    const passwordHashed = Boolean(body.passwordHashed);
    const roleCodes = this.normalizeAdminRoleCodes(body.roleCodes ?? body.roleCode ?? 'ADMIN');
    const initialPassword = rawPassword
      ? (passwordHashed ? '' : rawPassword)
      : this.generateRandomPassword();
    const passwordForHash = rawPassword || initialPassword;

    if (!username) {
      throw new BadRequestException('Username is required');
    }
    if (!nickname) {
      throw new BadRequestException('Nickname is required');
    }
    if (!passwordForHash) {
      throw new BadRequestException('Password is required');
    }
    if (roleCodes.length === 0) {
      throw new BadRequestException('Role codes are required');
    }

    const existing = await this.prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    if (mobile) {
      const mobileConflict = await this.prisma.adminUser.findFirst({ where: { mobile, deletedAt: null } });
      if (mobileConflict) {
        throw new BadRequestException('Mobile already exists');
      }
    }

    const plainPassword = passwordHashed ? null : (initialPassword || rawPassword || null);
    const admin = await this.prisma.adminUser.create({
      data: {
        accountNo: await this.generateAccountNo('ADMIN'),
        username,
        nickname,
        mobile: mobile || null,
        passwordHash: this.resolvePasswordHash(passwordForHash, Boolean(rawPassword) && passwordHashed),
        loginPassword: plainPassword,
        status: 1,
      },
    });

    await this.ensureAdminRoleAssignments(admin.id, roleCodes);

    const roles = await this.prisma.adminRole.findMany({
      where: { code: { in: roleCodes } },
      select: { name: true, code: true },
    });

    await this.recordAdminOperation(authUser, 'CREATE_ADMIN_ACCOUNT', '平台账号', admin.id, {
      username,
      nickname,
      mobile,
      roleCodes,
    });

    return {
      id: this.toNumber(admin.id),
      accountNo: admin.accountNo ?? '',
      username: admin.username,
      nickname: admin.nickname,
      mobile: admin.mobile ?? '',
      loginPassword: plainPassword ?? '',
      status: this.mapAdminStatus(admin.status),
      roleCodes,
      roleNames: roles.map((role) => role.name),
      initialPassword: initialPassword || undefined,
    };
  }

  async updateAdminAccount(adminUserId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const id = BigInt(adminUserId);
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      include: { roles: { include: { adminRole: true } } },
    });

    if (!admin || admin.deletedAt != null) {
      throw new NotFoundException('Admin account not found');
    }

    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : admin.nickname;
    const mobile = typeof body.mobile === 'string' ? body.mobile.trim() : admin.mobile ?? '';
    const rawStatus = String(body.status ?? '').trim().toUpperCase();
    const status = rawStatus === 'NORMAL' || rawStatus === '1'
      ? 1
      : rawStatus === 'DISABLED' || rawStatus === '2'
        ? 2
        : admin.status;
    const roleCodes = body.roleCodes != null || body.roleCode != null
      ? this.normalizeAdminRoleCodes(body.roleCodes ?? body.roleCode)
      : admin.roles.map((item) => item.adminRole.code);

    if (!nickname) {
      throw new BadRequestException('Nickname is required');
    }
    if (mobile) {
      const mobileConflict = await this.prisma.adminUser.findFirst({
        where: {
          mobile,
          id: { not: id },
        },
      });
      if (mobileConflict) {
        throw new BadRequestException('Mobile already exists');
      }
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: {
        nickname,
        mobile: mobile || null,
        status,
      },
    });

    if (roleCodes.length > 0) {
      await this.ensureAdminRoleAssignments(id, roleCodes);
    }

    const roles = await this.prisma.adminUserRole.findMany({
      where: { adminUserId: id },
      include: { adminRole: true },
    });

    await this.recordAdminOperation(authUser, 'UPDATE_ADMIN_ACCOUNT', '平台账号', id, {
      adminUserId,
      nickname,
      mobile,
      status,
      roleCodes,
    });

    return {
      id: this.toNumber(updated.id),
      accountNo: updated.accountNo ?? '',
      username: updated.username,
      nickname: updated.nickname,
      mobile: updated.mobile ?? '',
      status: this.mapAdminStatus(updated.status),
      roleCodes: roles.map((item) => item.adminRole.code),
      roleNames: roles.map((item) => item.adminRole.name),
    };
  }

  async resetAdminPassword(adminUserId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope);

    const rawPassword = String(body.password ?? '').trim();
    const passwordHashed = Boolean(body.passwordHashed);
    const initialPassword = rawPassword
      ? (passwordHashed ? '' : rawPassword)
      : this.generateRandomPassword();
    const passwordForHash = rawPassword || initialPassword;

    const id = BigInt(adminUserId);
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin || admin.deletedAt != null) {
      throw new NotFoundException('Admin account not found');
    }

    const plainPassword = passwordHashed ? null : (initialPassword || rawPassword || null);
    await this.prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash: this.resolvePasswordHash(passwordForHash, Boolean(rawPassword) && passwordHashed),
        ...(plainPassword ? { loginPassword: plainPassword } : {}),
      },
    });

    await this.recordAdminOperation(authUser, 'RESET_ADMIN_PASSWORD', '平台账号', id, {
      adminUserId,
    });

    return {
      id: this.toNumber(admin.id),
      username: admin.username,
      mobile: admin.mobile ?? '',
      success: true,
      initialPassword: initialPassword || undefined,
      loginPassword: plainPassword || undefined,
    };
  }

  async deleteAdminAccount(adminUserId: number, authUser?: AuthUser) {
    await this.withSeed();

    const id = BigInt(adminUserId);
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin || admin.deletedAt != null) {
      throw new NotFoundException('Admin account not found');
    }

    if (authUser && authUser.sub) {
      const currentUserIdString = authUser.sub.split('_')[1];
      if (currentUserIdString && BigInt(currentUserIdString) === id) {
        throw new BadRequestException('You cannot delete your own logged-in account');
      }
    }

    await this.prisma.adminUser.update({
      where: { id },
      data: { deletedAt: this.now() },
    });

    await this.recordAdminOperation(authUser, 'DELETE_ADMIN_ACCOUNT', '平台账号', id, {
      adminUserId,
      username: admin.username,
    });

    return {
      id: adminUserId,
      success: true,
    };
  }

  /**
   * 为已通过审核的商户创建后台账号（手机号登录），返回一次性明文密码。
   * 若已存在绑定账号则补齐商户角色；缺明文密码时重新生成以便后台可查看。
   */
  async createMerchantAdminAccount(merchantId: number | bigint): Promise<{
    created: boolean;
    updated?: boolean;
    skipped?: boolean;
    reason?: string;
    merchantId: number;
    mobile: string;
    storeName: string;
    username?: string;
    initialPassword?: string;
    adminUserId?: number;
  }> {
    await this.ensureMerchantAdminRole();
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null },
    });
    if (!merchant) {
      return {
        created: false,
        skipped: true,
        reason: '商户不存在',
        merchantId: Number(merchantId),
        mobile: '',
        storeName: '',
      };
    }

    const mobile = String(merchant.contactMobile ?? '').trim();
    const storeName = merchant.storeName;
    const mid = this.toNumber(merchant.id);

    const bound = await this.prisma.adminUser.findFirst({
      where: { merchantId: merchant.id, deletedAt: null },
    });
    if (bound) {
      await this.ensureAdminRoleAssignments(bound.id, ['MERCHANT_ADMIN']);
      let loginPassword = String(bound.loginPassword ?? '').trim();
      let updated = false;
      if (!loginPassword) {
        loginPassword = this.generateRandomPassword();
        await this.prisma.adminUser.update({
          where: { id: bound.id },
          data: {
            passwordHash: this.hashPassword(loginPassword),
            loginPassword,
          },
        });
        updated = true;
      }
      return {
        created: false,
        updated,
        skipped: !updated,
        reason: updated ? '已补齐可查看密码' : '已绑定后台账号',
        merchantId: mid,
        mobile: bound.mobile ?? mobile,
        storeName,
        username: bound.username,
        initialPassword: loginPassword,
        adminUserId: this.toNumber(bound.id),
      };
    }

    if (!mobile) {
      return {
        created: false,
        skipped: true,
        reason: '商户无联系手机号',
        merchantId: mid,
        mobile: '',
        storeName,
      };
    }

    let username = mobile;
    const usernameConflict = await this.prisma.adminUser.findFirst({
      where: { username, deletedAt: null },
    });
    if (usernameConflict) {
      username = `m${mid}`;
    }

    const mobileOwner = await this.prisma.adminUser.findFirst({
      where: { mobile, deletedAt: null },
    });
    const mobileForCreate = mobileOwner ? null : mobile;

    const initialPassword = this.generateRandomPassword();
    const admin = await this.prisma.adminUser.create({
      data: {
        accountNo: await this.generateAccountNo('ADMIN'),
        username,
        nickname: storeName.slice(0, 64) || `商户${mid}`,
        mobile: mobileForCreate,
        merchantId: merchant.id,
        passwordHash: this.hashPassword(initialPassword),
        loginPassword: initialPassword,
        status: 1,
      },
    });
    await this.ensureAdminRoleAssignments(admin.id, ['MERCHANT_ADMIN']);

    return {
      created: true,
      merchantId: mid,
      mobile: mobileForCreate ?? mobile,
      storeName,
      username: admin.username,
      initialPassword,
      adminUserId: this.toNumber(admin.id),
    };
  }

  async syncMerchantsAdminAccounts(authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope);

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 1, deletedAt: null },
      orderBy: { id: 'asc' },
    });

    const created: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      username: string;
      initialPassword: string;
      adminUserId: number;
    }> = [];
    const ensured: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      username: string;
      initialPassword: string;
      adminUserId: number;
    }> = [];
    const skipped: Array<{
      merchantId: number;
      mobile: string;
      storeName: string;
      reason: string;
    }> = [];

    for (const merchant of merchants) {
      const result = await this.createMerchantAdminAccount(merchant.id);
      if (result.initialPassword && result.adminUserId != null && result.username) {
        const row = {
          merchantId: result.merchantId,
          mobile: result.mobile,
          storeName: result.storeName,
          username: result.username,
          initialPassword: result.initialPassword,
          adminUserId: result.adminUserId,
        };
        if (result.created) {
          created.push(row);
        } else {
          ensured.push(row);
        }
      } else {
        skipped.push({
          merchantId: result.merchantId,
          mobile: result.mobile,
          storeName: result.storeName,
          reason: result.reason ?? '已跳过',
        });
      }
    }

    await this.recordAdminOperation(authUser, 'SYNC_MERCHANT_ADMIN_ACCOUNTS', '平台账号', undefined, {
      createdCount: created.length,
      ensuredCount: ensured.length,
      skippedCount: skipped.length,
    });

    return {
      created,
      ensured,
      skipped,
      createdCount: created.length,
      ensuredCount: ensured.length,
      skippedCount: skipped.length,
      accounts: [...created, ...ensured],
    };
  }

  async listAdminRoles(query: Record<string, string> = {}) {
    await this.withSeed();
    const keyword = String(query.keyword ?? '').trim();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const where: Prisma.AdminRoleWhereInput = {
      ...(keyword
        ? {
            OR: [
              { code: { contains: keyword } },
              { name: { contains: keyword } },
            ],
          }
        : {}),
    };

    const roles = await this.prisma.adminRole.findMany({
      where,
      include: {
        users: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      page,
      pageSize,
      total: roles.length,
      items: this.slicePage(roles, page, pageSize).map((role) => ({
        id: this.toNumber(role.id),
        code: role.code,
        name: role.name,
        status: this.mapAdminStatus(role.status),
        userCount: role.users.length,
        permissionKeys: this.resolveAdminPermissionKeys((role as any).permissionJson, role.code),
        permissionCount: this.resolveAdminPermissionKeys((role as any).permissionJson, role.code).length,
        createdAt: this.toIso(role.createdAt),
        updatedAt: this.toIso(role.updatedAt),
      })),
    };
  }

  async createAdminRole(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const code = String(body.code ?? '').trim().toUpperCase();
    const name = String(body.name ?? '').trim();
    const rawStatus = String(body.status ?? 'NORMAL').trim().toUpperCase();
    const status = rawStatus === 'DISABLED' ? 2 : 1;
    const permissionKeys = this.normalizeAdminPermissionKeys(body.permissionKeys ?? body.permissionJson);

    if (!code) {
      throw new BadRequestException('Role code is required');
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      throw new BadRequestException('Role code must contain only uppercase letters, numbers or underscore');
    }
    if (!name) {
      throw new BadRequestException('Role name is required');
    }

    const existing = await this.prisma.adminRole.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Role code already exists');
    }

    const role = await this.prisma.adminRole.create({
      data: {
        code,
        name,
        status,
        permissionJson: permissionKeys.length > 0 ? permissionKeys : Prisma.DbNull,
      },
    });

    await this.recordAdminOperation(authUser, 'CREATE_ADMIN_ROLE', '平台角色', role.id, {
      code,
      name,
      status,
    });

    return {
      id: this.toNumber(role.id),
      code: role.code,
      name: role.name,
      status: this.mapAdminStatus(role.status),
      userCount: 0,
      permissionKeys: this.resolveAdminPermissionKeys((role as any).permissionJson, role.code),
      permissionCount: this.resolveAdminPermissionKeys((role as any).permissionJson, role.code).length,
      createdAt: this.toIso(role.createdAt),
      updatedAt: this.toIso(role.updatedAt),
    };
  }

  async updateAdminRole(roleId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const id = BigInt(roleId);
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      include: { users: { select: { id: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : role.name;
    const status = body.status == null
      ? role.status
      : String(body.status).trim().toUpperCase() === 'DISABLED'
        ? 2
        : 1;
    const permissionKeys = body.permissionKeys == null && body.permissionJson == null
      ? this.resolveAdminPermissionKeys((role as any).permissionJson, role.code)
      : this.normalizeAdminPermissionKeys(body.permissionKeys ?? body.permissionJson);

    if (!name) {
      throw new BadRequestException('Role name is required');
    }

    const updated = await this.prisma.adminRole.update({
      where: { id },
      data: {
        name,
        status,
        permissionJson: permissionKeys.length > 0 ? permissionKeys : Prisma.DbNull,
      },
    });

    await this.recordAdminOperation(authUser, 'UPDATE_ADMIN_ROLE', '平台角色', id, {
      roleId,
      name,
      status,
    });

    return {
      id: this.toNumber(updated.id),
      code: updated.code,
      name: updated.name,
      status: this.mapAdminStatus(updated.status),
      userCount: role.users.length,
      permissionKeys: this.resolveAdminPermissionKeys((updated as any).permissionJson, updated.code),
      permissionCount: this.resolveAdminPermissionKeys((updated as any).permissionJson, updated.code).length,
      createdAt: this.toIso(updated.createdAt),
      updatedAt: this.toIso(updated.updatedAt),
    };
  }

  async deleteAdminRole(roleId: number, authUser?: AuthUser) {
    await this.withSeed();

    const id = BigInt(roleId);
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            adminUser: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Admin role not found');
    }

    const activeAssignedUsers = role.users.filter((u) => u.adminUser && u.adminUser.deletedAt == null);
    if (activeAssignedUsers.length > 0) {
      throw new BadRequestException('Cannot delete role that has assigned members');
    }

    await this.prisma.adminUserRole.deleteMany({
      where: { adminRoleId: id },
    });

    await this.prisma.adminRole.delete({
      where: { id },
    });

    await this.recordAdminOperation(authUser, 'DELETE_ADMIN_ROLE', '平台角色', id, {
      roleId,
      code: role.code,
      name: role.name,
    });

    return {
      id: roleId,
      success: true,
    };
  }

  async updateAdminUserStatus(userId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const rawStatus = String(body.status ?? body.action ?? '').trim().toUpperCase();
    let status: number;

    if (rawStatus === 'NORMAL' || rawStatus === 'ENABLE' || rawStatus === '1') {
      status = 1;
    } else if (rawStatus === 'DISABLED' || rawStatus === 'DISABLE' || rawStatus === '2') {
      status = 2;
    } else {
      const numericStatus = Number(rawStatus);
      if (!Number.isFinite(numericStatus) || ![1, 2].includes(numericStatus)) {
        throw new BadRequestException('User status is required');
      }

      status = numericStatus;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === status) {
      return {
        userId,
        status: status === 1 ? 'NORMAL' : 'DISABLED',
        unchanged: true,
        remark: typeof body.remark === 'string' ? body.remark : '',
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { status },
    });

    await this.recordAdminOperation(authUser, 'UPDATE_USER_STATUS', '用户管理', user.id, {
      userId,
      status,
      remark: body.remark ?? '',
    });

    return {
      userId,
      status: status === 1 ? 'NORMAL' : 'DISABLED',
      remark: typeof body.remark === 'string' ? body.remark : '',
    };
  }

  async adjustAdminUserPoints(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const userId = Number(body.userId ?? 0);
    const rawPoints = Number(body.points ?? 0);
    const remark = String(body.remark ?? '').trim();

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('User id is required');
    }

    if (!Number.isFinite(rawPoints) || rawPoints === 0) {
      throw new BadRequestException('Points amount is required');
    }

    const points = Math.trunc(rawPoints);
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, nickname: true, mobile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentAgg = await this.prisma.pointLog.aggregate({
      where: { userId: user.id },
      _sum: { points: true },
    });
    const currentBalance = Math.max(Number(currentAgg._sum.points ?? 0), 0);

    if (points < 0 && currentBalance + points < 0) {
      throw new BadRequestException('积分余额不足，无法扣减');
    }

    const changeType = points > 0 ? 'INCREASE' : 'DEDUCT';
    const sourceNo = `ADMIN_POINT_${userId}_${Date.now()}`;
    const finalRemark =
      remark || (points > 0 ? '管理员手动发放积分' : '管理员手动扣减积分');

    await this.prisma.pointLog.create({
      data: {
        userId: user.id,
        changeType,
        points,
        sourceType: 'ADMIN',
        sourceNo,
        remark: finalRemark,
      },
    });

    const nextBalance = Math.max(currentBalance + points, 0);

    await this.recordAdminOperation(authUser, 'ADJUST_USER_POINTS', '用户管理', user.id, {
      userId,
      points,
      changeType,
      balance: nextBalance,
      remark: finalRemark,
    });

    return {
      userId,
      nickname: user.nickname,
      mobile: user.mobile,
      points,
      balance: nextBalance,
      remark: finalRemark,
    };
  }

  async getUserSummary(userId: number) {
    await this.withSeed();
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [pointLogs, orders] = await Promise.all([
      this.prisma.pointLog.aggregate({
        where: { userId: user.id },
        _sum: { points: true },
      }),
      this.prisma.order.findMany({
        where: { userId: user.id, deletedAt: null },
        select: { payAmount: true },
      }),
    ]);

    const orderCount = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.payAmount ?? 0), 0);

    return {
      id: this.toNumber(user.id),
      nickname: user.nickname ?? '',
      mobile: user.mobile ?? '',
      avatarUrl: user.avatarUrl ?? '',
      role: this.isGuestUser(user) ? 'GUEST' : 'USER',
      status: user.status === 1 ? 'NORMAL' : 'DISABLED',
      createdAt: this.toIso(user.createdAt),
      lastLoginAt: this.toIso(user.lastLoginAt),
      orderCount,
      totalSpent: totalSpent.toFixed(2),
    };
  }

  async updateAdminUserProfile(userId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const mobile = typeof body.mobile === 'string' ? body.mobile.trim() : '';
    const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';

    if (!nickname) {
      throw new BadRequestException('Nickname is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user || user.deletedAt != null) {
      throw new NotFoundException('User not found');
    }

    await this.ensureMobileAvailable(mobile, user.id);
    const updated = await this.withMobileConflictGuard(() =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            nickname,
            ...(mobile ? { mobile } : {}),
            avatarUrl: avatarUrl || null,
          },
        }),
    );

    await this.recordAdminOperation(authUser, 'UPDATE_USER_PROFILE', '用户管理', user.id, {
      userId,
      oldNickname: user.nickname,
      newNickname: nickname,
      oldMobile: user.mobile,
      newMobile: mobile,
      avatarUrl,
    });

    return {
      userId,
      nickname: updated.nickname,
      mobile: updated.mobile,
      avatarUrl: updated.avatarUrl ?? '',
    };
  }

  async deleteAdminUser(userId: number, authUser?: AuthUser) {
    await this.withSeed();

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user || user.deletedAt != null) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Cascade delete associated profile & transactional data
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      await tx.userAddress.deleteMany({ where: { userId: user.id } });
      await tx.cartItem.deleteMany({ where: { userId: user.id } });
      await tx.favorite.deleteMany({ where: { userId: user.id } });
      await tx.userCoupon.deleteMany({ where: { userId: user.id } });
      await tx.pointLog.deleteMany({ where: { userId: user.id } });
      await tx.userMessage.deleteMany({ where: { userId: user.id } });
      await tx.flashSaleClaim.deleteMany({ where: { userId: user.id } });
      await tx.groupBuyMember.deleteMany({ where: { userId: user.id } });

      // 2. Soft-delete and anonymize the user record to release unique indices
      await tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt: this.now(),
          status: 2,
          openid: `deleted_${user.id}_${user.openid}`,
          nickname: '已注销用户',
          avatarUrl: null,
          mobile: null,
          ...(user.accountNo ? { accountNo: `deleted_${user.id}_${user.accountNo}` } : {}),
        },
      });
    });

    await this.recordAdminOperation(authUser, 'DELETE_USER_ACCOUNT', '用户管理', user.id, {
      userId,
      nickname: user.nickname,
      mobile: user.mobile,
    });

    return {
      userId,
      success: true,
    };
  }


  async listAdminMerchants(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();
    const keyword = String(query.keyword ?? '').trim();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const rawAuditStatus = String(query.auditStatus ?? '').trim().toUpperCase();
    const statusFilter = (() => {
      if (rawAuditStatus === 'APPROVED' || rawAuditStatus === '1') return 1;
      if (rawAuditStatus === 'PENDING_AUDIT' || rawAuditStatus === '2') return 2;
      if (rawAuditStatus === 'REJECTED' || rawAuditStatus === '3') return 3;
      return undefined;
    })();
    const profilePendingOnly =
      rawAuditStatus === 'PROFILE_PENDING' ||
      rawAuditStatus === 'PROFILE_AUDIT' ||
      String(query.profileAuditStatus ?? '').trim() === '1';

    const where: Prisma.MerchantWhereInput = {
      deletedAt: null,
      ...(merchantScope != null ? { id: BigInt(merchantScope) } : {}),
      ...(profilePendingOnly ? { profileAuditStatus: 1 } : {}),
      ...(statusFilter !== undefined && !profilePendingOnly ? { status: statusFilter } : {}),
      ...(keyword
          ? {
            OR: [
              { storeName: { contains: keyword } },
              { contactName: { contains: keyword } },
              { contactMobile: { contains: keyword } },
            ],
          }
          : {}),
    };

    // 平台管理员：为全部已通过商户补齐后台账号与可查看密码
    if (merchantScope == null) {
      const approvedMerchants = await this.prisma.merchant.findMany({
        where: { status: 1, deletedAt: null },
        select: {
          id: true,
          adminUsers: {
            where: { deletedAt: null },
            select: { id: true, loginPassword: true },
            take: 1,
          },
        },
      });
      for (const merchant of approvedMerchants) {
        const admin = merchant.adminUsers[0];
        if (!admin || !String(admin.loginPassword ?? '').trim()) {
          await this.createMerchantAdminAccount(merchant.id);
        }
      }
    }

    const [total, merchants] = await Promise.all([
      this.prisma.merchant.count({ where }),
      this.prisma.merchant.findMany({
        where,
        include: {
          adminUsers: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: merchants.map((merchant) => {
        const adminAccount = merchant.adminUsers[0];
        const canViewLoginSecret = merchantScope == null;
        return {
          id: this.toNumber(merchant.id),
          storeName: merchant.storeName,
          contactName: merchant.contactName,
          mobile: merchant.contactMobile,
          region: '全国',
          auditStatus: merchant.status === 1 ? 'APPROVED' : (merchant.status === 3 ? 'REJECTED' : 'PENDING_AUDIT'),
          profileAuditStatus: merchant.profileAuditStatus ?? 0,
          profileAuditLabel:
            merchant.profileAuditStatus === 1
              ? '资料变更待审'
              : merchant.profileAuditStatus === 3
                ? '资料已驳回'
                : '',
          profileAuditRemark: merchant.profileAuditRemark ?? '',
          pendingProfile: merchant.pendingProfileJson ?? null,
          hasAdminAccount: Boolean(adminAccount),
          adminUserId: adminAccount ? this.toNumber(adminAccount.id) : null,
          adminUsername: canViewLoginSecret ? (adminAccount?.username ?? '') : '',
          adminPassword: canViewLoginSecret ? (adminAccount?.loginPassword ?? '') : '',
          productCount: 0,
          walletAmount: '0.00',
          createdAt: merchant.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        };
      }),
    };
  }

  async getMerchantSummary(merchantId: number) {
    await this.withSeed();
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: BigInt(merchantId) },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const [productsCount, orders] = await Promise.all([
      this.prisma.product.count({
        where: { merchantId: merchant.id, deletedAt: null },
      }),
      this.prisma.order.findMany({
        where: { merchantId: merchant.id, deletedAt: null, payStatus: 1 },
        select: { payAmount: true },
      }),
    ]);

    const orderCount = orders.length;
    const totalIncome = orders.reduce((sum, order) => sum + Number(order.payAmount ?? 0), 0);

    return {
      id: this.toNumber(merchant.id),
      storeName: merchant.storeName,
      contactName: merchant.contactName,
      contactMobile: merchant.contactMobile,
      auditStatus: merchant.status === 1 ? 'APPROVED' : (merchant.status === 3 ? 'REJECTED' : 'PENDING_AUDIT'),
      productCount: productsCount,
      orderCount,
      totalIncome: totalIncome.toFixed(2),
      createdAt: this.toIso(merchant.createdAt),
    };
  }

  async getAdminMerchantDetail(merchantId: number) {
    await this.withSeed();
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null },
      include: {
        qualifications: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      id: this.toNumber(merchant.id),
      userId: this.toNumber(merchant.userId),
      storeName: merchant.storeName,
      storeLogo: merchant.storeLogo,
      contactName: merchant.contactName,
      contactMobile: merchant.contactMobile,
      auditStatus: merchant.status === 1 ? 'APPROVED' : (merchant.status === 3 ? 'REJECTED' : 'PENDING_AUDIT'),
      status: merchant.status,
      commissionRate: merchant.commissionRate ? merchant.commissionRate.toString() : '0.0000',
      settledAt: merchant.settledAt ? this.toIso(merchant.settledAt) : null,
      createdAt: this.toIso(merchant.createdAt),
      qualifications: merchant.qualifications.map(q => ({
        id: this.toNumber(q.id),
        qualificationType: q.qualificationType,
        fileName: q.fileName,
        fileUrl: q.fileUrl,
        status: q.status,
        auditRemark: q.auditRemark,
      })),
    };
  }

  async updateAdminMerchant(merchantId: number, body: Record<string, any>, user: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(user);
    if (merchantScope != null && merchantScope !== merchantId) {
      throw new ForbiddenException('只能修改自己的商户信息');
    }

    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 商户账号改资料：写入待审草稿，不直接覆盖正式字段
    if (merchantScope != null) {
      const pendingProfile = {
        storeName: body.storeName !== undefined ? String(body.storeName) : merchant.storeName,
        storeLogo: body.storeLogo !== undefined ? String(body.storeLogo) : merchant.storeLogo,
        contactName: body.contactName !== undefined ? String(body.contactName) : merchant.contactName,
        contactMobile: body.contactMobile !== undefined ? String(body.contactMobile) : merchant.contactMobile,
      };
      await this.prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          pendingProfileJson: pendingProfile as Prisma.InputJsonValue,
          profileAuditStatus: 1,
          profileAuditRemark: null,
        },
      });
      await this.recordAdminOperation(user, 'SUBMIT_MERCHANT_PROFILE', '商户管理', merchant.id, pendingProfile);
      return {
        success: true,
        id: this.toNumber(merchant.id),
        profileAuditStatus: 1,
        message: '资料已提交，等待超级管理员审核',
      };
    }

    let status = merchant.status;
    if (body.auditStatus !== undefined) {
      if (body.auditStatus === 'APPROVED' || body.auditStatus === 1) status = 1;
      else if (body.auditStatus === 'REJECTED' || body.auditStatus === 3) status = 3;
      else if (body.auditStatus === 'PENDING_AUDIT' || body.auditStatus === 2) status = 2;
    }

    if (body.status !== undefined) {
      status = Number(body.status);
    }

    const updated = await this.prisma.merchant.update({
      where: { id: BigInt(merchantId) },
      data: {
        storeName: body.storeName !== undefined ? String(body.storeName) : undefined,
        storeLogo: body.storeLogo !== undefined ? String(body.storeLogo) : undefined,
        contactName: body.contactName !== undefined ? String(body.contactName) : undefined,
        contactMobile: body.contactMobile !== undefined ? String(body.contactMobile) : undefined,
        commissionRate: body.commissionRate !== undefined ? new Prisma.Decimal(body.commissionRate) : undefined,
        status,
      },
    });

    return { success: true, id: this.toNumber(updated.id) };
  }

  async auditMerchantProfile(merchantId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope, '仅平台管理员可审核商户资料');

    const action = String(body.action ?? body.auditStatus ?? '').trim().toLowerCase();
    const isApprove =
      action === 'approve' ||
      action === 'approved' ||
      action === '3' ||
      Number(body.auditStatus) === 3;
    const remark = String(body.remark ?? '').trim();

    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
    if (merchant.profileAuditStatus !== 1) {
      throw new BadRequestException('当前没有待审核的资料变更');
    }

    if (isApprove) {
      const pending = (merchant.pendingProfileJson ?? {}) as Record<string, unknown>;
      await this.prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          storeName: typeof pending.storeName === 'string' ? pending.storeName : merchant.storeName,
          storeLogo: typeof pending.storeLogo === 'string' ? pending.storeLogo : merchant.storeLogo,
          contactName: typeof pending.contactName === 'string' ? pending.contactName : merchant.contactName,
          contactMobile: typeof pending.contactMobile === 'string' ? pending.contactMobile : merchant.contactMobile,
          pendingProfileJson: Prisma.JsonNull,
          profileAuditStatus: 2,
          profileAuditRemark: null,
        },
      });
    } else {
      await this.prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          pendingProfileJson: Prisma.JsonNull,
          profileAuditStatus: 3,
          profileAuditRemark: remark || '资料变更已驳回',
        },
      });
    }

    await this.recordAdminOperation(authUser, 'AUDIT_MERCHANT_PROFILE', '商户管理', merchant.id, {
      action: isApprove ? 'approve' : 'reject',
      remark,
    });

    return {
      merchantId,
      profileAuditStatus: isApprove ? 2 : 3,
      success: true,
    };
  }

  async deleteAdminMerchant(merchantId: number, user: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(user);
    this.assertPlatformAdmin(merchantScope, '商户账号不可删除商户');

    const merchant = await this.prisma.merchant.findFirst({
      where: { id: BigInt(merchantId), deletedAt: null },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    await this.prisma.merchant.update({
      where: { id: BigInt(merchantId) },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  async listAdminProducts(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const productNature = String(query.productNature ?? '').trim();
    const deliveryType = query.deliveryType ? Number(query.deliveryType) : undefined;
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const rawAuditStatus = String(query.auditStatus ?? '').trim().toUpperCase();
    const auditStatus = (() => {
      if (rawAuditStatus === 'PENDING_AUDIT' || rawAuditStatus === '1') return 1;
      if (rawAuditStatus === 'APPROVED' || rawAuditStatus === '2') return 2;
      if (rawAuditStatus === 'REJECTED' || rawAuditStatus === '3' || rawAuditStatus === '4') return 3;
      return undefined;
    })();

    const rawStatus = String(query.status ?? '').trim().toUpperCase();
    // 商品上下架：1=上架，0=下架（历史错误把 OFF_SHELF 映射成了 2）
    const status = (() => {
      if (rawStatus === 'ON_SHELF' || rawStatus === '1') return 1;
      if (rawStatus === 'OFF_SHELF' || rawStatus === '0' || rawStatus === '2') return 0;
      if (rawStatus === 'DRAFT') return 0;
      return undefined;
    })();

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      ...(auditStatus !== undefined ? { auditStatus } : {}),
      ...(status !== undefined
        ? rawStatus === 'DRAFT'
          ? { status: 0, auditStatus: 1 }
          : { status }
        : {}),
      ...(Number.isFinite(deliveryType) && deliveryType! > 0 ? { deliveryType } : {}),
      ...(productNature
        ? {
            productNature: {
              contains: productNature,
            },
          }
        : {}),
      ...(keyword
          ? {
            OR: [
              ...(Number.isFinite(Number(keyword)) && Number(keyword) > 0
                ? [{ id: BigInt(Math.floor(Number(keyword))) }]
                : []),
              { title: { contains: keyword } },
              { subtitle: { contains: keyword } },
              { merchant: { storeName: { contains: keyword } } },
              { category: { name: { contains: keyword } } },
            ],
          }
          : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          merchantId: true,
          categoryId: true,
          auditStatus: true,
          auditRemark: true,
          status: true,
          productNature: true,
          deliveryType: true,
          coverUrl: true,
          updatedAt: true,
          skus: {
            select: {
              price: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    const merchantIds = [...new Set(products.map((product) => product.merchantId.toString()))].map((value) => BigInt(value));
    const categoryIds = [...new Set(products.map((product) => product.categoryId.toString()))].map((value) => BigInt(value));
    const productIds = products.map((product) => product.id);
    const [merchants, categories, salesRows] = await Promise.all([
      merchantIds.length
        ? this.prisma.merchant.findMany({
            where: { id: { in: merchantIds } },
            select: { id: true, storeName: true },
          })
        : Promise.resolve([]),
      categoryIds.length
        ? this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: { productId: { in: productIds } },
            _sum: { quantity: true },
          })
        : Promise.resolve([]),
    ]);
    const merchantMap = new Map(merchants.map((merchant) => [merchant.id.toString(), merchant.storeName]));
    const categoryMap = new Map(categories.map((category) => [category.id.toString(), category.name]));
    const salesMap = new Map(
      salesRows.map((row) => [row.productId.toString(), Number(row._sum.quantity ?? 0)]),
    );

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: products.map((product) => ({
        id: this.toNumber(product.id),
        title: product.title,
        merchantName: merchantMap.get(product.merchantId.toString()) ?? '未知商户',
        categoryName: categoryMap.get(product.categoryId.toString()) ?? '未知类目',
        productNature: product.productNature ?? '',
        deliveryType: product.deliveryType ?? 1,
        auditStatus:
          product.auditStatus === 1
            ? 'PENDING_AUDIT'
            : product.auditStatus === 2
              ? 'APPROVED'
              : 'REJECTED',
        auditRemark: product.auditRemark ?? '',
        status: product.status === 1 ? 'ON_SHELF' : 'OFF_SHELF',
        minPrice: product.skus[0] ? this.computeDisplayPrice(product.skus[0]) : '0.00',
        coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
        salesCount: salesMap.get(product.id.toString()) ?? 0,
        updatedAt: product.updatedAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
    };
  }

  async listAdminRefunds(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const rawStatus = String(query.status ?? '').trim().toUpperCase();
    const status = (() => {
      if (rawStatus === 'APPROVED' || rawStatus === '3') return 3;
      if (rawStatus === 'REJECTED' || rawStatus === '4') return 4;
      if (rawStatus === 'PENDING_ARBITRATION' || rawStatus === '1') return 1;
      if (rawStatus === 'MERCHANT_REPLIED' || rawStatus === '2') return 2;
      return undefined;
    })();

    const where: Prisma.RefundApplyWhereInput = {
      deletedAt: null,
      ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(keyword
          ? {
            OR: [
              { refundNo: { contains: keyword } },
              { order: { orderNo: { contains: keyword } } },
              { user: { nickname: { contains: keyword } } },
              { user: { mobile: { contains: keyword } } },
              { merchant: { storeName: { contains: keyword } } },
            ],
          }
          : {}),
    };

    const [total, refunds] = await Promise.all([
      this.prisma.refundApply.count({ where }),
      this.prisma.refundApply.findMany({
        where,
        include: {
          order: true,
          user: true,
          merchant: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: refunds.map((refund) => ({
        refundNo: refund.refundNo,
        orderNo: refund.order.orderNo,
        userName: refund.user.nickname ?? refund.user.mobile ?? '用户',
        merchantName: refund.merchant.storeName,
        amount: this.toMoney(refund.refundAmount),
        applyType: refund.applyType,
        applyReason: refund.applyReason,
        userEvidence: this.normalizeRefundImages(refund.applyImages),
        merchantRemark: refund.merchantRemark,
        adminRemark: refund.adminRemark,
        status: this.getRefundStatusLabel(refund.status),
        statusText: this.getRefundStatusText(refund.status),
        createdAt: refund.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
    };
  }

  async listAdminOrders(query: Record<string, string>, authUser?: AuthUser) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const rawStatus = String(query.status ?? '').trim().toUpperCase();
    const orderStatusFilter = (() => {
      if (rawStatus === 'PENDING_PAY' || rawStatus === '1' || rawStatus === '待支付') {
        return {
          orderStatus: { in: [1, 2] },
          payStatus: 0 as const,
        };
      }
      if (rawStatus === 'TO_SHIP' || rawStatus === '待发货') {
        return {
          payStatus: 1 as const,
          orderStatus: { in: [1, 2] },
          deliveryStatus: { lt: 2 },
        };
      }
      if (rawStatus === 'SHIPPED' || rawStatus === '已发货') {
        return {
          payStatus: 1 as const,
          orderStatus: { in: [1, 2] },
          deliveryStatus: { gte: 2 },
        };
      }
      if (rawStatus === 'COMPLETED' || rawStatus === '3' || rawStatus === '已完成') {
        return { orderStatus: 3 as const };
      }
      if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED' || rawStatus === '4' || rawStatus === '已取消') {
        return { orderStatus: 4 as const };
      }
      return {};
    })();

    const payStatus = query.payStatus ? Number(query.payStatus) : undefined;
    const deliveryStatus = query.deliveryStatus ? Number(query.deliveryStatus) : undefined;
    const isGroupBuyOrder = String(query.orderMode ?? '').trim().toUpperCase() === 'GROUP_BUY';

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      ...orderStatusFilter,
      ...(payStatus !== undefined && !Number.isNaN(payStatus) && !('payStatus' in orderStatusFilter)
        ? { payStatus }
        : {}),
      ...(deliveryStatus !== undefined && !Number.isNaN(deliveryStatus) && !('deliveryStatus' in orderStatusFilter)
        ? { deliveryStatus }
        : {}),
      ...(isGroupBuyOrder ? { groupBuyId: { not: null } } : {}),
      ...(keyword
          ? {
            OR: [
              { orderNo: { contains: keyword } },
              { remark: { contains: keyword } },
              { merchant: { storeName: { contains: keyword } } },
              { user: { nickname: { contains: keyword } } },
              { user: { mobile: { contains: keyword } } },
            ],
          }
          : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          merchant: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: orders.map((order) => ({
        orderNo: order.orderNo,
        merchantName: order.merchant.storeName,
        userName: order.user.nickname ?? order.user.mobile ?? '用户',
        status: this.getAdminOrderStatusLabel(order.orderStatus, order.deliveryStatus, order.payStatus),
        payStatus: order.payStatus,
        deliveryStatus: order.deliveryStatus,
        afterSaleStatus: order.refundStatus,
        totalAmount: this.toMoney(order.goodsAmount),
        freightAmount: this.toMoney(order.freightAmount),
        discountAmount: this.toMoney(order.discountAmount),
        payAmount: this.toMoney(order.payAmount),
        isGroupBuy: order.groupBuyId != null,
        groupBuyId: order.groupBuyId != null ? this.toNumber(order.groupBuyId) : null,
      })),
    };
  }

  /** 拼团实例列表 + 状态统计，供运营后台查看进行中/已成团/已失败的团 */
  async listAdminGroupBuys(query: Record<string, string>) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();

    const rawStatus = String(query.status ?? '').trim().toUpperCase();
    const status = ['OPEN', 'COMPLETED', 'FAILED'].includes(rawStatus) ? rawStatus : undefined;

    const where: Prisma.GroupBuyWhereInput = {
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { groupNo: { contains: keyword } },
              { inviteCode: { contains: keyword } },
              { product: { title: { contains: keyword } } },
            ],
          }
        : {}),
    };

    const [total, groups, statusCounts] = await Promise.all([
      this.prisma.groupBuy.count({ where }),
      this.prisma.groupBuy.findMany({
        where,
        include: {
          product: { select: { title: true, coverUrl: true } },
          initiator: { select: { nickname: true, mobile: true } },
          members: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
      this.prisma.groupBuy.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const stats = { OPEN: 0, COMPLETED: 0, FAILED: 0 } as Record<'OPEN' | 'COMPLETED' | 'FAILED', number>;
    for (const row of statusCounts) {
      if (row.status === 'OPEN' || row.status === 'COMPLETED' || row.status === 'FAILED') {
        stats[row.status] = row._count._all;
      }
    }

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      stats,
      items: groups.map((g) => ({
        groupId: this.toNumber(g.id),
        groupNo: g.groupNo,
        inviteCode: g.inviteCode,
        status: g.status,
        productTitle: g.product.title,
        coverUrl: this.resolvePublicUrl(g.product.coverUrl) ?? '',
        initiatorName: g.initiator.nickname ?? g.initiator.mobile ?? '用户',
        needed: g.needed,
        memberCount: g.members.length,
        groupPrice: this.toMoney(g.groupPrice),
        originPrice: this.toMoney(g.originPrice),
        expireAt: g.expireAt.toISOString(),
        completedAt: g.completedAt ? g.completedAt.toISOString() : null,
        createdAt: g.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
    };
  }

  async listAdminCoupons(query: Record<string, string>) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const status = String(query.status ?? '').trim().toUpperCase();
    const type = String(query.type ?? '').trim().toUpperCase();

    const where: Prisma.CouponWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { type: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [total, coupons] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    const couponIds = coupons.map((coupon) => coupon.id);
    const stats = couponIds.length
      ? await this.prisma.userCoupon.groupBy({
          by: ['couponId', 'status'],
          where: { couponId: { in: couponIds } },
          _count: { _all: true },
        })
      : [];

    const statMap = new Map<string, { received: number; used: number; expired: number }>();
    for (const item of stats) {
      const key = String(item.couponId);
      const current = statMap.get(key) ?? { received: 0, used: 0, expired: 0 };
      const count = item._count._all;
      if (item.status === 'RECEIVED') current.received += count;
      if (item.status === 'USED') current.used += count;
      if (item.status === 'EXPIRED') current.expired += count;
      statMap.set(key, current);
    }

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: coupons.map((coupon) => {
        const stat = statMap.get(String(coupon.id)) ?? { received: 0, used: 0, expired: 0 };
        return {
          id: this.toNumber(coupon.id),
          name: coupon.name,
          type: coupon.type,
          thresholdAmount: this.toMoney(coupon.thresholdAmount),
          discountAmount: this.toMoney(coupon.discountAmount),
          stock: coupon.stock,
          issuedStock: coupon.issuedStock,
          remainingStock: Math.max(coupon.stock - coupon.issuedStock, 0),
          receivedCount: stat.received,
          usedCount: stat.used,
          expiredCount: stat.expired,
          validStartAt: this.toIso(coupon.validStartAt),
          validEndAt: this.toIso(coupon.validEndAt),
          scope: coupon.scope,
          perUserLimit: coupon.perUserLimit,
          status: coupon.status,
          isActive: coupon.status === 'ENABLED' && this.isCouponInValidWindow(coupon),
          ruleJson: coupon.ruleJson ?? null,
          createdAt: this.toIso(coupon.createdAt),
          updatedAt: this.toIso(coupon.updatedAt),
        };
      }),
    };
  }

  async listAdminExchangeItems(query: Record<string, string>) {
    const result = await this.listAdminCoupons({
      ...query,
      type: 'CASHBACK',
    });

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        exchangeKind: this.getExchangeKindFromRuleJson(item.ruleJson),
      })),
    };
  }

  async getAdminExchangeItemDetail(couponId: number) {
    const detail = await this.getAdminCouponDetail(couponId);
    return {
      ...detail,
      exchangeKind: this.getExchangeKindFromRuleJson(detail.ruleJson),
    };
  }

  private getExchangeKindFromRuleJson(ruleJson: Prisma.JsonValue | null | undefined): 'COUPON' | 'PRODUCT' {
    if (ruleJson && typeof ruleJson === 'object' && !Array.isArray(ruleJson)) {
      const rule = ruleJson as Record<string, unknown>;
      return String(rule.exchangeKind ?? 'COUPON').toUpperCase() === 'PRODUCT' ? 'PRODUCT' : 'COUPON';
    }

    return 'COUPON';
  }

  private getExchangeRuleObject(ruleJson: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    if (ruleJson && typeof ruleJson === 'object' && !Array.isArray(ruleJson)) {
      return ruleJson as Record<string, unknown>;
    }
    return {};
  }

  private resolveExchangePointsCost(
    coupon: { discountAmount: Prisma.Decimal | number | string; ruleJson?: Prisma.JsonValue | null },
    redeemRate: number,
  ) {
    const rule = this.getExchangeRuleObject(coupon.ruleJson);
    const explicit = Number(rule.pointsCost ?? 0);
    if (Number.isFinite(explicit) && explicit > 0) {
      return Math.max(Math.floor(explicit), 1);
    }
    const rate = Number.isFinite(redeemRate) && redeemRate > 0 ? redeemRate : 100;
    return Math.max(Math.ceil(Number(coupon.discountAmount) * rate), rate);
  }

  async createAdminExchangeItem(body: Record<string, unknown>, authUser?: AuthUser) {
    const exchangeKind =
      String((body.ruleJson as Record<string, unknown> | undefined)?.exchangeKind ?? body.exchangeKind ?? 'COUPON')
        .trim()
        .toUpperCase() === 'PRODUCT'
        ? 'PRODUCT'
        : 'COUPON';

    let productMeta: {
      productId: number;
      skuId: number | null;
      title: string;
      coverUrl: string;
      price: string;
    } | null = null;

    if (exchangeKind === 'PRODUCT') {
      const productId = Number(
        body.productId ??
          (body.ruleJson && typeof body.ruleJson === 'object'
            ? (body.ruleJson as Record<string, unknown>).productId
            : 0),
      );
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new BadRequestException('请选择兑换商品');
      }
      const pointsCost = Number(body.pointsCost ?? (body.ruleJson as Record<string, unknown> | undefined)?.pointsCost ?? 0);
      if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
        throw new BadRequestException('请设置兑换所需积分');
      }

      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(productId), deletedAt: null },
        include: { skus: { orderBy: { id: 'asc' }, take: 1 } },
      });
      if (!product) {
        throw new BadRequestException('所选商品不存在');
      }
      const sku = product.skus[0];
      productMeta = {
        productId: this.toNumber(product.id),
        skuId: sku ? this.toNumber(sku.id) : null,
        title: product.title,
        coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
        price: sku ? this.toMoney(sku.price) : '0.01',
      };
    }

    const incomingRule =
      body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson)
        ? (body.ruleJson as Record<string, unknown>)
        : {};
    const pointsCost = Number(body.pointsCost ?? incomingRule.pointsCost ?? 0);

    const payload = {
      ...body,
      name: String(body.name ?? productMeta?.title ?? '').trim() || productMeta?.title || '积分兑换商品',
      type: 'CASHBACK',
      thresholdAmount: exchangeKind === 'PRODUCT' ? '0.00' : body.thresholdAmount,
      discountAmount:
        exchangeKind === 'PRODUCT'
          ? String(body.discountAmount ?? productMeta?.price ?? '0.01')
          : body.discountAmount,
      scope: exchangeKind === 'PRODUCT' ? 'ALL' : body.scope,
      categoryIds: exchangeKind === 'PRODUCT' ? [] : body.categoryIds,
      merchantIds: exchangeKind === 'PRODUCT' ? [] : body.merchantIds,
      ruleJson: {
        ...incomingRule,
        exchangeKind,
        ...(exchangeKind === 'PRODUCT' && productMeta
          ? {
              productId: productMeta.productId,
              skuId: productMeta.skuId,
              coverUrl: productMeta.coverUrl,
              productTitle: productMeta.title,
            }
          : {}),
        ...(Number.isFinite(pointsCost) && pointsCost > 0 ? { pointsCost: Math.floor(pointsCost) } : {}),
      },
    };

    return this.createAdminCoupon(payload, authUser);
  }

  async updateAdminExchangeItem(couponId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const existing = await this.prisma.coupon.findUnique({ where: { id: BigInt(couponId) } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Coupon not found');
    }

    const existingRule = this.getExchangeRuleObject(existing.ruleJson);
    const exchangeKind =
      String(
        (body.ruleJson as Record<string, unknown> | undefined)?.exchangeKind ??
          body.exchangeKind ??
          existingRule.exchangeKind ??
          'COUPON',
      )
        .trim()
        .toUpperCase() === 'PRODUCT'
        ? 'PRODUCT'
        : 'COUPON';

    let productMeta: {
      productId: number;
      skuId: number | null;
      title: string;
      coverUrl: string;
      price: string;
    } | null = null;

    if (exchangeKind === 'PRODUCT') {
      const productId = Number(
        body.productId ??
          (body.ruleJson && typeof body.ruleJson === 'object'
            ? (body.ruleJson as Record<string, unknown>).productId
            : existingRule.productId) ??
          0,
      );
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new BadRequestException('请选择兑换商品');
      }
      const pointsCost = Number(
        body.pointsCost ??
          (body.ruleJson as Record<string, unknown> | undefined)?.pointsCost ??
          existingRule.pointsCost ??
          0,
      );
      if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
        throw new BadRequestException('请设置兑换所需积分');
      }

      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(productId), deletedAt: null },
        include: { skus: { orderBy: { id: 'asc' }, take: 1 } },
      });
      if (!product) {
        throw new BadRequestException('所选商品不存在');
      }
      const sku = product.skus[0];
      productMeta = {
        productId: this.toNumber(product.id),
        skuId: sku ? this.toNumber(sku.id) : null,
        title: product.title,
        coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
        price: sku ? this.toMoney(sku.price) : '0.01',
      };
    }

    const incomingRule =
      body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson)
        ? (body.ruleJson as Record<string, unknown>)
        : {};
    const pointsCost = Number(body.pointsCost ?? incomingRule.pointsCost ?? existingRule.pointsCost ?? 0);

    const payload = {
      ...body,
      name: String(body.name ?? productMeta?.title ?? existing.name).trim() || existing.name,
      type: 'CASHBACK',
      thresholdAmount: exchangeKind === 'PRODUCT' ? '0.00' : body.thresholdAmount,
      discountAmount:
        exchangeKind === 'PRODUCT'
          ? String(body.discountAmount ?? productMeta?.price ?? existing.discountAmount)
          : body.discountAmount,
      scope: exchangeKind === 'PRODUCT' ? 'ALL' : body.scope,
      categoryIds: exchangeKind === 'PRODUCT' ? [] : body.categoryIds,
      merchantIds: exchangeKind === 'PRODUCT' ? [] : body.merchantIds,
      ruleJson: {
        ...existingRule,
        ...incomingRule,
        exchangeKind,
        ...(exchangeKind === 'PRODUCT' && productMeta
          ? {
              productId: productMeta.productId,
              skuId: productMeta.skuId,
              coverUrl: productMeta.coverUrl,
              productTitle: productMeta.title,
            }
          : {}),
        ...(Number.isFinite(pointsCost) && pointsCost > 0 ? { pointsCost: Math.floor(pointsCost) } : {}),
      },
    };

    return this.updateAdminCoupon(couponId, payload, authUser);
  }

  async updateAdminExchangeItemStatus(couponId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    return this.updateAdminCouponStatus(couponId, body, authUser);
  }

  async deleteAdminExchangeItem(couponId: number, authUser?: AuthUser) {
    return this.deleteAdminCoupon(couponId, authUser);
  }

  async getAdminCouponDetail(couponId: number) {
    await this.withSeed();
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: BigInt(couponId) },
    });
    if (!coupon || coupon.deletedAt) {
      throw new NotFoundException('Coupon not found');
    }

    const stats = await this.prisma.userCoupon.groupBy({
      by: ['status'],
      where: { couponId: coupon.id },
      _count: { _all: true },
    });
    const statMap = new Map(stats.map((item) => [item.status, item._count._all]));

    return {
      id: this.toNumber(coupon.id),
      name: coupon.name,
      type: coupon.type,
      thresholdAmount: this.toMoney(coupon.thresholdAmount),
      discountAmount: this.toMoney(coupon.discountAmount),
      stock: coupon.stock,
      issuedStock: coupon.issuedStock,
      remainingStock: Math.max(coupon.stock - coupon.issuedStock, 0),
      receivedCount: statMap.get('RECEIVED') ?? 0,
      usedCount: statMap.get('USED') ?? 0,
      expiredCount: statMap.get('EXPIRED') ?? 0,
      validStartAt: this.toIso(coupon.validStartAt),
      validEndAt: this.toIso(coupon.validEndAt),
      scope: coupon.scope,
      perUserLimit: coupon.perUserLimit,
      status: coupon.status,
      isActive: coupon.status === 'ENABLED' && this.isCouponInValidWindow(coupon),
      createdAt: this.toIso(coupon.createdAt),
      updatedAt: this.toIso(coupon.updatedAt),
      ruleJson: coupon.ruleJson ?? null,
    };
  }

  async createAdminCoupon(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const name = String(body.name ?? '').trim();
    const type = String(body.type ?? 'CASHBACK').trim().toUpperCase();
    const thresholdAmount = new Prisma.Decimal(String(body.thresholdAmount ?? '0'));
    const discountAmount = new Prisma.Decimal(String(body.discountAmount ?? '0'));
    const stock = Math.max(Number(body.stock ?? 0) || 0, 0);
    const status = this.getCouponAdminStatusLabel(String(body.status ?? 'ENABLED'));
    const { scope, perUserLimit, validStartAt, validEndAt, ruleJson } = this.parseCouponRule(body);

    if (!name) {
      throw new BadRequestException('Coupon name is required');
    }
    if (discountAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Discount amount must be greater than 0');
    }
    if (thresholdAmount.lessThan(0)) {
      throw new BadRequestException('Threshold amount cannot be negative');
    }
    this.validateCouponRuleConfig({ scope, ruleJson: ruleJson as Prisma.InputJsonValue });

    const coupon = await this.prisma.coupon.create({
      data: {
        name,
        type,
        thresholdAmount,
        discountAmount,
        stock,
        issuedStock: 0,
        validStartAt,
        validEndAt,
        scope,
        perUserLimit,
        ruleJson,
        status,
      },
    });

    await this.recordAdminOperation(authUser, 'CREATE_COUPON', '优惠券', coupon.id, {
      name,
      type,
      stock,
      status,
    });

    return {
      id: this.toNumber(coupon.id),
      name: coupon.name,
      type: coupon.type,
      thresholdAmount: this.toMoney(coupon.thresholdAmount),
      discountAmount: this.toMoney(coupon.discountAmount),
      stock: coupon.stock,
      issuedStock: coupon.issuedStock,
      remainingStock: Math.max(coupon.stock - coupon.issuedStock, 0),
      validStartAt: this.toIso(coupon.validStartAt),
      validEndAt: this.toIso(coupon.validEndAt),
      scope: coupon.scope,
      perUserLimit: coupon.perUserLimit,
      status: coupon.status,
      isActive: coupon.status === 'ENABLED' && this.isCouponInValidWindow(coupon),
    };
  }

  async updateAdminCoupon(couponId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const id = BigInt(couponId);
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon || coupon.deletedAt) {
      throw new NotFoundException('Coupon not found');
    }

    const nextStatus = body.status != null ? this.getCouponAdminStatusLabel(String(body.status)) : coupon.status;
    const nextValidStartAt = body.validStartAt != null ? this.parseDate(body.validStartAt) : coupon.validStartAt;
    const nextValidEndAt = body.validEndAt != null ? this.parseDate(body.validEndAt) : coupon.validEndAt;
    const nextScope = body.scope != null ? String(body.scope).trim().toUpperCase() || 'ALL' : coupon.scope;
    const nextPerUserLimit = body.perUserLimit != null ? Math.max(Number(body.perUserLimit) || 1, 1) : coupon.perUserLimit;
    const hasRuleUpdate = ['ruleJson', 'categoryIds', 'merchantIds', 'scope'].some((key) => body[key as keyof typeof body] != null);
    const nextRuleJson = hasRuleUpdate ? this.parseCouponRule(body).ruleJson : coupon.ruleJson ?? undefined;
    this.validateCouponRuleConfig({
      scope: nextScope,
      ruleJson: (nextRuleJson ?? coupon.ruleJson ?? null) as Prisma.JsonValue | Prisma.InputJsonValue | null,
    });

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        name: body.name != null ? String(body.name).trim() : coupon.name,
        type: body.type != null ? String(body.type).trim().toUpperCase() : coupon.type,
        thresholdAmount: body.thresholdAmount != null ? new Prisma.Decimal(String(body.thresholdAmount)) : coupon.thresholdAmount,
        discountAmount: body.discountAmount != null ? new Prisma.Decimal(String(body.discountAmount)) : coupon.discountAmount,
        stock: body.stock != null ? Math.max(Number(body.stock) || 0, 0) : coupon.stock,
        validStartAt: nextValidStartAt,
        validEndAt: nextValidEndAt,
        scope: nextScope,
        perUserLimit: nextPerUserLimit,
        status: nextStatus,
        ...(hasRuleUpdate ? { ruleJson: nextRuleJson ?? Prisma.JsonNull } : {}),
      },
    });

    await this.recordAdminOperation(authUser, 'UPDATE_COUPON', '优惠券', updated.id, {
      couponId,
      name: updated.name,
      status: updated.status,
    });

    return {
      id: this.toNumber(updated.id),
      name: updated.name,
      type: updated.type,
      thresholdAmount: this.toMoney(updated.thresholdAmount),
      discountAmount: this.toMoney(updated.discountAmount),
      stock: updated.stock,
      issuedStock: updated.issuedStock,
      remainingStock: Math.max(updated.stock - updated.issuedStock, 0),
      validStartAt: this.toIso(updated.validStartAt),
      validEndAt: this.toIso(updated.validEndAt),
      scope: updated.scope,
      perUserLimit: updated.perUserLimit,
      status: updated.status,
      isActive: updated.status === 'ENABLED' && this.isCouponInValidWindow(updated),
    };
  }

  async updateAdminCouponStatus(couponId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    return this.updateAdminCoupon(couponId, { status: body.status }, authUser);
  }

  async deleteAdminCoupon(couponId: number, authUser?: AuthUser) {
    await this.withSeed();
    const id = BigInt(couponId);
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon || coupon.deletedAt) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.coupon.update({
      where: { id },
      data: { deletedAt: this.now(), status: 'DISABLED' },
    });

    await this.recordAdminOperation(authUser, 'DELETE_COUPON', '优惠券', id, {
      couponId,
      name: coupon.name,
    });

    return { success: true, id: couponId };
  }

  async issueAdminCoupon(couponId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const userId = Number(body.userId ?? 0);
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: BigInt(couponId) },
    });
    if (!coupon || coupon.deletedAt) {
      throw new NotFoundException('Coupon not found');
    }
    if (coupon.status !== 'ENABLED' || !this.isCouponInValidWindow(coupon)) {
      throw new BadRequestException('Coupon is not active');
    }

    const user = await this.prisma.user.findUnique({ where: { id: BigInt(userId) } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const existed = await this.prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId: BigInt(userId),
          couponId: coupon.id,
        },
      },
    });
    if (existed) {
      return {
        success: true,
        couponId,
        userId,
        alreadyIssued: true,
      };
    }

    if (coupon.stock <= coupon.issuedStock) {
      throw new BadRequestException('Coupon stock is insufficient');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.coupon.updateMany({
        where: { id: coupon.id, stock: { gt: coupon.issuedStock } },
        data: { issuedStock: { increment: 1 } },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Coupon stock is insufficient');
      }

      await tx.userCoupon.create({
        data: {
          userId: BigInt(userId),
          couponId: coupon.id,
          status: 'RECEIVED',
          sourceType: 'ADMIN',
          expiredAt: coupon.validEndAt ?? null,
        },
      });
    });

    await this.recordAdminOperation(authUser, 'ISSUE_COUPON', '优惠券', coupon.id, {
      couponId,
      userId,
    });

    return {
      success: true,
      couponId,
      userId,
      alreadyIssued: false,
    };
  }

  async getAdminOrderDetail(orderNo: string, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    const order = await this.prisma.order.findFirst({
      where: {
        orderNo,
        deletedAt: null,
        ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      },
      include: {
        merchant: true,
        items: true,
        user: true,
        deliveries: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const delivery = order.deliveries[0];

    return {
      orderNo: order.orderNo,
      merchantId: this.toNumber(order.merchantId),
      merchantName: order.merchant.storeName,
      userName: order.user.nickname ?? order.user.mobile ?? '用户',
      status: this.getAdminOrderStatusLabel(order.orderStatus, order.deliveryStatus, order.payStatus),
      payStatus: order.payStatus,
      deliveryStatus: order.deliveryStatus,
      afterSaleStatus: order.refundStatus,
      totalAmount: this.toMoney(order.goodsAmount),
      freightAmount: this.toMoney(order.freightAmount),
      discountAmount: this.toMoney(order.discountAmount),
      payAmount: this.toMoney(order.payAmount),
      remark: order.remark ?? '',
      addressSnapshot: order.addressSnapshot,
      createdAt: this.formatChinaDateTime(order.createdAt),
      paidAt: order.paidAt ? this.formatChinaDateTime(order.paidAt) : '',
      logisticsCompany: delivery?.logisticsCompany ?? '',
      trackingNo: delivery?.trackingNo ?? '',
      shippedAt: delivery?.shippedAt ? this.formatChinaDateTime(delivery.shippedAt) : null,
      canShip:
        order.payStatus === PlatformDataService.PAY_STATUS.PAID &&
        order.orderStatus !== PlatformDataService.ORDER_STATUS.CANCELLED &&
        order.orderStatus !== PlatformDataService.ORDER_STATUS.COMPLETED &&
        order.deliveryStatus < PlatformDataService.DELIVERY_STATUS.SHIPPED &&
        order.refundStatus !== PlatformDataService.REFUND_STATUS.PENDING_MERCHANT &&
        order.refundStatus !== PlatformDataService.REFUND_STATUS.PROCESSING,
      canUpdateLogistics:
        order.payStatus === PlatformDataService.PAY_STATUS.PAID &&
        order.orderStatus !== PlatformDataService.ORDER_STATUS.CANCELLED &&
        order.deliveryStatus >= PlatformDataService.DELIVERY_STATUS.SHIPPED &&
        Boolean(delivery?.trackingNo || delivery?.logisticsCompany),
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
  }

  async shipAdminOrder(orderNo: string, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const trackingNo = String(body.trackingNo ?? '').trim();
    if (!trackingNo) {
      throw new BadRequestException('请填写快递单号');
    }
    const logisticsCompany = String(body.logisticsCompany ?? '').trim() || '默认物流';
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const order = await this.prisma.order.findFirst({
      where: {
        orderNo,
        deletedAt: null,
        isParent: false,
        ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      },
      select: {
        id: true,
        merchantId: true,
        orderStatus: true,
        payStatus: true,
        deliveryStatus: true,
        refundStatus: true,
        groupBuyId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payStatus !== PlatformDataService.PAY_STATUS.PAID) {
      throw new BadRequestException('订单未支付，无法发货');
    }
    if (order.orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('订单已取消，无法发货');
    }
    if (order.orderStatus === PlatformDataService.ORDER_STATUS.COMPLETED) {
      throw new BadRequestException('订单已完成，无法发货');
    }
    if (order.deliveryStatus >= PlatformDataService.DELIVERY_STATUS.SHIPPED) {
      throw new BadRequestException('订单已发货');
    }
    if (
      order.refundStatus === PlatformDataService.REFUND_STATUS.PENDING_MERCHANT ||
      order.refundStatus === PlatformDataService.REFUND_STATUS.PROCESSING
    ) {
      throw new BadRequestException('售后处理中，暂不可发货');
    }

    await this.assertGroupBuyFulfillable(order.groupBuyId);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
        orderStatus: PlatformDataService.ORDER_STATUS.ACCEPTED,
      },
    });

    const existingDelivery = await this.prisma.deliveryRecord.findFirst({ where: { orderId: order.id } });
    if (existingDelivery) {
      await this.prisma.deliveryRecord.update({
        where: { id: existingDelivery.id },
        data: {
          logisticsCompany,
          trackingNo,
          deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
          shippedAt: this.now(),
        },
      });
    } else {
      await this.prisma.deliveryRecord.create({
        data: {
          orderId: order.id,
          merchantId: order.merchantId,
          logisticsCompany,
          trackingNo,
          deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
          shippedAt: this.now(),
        },
      });
    }

    return {
      orderNo,
      trackingNo,
      logisticsCompany,
      deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
      status: '已发货',
    };
  }

  async updateAdminOrderLogistics(orderNo: string, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const trackingNo = String(body.trackingNo ?? '').trim();
    if (!trackingNo) {
      throw new BadRequestException('请填写快递单号');
    }
    const logisticsCompany = String(body.logisticsCompany ?? '').trim() || '默认物流';
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const order = await this.prisma.order.findFirst({
      where: {
        orderNo,
        deletedAt: null,
        isParent: false,
        ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
      },
      select: {
        id: true,
        merchantId: true,
        orderStatus: true,
        payStatus: true,
        deliveryStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.payStatus !== PlatformDataService.PAY_STATUS.PAID) {
      throw new BadRequestException('订单未支付，无法修正物流');
    }
    if (order.orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('订单已取消，无法修正物流');
    }
    if (order.deliveryStatus < PlatformDataService.DELIVERY_STATUS.SHIPPED) {
      throw new BadRequestException('订单尚未发货，请先录入物流');
    }

    const existingDelivery = await this.prisma.deliveryRecord.findFirst({
      where: { orderId: order.id },
      orderBy: { id: 'desc' },
    });
    if (!existingDelivery) {
      throw new BadRequestException('未找到物流记录，无法修正');
    }

    await this.prisma.deliveryRecord.update({
      where: { id: existingDelivery.id },
      data: {
        logisticsCompany,
        trackingNo,
        deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
      },
    });

    await this.recordAdminOperation(authUser, 'UPDATE_ORDER_LOGISTICS', '订单管理', order.id, {
      orderNo,
      logisticsCompany,
      trackingNo,
      previousLogisticsCompany: existingDelivery.logisticsCompany,
      previousTrackingNo: existingDelivery.trackingNo,
    });

    return {
      orderNo,
      trackingNo,
      logisticsCompany,
      deliveryStatus: PlatformDataService.DELIVERY_STATUS.SHIPPED,
      status: '已发货',
      updated: true,
    };
  }

  async auditMerchant(merchantId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope, '仅平台管理员可审核商户入驻');

    const auditStatus = Number(body.auditStatus ?? 3);
    const isReject = auditStatus === 4;

    await this.prisma.merchant.updateMany({
      where: { id: BigInt(merchantId) },
      data: {
        status: auditStatus === 3 ? 1 : (isReject ? 3 : 2),
      },
    });

    if (isReject) {
      await this.prisma.merchantQualification.updateMany({
        where: { merchantId: BigInt(merchantId) },
        data: {
          status: 3, // REJECTED
          auditRemark: String(body.remark ?? '资质被驳回，请重新上传'),
        },
      });
    } else if (auditStatus === 3) {
      await this.prisma.merchantQualification.updateMany({
        where: { merchantId: BigInt(merchantId) },
        data: {
          status: 1, // APPROVED
          auditRemark: '审核通过',
        },
      });
    }

    if (auditStatus === 3) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: BigInt(merchantId) },
      });
      if (merchant) {
        const merchantRole = await this.prisma.role.findUnique({
          where: { code: 'MERCHANT' },
        });
        if (merchantRole) {
          await this.prisma.userRole.upsert({
            where: {
              userId_roleId: {
                userId: merchant.userId,
                roleId: merchantRole.id,
              },
            },
            create: {
              userId: merchant.userId,
              roleId: merchantRole.id,
            },
            update: {},
          });
        }
        // P0-1: 商户审核通过时自动初始化钱包
        await this.prisma.merchantWallet.upsert({
          where: { merchantId: merchant.id },
          create: {
            merchantId: merchant.id,
            availableBalance: new Prisma.Decimal('0.00'),
            frozenBalance: new Prisma.Decimal('0.00'),
            totalIncome: new Prisma.Decimal('0.00'),
            totalWithdrawn: new Prisma.Decimal('0.00'),
          },
          update: {},
        });
        // 自动创建后台商户账号（手机号登录），密码可在「同步商户账号/重置密码」中获取
        await this.createMerchantAdminAccount(merchant.id);
      }
    }

    await this.recordAdminOperation(
        authUser,
        'AUDIT_MERCHANT',
        '商户管理',
        merchantId,
        { auditStatus, remark: body.remark ?? '' },
    );

    return {
      merchantId,
      auditStatus,
      remark: body.remark ?? 'approved',
    };
  }

  async auditProduct(productId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    this.assertPlatformAdmin(merchantScope, '仅平台管理员可审核商品');

    const auditStatus = Number(body.auditStatus ?? 3);
    // 与商户审核约定一致：3=通过，4=驳回；兼容旧值 1=驳回
    const isReject = auditStatus === 4 || auditStatus === 1;
    const isApprove = auditStatus === 3 || auditStatus === 2;
    const newAuditStatus = isApprove ? 2 : isReject ? 3 : 1;
    const remark = typeof body.remark === 'string' ? body.remark.trim() : '';

    await this.prisma.product.updateMany({
      where: { id: BigInt(productId) },
      data: {
        auditStatus: newAuditStatus,
        ...(isReject ? { status: 0, auditRemark: remark || '商品审核未通过' } : {}),
        ...(isApprove ? { status: 1, auditRemark: remark || '商品审核通过' } : {}),
      },
    });

    // 审核拒绝时向商家推送通知
    if (isReject) {
      const product = await this.prisma.product.findUnique({
        where: { id: BigInt(productId) },
        include: { merchant: true },
      });
      if (product?.merchant) {
        const message = await this.prisma.systemMessage.create({
          data: {
            type: 'NOTIFICATION',
            title: '商品审核未通过',
            summary: `您的商品「${product.title}」未通过平台审核${remark ? `，原因：${remark}` : ''}`,
            contentType: 'TEXT',
            contentJson: {
              productId,
              productTitle: product.title,
              auditStatus: newAuditStatus,
              reason: remark || null,
              auditedAt: this.now().toISOString(),
            } as Prisma.InputJsonValue,
            senderType: 'SYSTEM',
            bizType: 'PRODUCT_AUDIT',
            bizId: String(productId),
            publishAt: this.now(),
            status: 'PUBLISHED',
          },
        });
        await this.prisma.userMessage.create({
          data: {
            userId: product.merchant.userId,
            messageId: message.id,
            isRead: false,
            deliveredAt: this.now(),
          },
        });
      }
    }

    await this.recordAdminOperation(
        authUser,
        'AUDIT_PRODUCT',
        '商品管理',
        productId,
        { auditStatus: newAuditStatus, remark },
    );

    return {
      productId,
      auditStatus: newAuditStatus,
      remark: remark || (isApprove ? 'approved' : 'rejected'),
    };
  }

  async getDashboardOverview(periodDays?: number, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const since = periodDays ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : undefined;
    const orderWhere: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
    };

    if (merchantScope != null) {
      const [salesAmount, orderCount, buyerRows] = await Promise.all([
        this.prisma.order.aggregate({
          where: orderWhere,
          _sum: { payAmount: true },
        }),
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.findMany({
          where: orderWhere,
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      return {
        salesAmount: this.toMoney(salesAmount._sum.payAmount ?? 0),
        orderCount,
        userCount: buyerRows.length,
        merchantCount: 1,
        scoped: true,
      };
    }

    const [salesAmount, orderCount, userCount, merchantCount] = await Promise.all([
      this.prisma.order.aggregate({
        where: orderWhere,
        _sum: { payAmount: true },
      }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.user.count(),
      this.prisma.merchant.count({ where: { deletedAt: null } }),
    ]);

    return {
      salesAmount: this.toMoney(salesAmount._sum.payAmount ?? 0),
      orderCount,
      userCount,
      merchantCount,
      scoped: false,
    };
  }

  async getDashboardSales(periodDays?: number, authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);

    const since = periodDays ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : undefined;
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(merchantScope != null ? { merchantId: BigInt(merchantScope) } : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        createdAt: true,
        payAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, { date: string; salesAmount: number; orderCount: number }>();
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const current = grouped.get(date) ?? { date, salesAmount: 0, orderCount: 0 };
      current.salesAmount += Number(order.payAmount);
      current.orderCount += 1;
      grouped.set(date, current);
    }

    return [...grouped.values()].map((item) => ({
      date: item.date,
      salesAmount: item.salesAmount.toFixed(2),
      orderCount: item.orderCount,
    }));
  }

  async getHotProducts(authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    const merchantFilter =
      merchantScope != null ? { merchantId: BigInt(merchantScope) } : {};

    const salesRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where:
        merchantScope != null
          ? { order: { merchantId: BigInt(merchantScope), deletedAt: null } }
          : { order: { deletedAt: null } },
      _sum: { quantity: true },
    });

    const salesMap = new Map<string, number>();
    for (const row of salesRows) {
      salesMap.set(String(row.productId), Number(row._sum.quantity ?? 0));
    }

    const rankedIds = [...salesRows]
      .sort((a, b) => Number(b._sum.quantity ?? 0) - Number(a._sum.quantity ?? 0))
      .slice(0, 10)
      .map((row) => row.productId);

    let products = rankedIds.length
      ? await this.prisma.product.findMany({
          where: {
            id: { in: rankedIds },
            status: 1,
            auditStatus: 2,
            deletedAt: null,
            ...merchantFilter,
          },
          select: {
            id: true,
            title: true,
            coverUrl: true,
            subtitle: true,
            originPlace: true,
            skus: {
              select: { price: true },
              orderBy: { id: 'asc' },
            },
          },
        })
      : [];

    // 无销量时回退为本店（或平台）在售商品
    if (!products.length) {
      products = await this.prisma.product.findMany({
        where: { status: 1, auditStatus: 2, deletedAt: null, ...merchantFilter },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          subtitle: true,
          originPlace: true,
          skus: {
            select: { price: true },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
    } else {
      const orderIndex = new Map(rankedIds.map((id, index) => [id.toString(), index]));
      products.sort(
        (a, b) =>
          (orderIndex.get(a.id.toString()) ?? 999) - (orderIndex.get(b.id.toString()) ?? 999),
      );
    }

    return products.map((product) => ({
      id: this.toNumber(product.id),
      title: product.title,
      salesCount: salesMap.get(product.id.toString()) ?? 0,
      coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
      minPrice: product.skus[0] ? this.toMoney(product.skus[0].price) : '0.00',
      subtitle: product.subtitle ?? '',
      originPlace: this.normalizeOriginPlace(product.originPlace),
      isHot: true,
      icon: 'more',
    }));
  }

  async getQuickFlashSaleActive() {
    await this.withSeed();
    const syncedWindowIds = await this.ensurePublishedSeckillFlashSalesSynced();
    const now = new Date();
    const dayTabs = this.buildFlashSaleDayTabs(now);
    const todayTab = dayTabs[0] ?? null;

    if (!todayTab || syncedWindowIds.length === 0) {
      return {
        windows: dayTabs,
        items: [],
        generatedAt: now.toISOString(),
      };
    }

    const bounds = this.getChinaDayBounds(todayTab.id);
    if (!bounds) {
      return {
        windows: dayTabs,
        items: [],
        generatedAt: now.toISOString(),
      };
    }

    const overlappingWindows = await this.prisma.flashSaleWindow.findMany({
      where: {
        id: { in: syncedWindowIds.map((id) => BigInt(id)) },
        startAt: { lte: bounds.end },
        endAt: { gte: bounds.start },
      },
      orderBy: { startAt: 'asc' },
      take: 3,
    });

    const windows = overlappingWindows.map((w) => ({
      id: this.toNumber(w.id),
      label: w.label,
      startAt: w.startAt.toISOString(),
      endAt: w.endAt.toISOString(),
      status: this.computeFlashSaleStatus(w.startAt, w.endAt, now),
    }));

    const itemsQueryWindowIds = overlappingWindows.map((w) => w.id);
    let items: any[] = [];
    if (itemsQueryWindowIds.length > 0) {
      const dbItems = await this.prisma.flashSaleItem.findMany({
        where: { windowId: { in: itemsQueryWindowIds }, stockLeft: { gt: 0 } },
        include: { product: true, sku: true },
        orderBy: [{ flashPrice: 'asc' }, { id: 'asc' }],
        take: 8,
      });
      const seen = new Set<string>();
      items = dbItems
        .filter((entry) => {
          const key = String(entry.productId);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((entry, index) => {
          const { flashPrice, originPrice } = this.resolveFlashSalePrices({
            activityPrice: entry.flashPrice,
            originalPrice: entry.originPrice,
            skuPrice: entry.sku?.price,
            skuOriginalPrice: entry.sku?.originalPrice,
          });
          return {
            itemId: this.toNumber(entry.id),
            productId: this.toNumber(entry.productId),
            skuId: this.toNumber(entry.skuId),
            title: entry.product.title,
            subtitle: entry.product.subtitle ?? '',
            coverUrl: this.resolvePublicUrl(entry.product.coverUrl) ?? '',
            flashPrice: flashPrice.toFixed(2),
            originPrice: originPrice.toFixed(2),
            stockLeft: entry.stockLeft,
            totalStock: entry.totalStock,
            originPlace: this.normalizeOriginPlace(entry.product.originPlace) || undefined,
            badge: index < 2 ? '秒杀价' : '限时',
          };
        });
    }

    return {
      windows: dayTabs,
      items,
      generatedAt: now.toISOString(),
    };
  }

  private computeFlashSaleStatus(
      startAt: Date,
      endAt: Date,
      now: Date,
  ): 'ONGOING' | 'UPCOMING' | 'ENDED' {
    if (now < startAt) return 'UPCOMING';
    if (now > endAt) return 'ENDED';
    return 'ONGOING';
  }

  private parseActivityRuleJson(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private formatFreightRuleText(rule: {
    thresholdAmount: Prisma.Decimal | number | string;
    freightAmount: Prisma.Decimal | number | string;
  }): string {
    const threshold = Number(rule.thresholdAmount);
    const freight = Number(rule.freightAmount);
    const thresholdText = Number.isFinite(threshold) ? String(Math.round(threshold * 100) / 100) : '0';
    if (!Number.isFinite(freight) || freight <= 0) {
      return `满${thresholdText}元免运费`;
    }
    const freightText = String(Math.round(freight * 100) / 100);
    return `满${thresholdText}元运费¥${freightText}`;
  }

  private async listActiveFreightSubsidyRules() {
    const rules = await this.prisma.logisticsRule.findMany({
      where: { active: true },
      orderBy: [{ thresholdAmount: 'asc' }, { id: 'asc' }],
      take: 6,
    });
    return rules.map((rule) => ({
      id: this.toNumber(rule.id),
      name: rule.name,
      province: rule.province,
      thresholdAmount: this.toMoney(rule.thresholdAmount),
      freightAmount: this.toMoney(rule.freightAmount),
      ruleText: this.formatFreightRuleText(rule),
    }));
  }

  /** 将后台 SECKILL 活动同步到小程序秒杀场次/商品表 */
  private async syncSeckillActivityToFlashSale(activity: {
    id: bigint;
    activityName: string;
    activityType: string;
    status: string;
    startAt: Date | null;
    endAt: Date | null;
    productsJson: unknown;
    ruleJson: unknown;
  }) {
    if (String(activity.activityType).toUpperCase() !== 'SECKILL') {
      return null;
    }

    const ruleJson = this.parseActivityRuleJson(activity.ruleJson);
    const existingWindowId = Number(ruleJson.flashSaleWindowId ?? 0);
    const shouldPublish = activity.status === 'PUBLISHED' && !!activity.startAt && !!activity.endAt;

    if (!shouldPublish) {
      if (existingWindowId > 0) {
        const windowId = BigInt(existingWindowId);
        const items = await this.prisma.flashSaleItem.findMany({
          where: { windowId },
          select: { id: true },
        });
        const itemIds = items.map((item) => item.id);
        if (itemIds.length) {
          await this.prisma.flashSaleClaim.deleteMany({ where: { itemId: { in: itemIds } } });
          await this.prisma.flashSaleItem.deleteMany({ where: { windowId } });
        }
        await this.prisma.flashSaleWindow.deleteMany({ where: { id: windowId } });
        const nextRule = { ...ruleJson };
        delete nextRule.flashSaleWindowId;
        await this.prisma.activity.update({
          where: { id: activity.id },
          data: { ruleJson: nextRule as Prisma.InputJsonValue },
        });
      }
      return null;
    }

    const startAt = activity.startAt as Date;
    const endAt = activity.endAt as Date;
    const label = activity.activityName || '限时秒杀';
    let windowId: bigint | null = null;

    if (existingWindowId > 0) {
      const found = await this.prisma.flashSaleWindow.findUnique({
        where: { id: BigInt(existingWindowId) },
      });
      if (found) {
        await this.prisma.flashSaleWindow.update({
          where: { id: found.id },
          data: {
            label,
            startAt,
            endAt,
            status: this.computeFlashSaleStatus(startAt, endAt, new Date()),
          },
        });
        windowId = found.id;
      }
    }

    if (!windowId) {
      const created = await this.prisma.flashSaleWindow.create({
        data: {
          label,
          startAt,
          endAt,
          sortOrder: this.toNumber(activity.id),
          status: this.computeFlashSaleStatus(startAt, endAt, new Date()),
        },
      });
      windowId = created.id;
    }

    const products = Array.isArray(activity.productsJson)
      ? activity.productsJson.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      : [];
    const limitPerUser = Math.max(Number(ruleJson.limitPerUser ?? 1) || 1, 1);
    const keepSkuIds = new Set<bigint>();

    for (const productEntry of products) {
      const productId = Number(productEntry.productId ?? 0);
      if (!Number.isFinite(productId) || productId <= 0) {
        continue;
      }

      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(productId), deletedAt: null },
        include: { skus: { orderBy: { id: 'asc' }, take: 1 } },
      });
      const sku = product?.skus?.[0];
      if (!product || !sku) {
        continue;
      }

      const { flashPrice, originPrice } = this.resolveFlashSalePrices({
        activityPrice: productEntry.activityPrice,
        originalPrice: productEntry.originalPrice,
        skuPrice: sku.price,
        skuOriginalPrice: sku.originalPrice,
      });
      const stock = Math.max(0, Math.floor(Number(productEntry.stock ?? sku.stock ?? 0) || 0));
      keepSkuIds.add(sku.id);

      await this.prisma.flashSaleItem.upsert({
        where: {
          windowId_skuId: {
            windowId,
            skuId: sku.id,
          },
        },
        create: {
          windowId,
          productId: product.id,
          skuId: sku.id,
          flashPrice: new Prisma.Decimal(flashPrice.toFixed(2)),
          originPrice: new Prisma.Decimal(originPrice.toFixed(2)),
          totalStock: stock,
          stockLeft: stock,
          perUserLimit: limitPerUser,
        },
        update: {
          productId: product.id,
          flashPrice: new Prisma.Decimal(flashPrice.toFixed(2)),
          originPrice: new Prisma.Decimal(originPrice.toFixed(2)),
          totalStock: stock,
          stockLeft: stock,
          perUserLimit: limitPerUser,
        },
      });
    }

    const staleItems = await this.prisma.flashSaleItem.findMany({
      where: {
        windowId,
        ...(keepSkuIds.size ? { skuId: { notIn: [...keepSkuIds] } } : {}),
      },
      select: { id: true },
    });
    if (!keepSkuIds.size) {
      const allItems = await this.prisma.flashSaleItem.findMany({
        where: { windowId },
        select: { id: true },
      });
      const staleIds = allItems.map((item) => item.id);
      if (staleIds.length) {
        await this.prisma.flashSaleClaim.deleteMany({ where: { itemId: { in: staleIds } } });
        await this.prisma.flashSaleItem.deleteMany({ where: { windowId } });
      }
    } else if (staleItems.length) {
      const staleIds = staleItems.map((item) => item.id);
      await this.prisma.flashSaleClaim.deleteMany({ where: { itemId: { in: staleIds } } });
      await this.prisma.flashSaleItem.deleteMany({ where: { id: { in: staleIds } } });
    }

    const nextRule = {
      ...ruleJson,
      flashSaleWindowId: this.toNumber(windowId),
    };
    await this.prisma.activity.update({
      where: { id: activity.id },
      data: { ruleJson: nextRule as Prisma.InputJsonValue },
    });

    return this.toNumber(windowId);
  }

  /** 将后台 GROUP_BUY 活动同步到商品 groupBuyConfig，供小程序拼团专区读取 */
  private async syncGroupBuyActivityToProducts(activity: {
    id: bigint;
    activityType: string;
    status: string;
    startAt: Date | null;
    endAt: Date | null;
    productsJson: unknown;
    ruleJson: unknown;
  }) {
    if (String(activity.activityType).toUpperCase() !== 'GROUP_BUY') {
      return;
    }

    const now = new Date();
    const ruleJson = this.parseActivityRuleJson(activity.ruleJson);
    const previousSyncedIds = (Array.isArray(ruleJson.syncedProductIds) ? ruleJson.syncedProductIds : [])
      .map((item) => Number(item))
      .filter((id) => Number.isFinite(id) && id > 0);
    const products = Array.isArray(activity.productsJson)
      ? activity.productsJson.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      : [];
    const productIdsFromActivity = products
      .map((item) => Number(item.productId ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0);

    const shouldEnable =
      activity.status === 'PUBLISHED' &&
      !!activity.startAt &&
      !!activity.endAt &&
      activity.startAt.getTime() <= now.getTime() &&
      activity.endAt.getTime() >= now.getTime();

    const needed = Math.max(Number(ruleJson.needed ?? 3) || 3, 2);
    const expireHours = Math.max(Number(ruleJson.expireHours ?? 24) || 24, 1);
    const activityId = this.toNumber(activity.id);
    const syncedProductIds: number[] = [];

    if (shouldEnable) {
      for (const productEntry of products) {
        const productId = Number(productEntry.productId ?? 0);
        if (!Number.isFinite(productId) || productId <= 0) {
          continue;
        }

        const product = await this.prisma.product.findFirst({
          where: { id: BigInt(productId), deletedAt: null },
          include: { skus: { orderBy: { id: 'asc' }, take: 1 } },
        });
        if (!product) {
          continue;
        }

        const sku = product.skus?.[0];
        const activityPrice = Number(productEntry.activityPrice ?? 0);
        const originalPrice = Number(productEntry.originalPrice ?? sku?.price ?? 0);
        let discountRate = Number(ruleJson.discountRate ?? 0.7) || 0.7;
        if (originalPrice > 0 && activityPrice > 0) {
          discountRate = activityPrice / originalPrice;
        }
        discountRate = Math.min(Math.max(discountRate, 0.1), 0.95);

        await this.prisma.product.update({
          where: { id: product.id },
          data: {
            groupBuyConfig: {
              enabled: true,
              needed,
              expireHours,
              discountRate: Number(discountRate.toFixed(4)),
              sourceActivityId: activityId,
            } as Prisma.InputJsonValue,
          },
        });
        syncedProductIds.push(productId);
      }
    }

    const idsToDisable = shouldEnable
      ? previousSyncedIds.filter((id) => !syncedProductIds.includes(id))
      : [...new Set([...previousSyncedIds, ...productIdsFromActivity])];

    for (const productId of idsToDisable) {
      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(productId), deletedAt: null },
      });
      if (!product) {
        continue;
      }
      const existing = this.asJsonObject(product.groupBuyConfig);
      if (!existing) {
        continue;
      }
      const sourceId = Number(existing.sourceActivityId ?? 0);
      if (sourceId !== activityId && !previousSyncedIds.includes(productId)) {
        continue;
      }
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          groupBuyConfig: {
            ...existing,
            enabled: false,
            sourceActivityId: activityId,
          } as Prisma.InputJsonValue,
        },
      });
    }

    await this.prisma.activity.update({
      where: { id: activity.id },
      data: {
        ruleJson: {
          ...ruleJson,
          syncedProductIds: shouldEnable ? syncedProductIds : [],
        } as Prisma.InputJsonValue,
      },
    });
  }

  private async ensurePublishedGroupBuyActivitiesSynced() {
    const activities = await this.prisma.activity.findMany({
      where: {
        activityType: 'GROUP_BUY',
        deletedAt: null,
        status: { in: ['PUBLISHED', 'PAUSED', 'ENDED'] },
      },
      orderBy: { id: 'asc' },
    });
    for (const activity of activities) {
      await this.syncGroupBuyActivityToProducts(activity);
    }
  }

  private async ensurePublishedSeckillFlashSalesSynced() {
    const now = new Date();
    const activities = await this.prisma.activity.findMany({
      where: {
        activityType: 'SECKILL',
        status: 'PUBLISHED',
        deletedAt: null,
        endAt: { gt: now },
        startAt: { not: null },
      },
      orderBy: { startAt: 'asc' },
    });

    const syncedWindowIds: number[] = [];
    for (const activity of activities) {
      const ruleJson = this.parseActivityRuleJson(activity.ruleJson);
      const existingWindowId = Number(ruleJson.flashSaleWindowId ?? 0);

      if (existingWindowId > 0) {
        const found = await this.prisma.flashSaleWindow.findUnique({
          where: { id: BigInt(existingWindowId) },
        });
        if (found) {
          if (
            activity.startAt &&
            activity.endAt &&
            (found.startAt.getTime() !== activity.startAt.getTime() ||
              found.endAt.getTime() !== activity.endAt.getTime() ||
              found.label !== activity.activityName)
          ) {
            await this.prisma.flashSaleWindow.update({
              where: { id: found.id },
              data: {
                label: activity.activityName,
                startAt: activity.startAt,
                endAt: activity.endAt,
                status: this.computeFlashSaleStatus(activity.startAt, activity.endAt, now),
              },
            });
          }
          syncedWindowIds.push(existingWindowId);
          continue;
        }
      }

      const windowId = await this.syncSeckillActivityToFlashSale(activity);
      if (windowId) {
        syncedWindowIds.push(windowId);
      }
    }
    return syncedWindowIds;
  }

  async getQuickFlashSaleWindows() {
    await this.withSeed();
    const now = new Date();
    await this.ensurePublishedSeckillFlashSalesSynced();
    const freightRules = await this.listActiveFreightSubsidyRules();

    return {
      windows: this.buildFlashSaleDayTabs(now),
      freightRules,
      generatedAt: now.toISOString(),
    };
  }

  async getQuickFlashSaleItems(query: Record<string, string>) {
    await this.withSeed();
    const syncedWindowIds = await this.ensurePublishedSeckillFlashSalesSynced();

    const windowId = Number(query.windowId ?? 0);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;
    const now = new Date();

    // windowId 约定为 YYYYMMDD（按日 Tab）；兼容旧的真实场次 id
    const dayBounds = this.getChinaDayBounds(windowId);
    const dayTabs = this.buildFlashSaleDayTabs(now);
    const activeDay =
      dayBounds != null
        ? dayTabs.find((tab) => tab.id === windowId) || {
            id: windowId,
            label: `${String(windowId).slice(4, 6).replace(/^0/, '')}月${String(windowId).slice(6, 8).replace(/^0/, '')}日`,
            startAt: dayBounds.start.toISOString(),
            endAt: dayBounds.end.toISOString(),
            status: this.computeFlashSaleStatus(dayBounds.start, dayBounds.end, now),
          }
        : dayTabs[0] || null;

    if (!activeDay || syncedWindowIds.length === 0) {
      return {
        windowId: activeDay?.id ?? null,
        window: activeDay ?? undefined,
        page,
        pageSize,
        total: 0,
        items: [],
        generatedAt: now.toISOString(),
      };
    }

    const bounds = this.getChinaDayBounds(activeDay.id);
    if (!bounds) {
      return {
        windowId: activeDay.id,
        window: activeDay,
        page,
        pageSize,
        total: 0,
        items: [],
        generatedAt: now.toISOString(),
      };
    }

    const overlappingWindows = await this.prisma.flashSaleWindow.findMany({
      where: {
        id: { in: syncedWindowIds.map((id) => BigInt(id)) },
        startAt: { lte: bounds.end },
        endAt: { gte: bounds.start },
      },
      orderBy: { startAt: 'asc' },
      select: { id: true },
    });

    const overlappingIds = overlappingWindows.map((item) => item.id);
    if (!overlappingIds.length) {
      return {
        windowId: activeDay.id,
        window: activeDay,
        page,
        pageSize,
        total: 0,
        items: [],
        generatedAt: now.toISOString(),
      };
    }

    const allItems = await this.prisma.flashSaleItem.findMany({
      where: { windowId: { in: overlappingIds } },
      include: {
        product: { include: { skus: { orderBy: { id: 'asc' } } } },
        sku: true,
        window: true,
      },
      orderBy: [{ flashPrice: 'asc' }, { id: 'asc' }],
    });

    // 同日多活动可能挂同一商品：按 productId 去重，保留更低秒杀价
    const deduped: typeof allItems = [];
    const seenProductIds = new Set<string>();
    for (const entry of allItems) {
      const key = String(entry.productId);
      if (seenProductIds.has(key)) {
        continue;
      }
      seenProductIds.add(key);
      deduped.push(entry);
    }

    const total = deduped.length;
    const pageItems = deduped.slice(skip, skip + pageSize);

    return {
      windowId: activeDay.id,
      window: activeDay,
      page,
      pageSize,
      total,
      items: pageItems.map((entry) => {
        const { flashPrice, originPrice } = this.resolveFlashSalePrices({
          activityPrice: entry.flashPrice,
          originalPrice: entry.originPrice,
          skuPrice: entry.sku?.price,
          skuOriginalPrice: entry.sku?.originalPrice,
        });
        return {
          itemId: this.toNumber(entry.id),
          productId: this.toNumber(entry.productId),
          skuId: this.toNumber(entry.skuId),
          title: entry.product.title,
          subtitle: entry.product.subtitle ?? '',
          coverUrl: this.resolvePublicUrl(entry.product.coverUrl) ?? '',
          flashPrice: flashPrice.toFixed(2),
          originPrice: originPrice.toFixed(2),
          stockLeft: entry.stockLeft,
          totalStock: entry.totalStock,
          perUserLimit: entry.perUserLimit,
          originPlace: this.normalizeOriginPlace(entry.product.originPlace) || undefined,
          activityStartAt: entry.window.startAt.toISOString(),
          activityEndAt: entry.window.endAt.toISOString(),
        };
      }),
      generatedAt: now.toISOString(),
    };
  }

  async claimFlashSale(authUser: AuthUser, body: { itemId: number; quantity?: number }) {
    const user = await this.ensureUser(authUser);
    const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1) || 1));
    const itemId = BigInt(body.itemId);

    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: itemId },
      include: { window: true, sku: true },
    });
    if (!item) {
      throw new BadRequestException('秒杀商品不存在');
    }
    if (this.computeFlashSaleStatus(item.window.startAt, item.window.endAt, new Date()) !== 'ONGOING') {
      throw new BadRequestException('当前不在秒杀时段');
    }
    if (item.stockLeft < quantity) {
      throw new BadRequestException('库存不足');
    }

    const existingClaim = await this.prisma.flashSaleClaim.aggregate({
      where: { itemId, userId: user.id },
      _sum: { quantity: true },
    });
    const claimedSoFar = Number(existingClaim._sum.quantity ?? 0);
    if (claimedSoFar + quantity > item.perUserLimit) {
      throw new BadRequestException(`每人限购 ${item.perUserLimit} 件`);
    }

    const updated = await this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: { stockLeft: { decrement: quantity } },
    });

    await this.prisma.flashSaleClaim.create({
      data: { itemId, userId: user.id, quantity, status: 'RESERVED' },
    });

    return {
      itemId: this.toNumber(item.id),
      skuId: this.toNumber(item.skuId),
      quantity,
      stockLeft: updated.stockLeft,
      flashPrice: Number(item.flashPrice).toFixed(2),
      status: 'RESERVED',
    };
  }

  async getQuickGroupBuyNearby(body: { lat?: number; lng?: number; limit?: number; maxDistanceKm?: number; inviteCode?: string }) {
    await this.withSeed();

    const limit = Math.min(Math.max(Number(body.limit ?? 8), 1), 20);
    const inviteCode = body.inviteCode ? String(body.inviteCode).trim().toUpperCase() : '';

    // 通过邀请码精确查找拼团
    if (inviteCode) {
      const group = await this.prisma.groupBuy.findUnique({
        where: { inviteCode },
        include: {
          product: { include: { skus: { orderBy: { id: 'asc' } } } },
          sku: true,
          members: { select: { id: true } },
        },
      });
      if (group && group.status === 'OPEN' && group.expireAt > new Date() && this.isGroupBuyEnabled(group.product.groupBuyConfig)) {
        const activeGroupIds = await this.getGroupBuyIdsWithActivePaidMembers([group.id]);
        if (!activeGroupIds.has(group.id.toString())) {
          return { groups: [], generatedAt: new Date().toISOString() };
        }
        return {
          groups: [{
            groupId: this.toNumber(group.id),
            groupNo: group.groupNo,
            inviteCode: group.inviteCode,
            productId: this.toNumber(group.productId),
            skuId: this.toNumber(group.skuId),
            title: group.product.title,
            coverUrl: this.resolvePublicUrl(group.product.coverUrl) ?? '',
            roughArea: group.roughArea ?? '',
            memberCount: group.members.length,
            needed: group.needed,
            expireAt: group.expireAt.toISOString(),
            groupPrice: Number(group.groupPrice).toFixed(2),
            originPrice: Number(group.originPrice).toFixed(2),
          }],
          generatedAt: new Date().toISOString(),
        };
      }
      return { groups: [], generatedAt: new Date().toISOString() };
    }

    // 直接返回所有进行中的拼团（不再限制于附近/定位）
    const dbGroups = await this.prisma.groupBuy.findMany({
      where: {
        status: 'OPEN',
        expireAt: { gt: new Date() },
        members: { some: {} },
      },
      include: {
        product: { include: { skus: { orderBy: { id: 'asc' } } } },
        sku: true,
        members: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const enabledDbGroups = dbGroups.filter((group) => this.isGroupBuyEnabled(group.product.groupBuyConfig));
    const activeGroupIds = await this.getGroupBuyIdsWithActivePaidMembers(enabledDbGroups.map((g) => g.id));
    const joinableDbGroups = enabledDbGroups.filter((g) => activeGroupIds.has(g.id.toString()));

    return {
      groups: joinableDbGroups.map((g) => ({
        groupId: this.toNumber(g.id),
        groupNo: g.groupNo,
        inviteCode: g.inviteCode,
        productId: this.toNumber(g.productId),
        skuId: this.toNumber(g.skuId),
        title: g.product.title,
        coverUrl: this.resolvePublicUrl(g.product.coverUrl) ?? '',
        roughArea: g.roughArea ?? '',
        memberCount: g.members.length,
        needed: g.needed,
        expireAt: g.expireAt.toISOString(),
        groupPrice: Number(g.groupPrice).toFixed(2),
        originPrice: Number(g.originPrice).toFixed(2),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async getQuickGroupBuyProducts(query: Record<string, string>) {
    await this.withSeed();
    await this.ensurePublishedGroupBuyActivitiesSynced();

    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;
    const keyword = String(query.keyword ?? '').trim();

    const baseWhere = {
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { subtitle: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const dbProducts = await this.prisma.product.findMany({
      where: baseWhere,
      include: {
        skus: { orderBy: { id: 'asc' }, take: 1 },
        merchant: { select: { id: true, storeName: true, storeLogo: true } },
      },
      orderBy: [{ isHot: 'desc' }, { id: 'desc' }],
    });

    const enabledProducts = dbProducts.filter((product) => {
      const config = this.normalizeGroupBuyConfig(product.groupBuyConfig);
      return config?.enabled === true;
    });
    const pagedProducts = enabledProducts.slice(skip, skip + pageSize);

    return {
      page,
      pageSize,
      total: enabledProducts.length,
      items: pagedProducts.map((product) => {
        const config = this.normalizeGroupBuyConfig(product.groupBuyConfig)!;
        const sku = product.skus[0];
        const originPrice = Number(sku?.price ?? 0);
        const groupPrice = (originPrice * config.discountRate).toFixed(2);
        return {
          productId: this.toNumber(product.id),
          skuId: sku ? this.toNumber(sku.id) : null,
          title: product.title,
          subtitle: product.subtitle ?? '',
          coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
          originPrice: originPrice.toFixed(2),
          groupPrice,
          needed: config.needed,
          expireHours: config.expireHours,
          originPlace: this.normalizeOriginPlace(product.originPlace) || undefined,
          merchant: product.merchant
            ? {
                merchantId: this.toNumber(product.merchant.id),
                storeName: product.merchant.storeName,
                storeLogo: this.resolvePublicUrl(product.merchant.storeLogo) ?? '',
              }
            : null,
        };
      }),
    };
  }

  /**
   * 开团/参团预校验。本方法【不会】创建 GroupBuyMember（不占名额）。
   * 开新团时也【不会】落库 GroupBuy，避免「只点去拼团、未付款」就出现在我的拼团/附近拼团。
   * 团记录在提交拼团订单时创建，成员名额在支付成功后写入。
   */
  async joinGroupBuy(authUser: AuthUser, body: { productId: number; skuId?: number; groupId?: number; lat?: number; lng?: number }) {
    const user = await this.ensureUser(authUser);
    const productId = BigInt(body.productId);
    const skuId = body.skuId ? BigInt(body.skuId) : null;

    const result = await this.prisma.$transaction(async (tx) => {
      let group: Prisma.GroupBuyGetPayload<{ include: { members: true; product: true; sku: true } }> | null = null;
      let isNewGroup = false;
      let alreadyJoined = false;
      let alreadyJoinedOrderNo: string | null = null;

      if (body.groupId) {
        group = await tx.groupBuy.findUnique({
          where: { id: BigInt(body.groupId) },
          include: { members: true, product: true, sku: true },
        });
        if (!group) {
          throw new BadRequestException('拼团不存在');
        }
        if (group.productId !== productId) {
          throw new BadRequestException('拼团商品不匹配');
        }
        if (group.status !== 'OPEN' || group.expireAt < new Date()) {
          throw new BadRequestException('该团已结束或过期');
        }
        const existingMember = group.members.find((m) => m.userId === user.id);
        if (existingMember) {
          // 已经付款成为该团成员：不再报错打断，而是把该成员对应的订单号带回去，
          // 交给前端跳转到订单详情页查看拼团进度，而不是弹一个无操作意义的错误提示。
          alreadyJoined = true;
          alreadyJoinedOrderNo = existingMember.orderNo ?? null;
          if (!alreadyJoinedOrderNo) {
            const paidOrder = await tx.order.findFirst({
              where: {
                groupBuyId: group.id,
                userId: user.id,
                payStatus: PlatformDataService.PAY_STATUS.PAID,
              },
              select: { orderNo: true },
              orderBy: { createdAt: 'desc' },
            });
            alreadyJoinedOrderNo = paidOrder?.orderNo ?? null;
          }
        } else if (group.members.length >= group.needed) {
          throw new BadRequestException('该团已满员');
        }
      } else {
        // 开新团：此处【不】落库 GroupBuy。只校验商品可拼并返回结算所需信息。
        // 真正创建团记录放到用户提交拼团订单时（createOrder），支付成功后才占名额。
        // 避免「只点了去拼团、未付款」就出现在「我的拼团 / 附近拼团」。
        if (!skuId) {
          throw new BadRequestException('缺少 SKU');
        }
        const sku = await tx.productSku.findUnique({ where: { id: skuId } });
        if (!sku) {
          throw new BadRequestException('SKU 不存在');
        }
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw new BadRequestException('商品不存在');
        }
        const groupConfig = this.normalizeGroupBuyConfig(product.groupBuyConfig);
        if (!groupConfig?.enabled) {
          throw new BadRequestException('该商品暂未开启拼团');
        }
        const originPrice = Number(sku.price);
        const groupPrice = Number((originPrice * Number(groupConfig.discountRate)).toFixed(2));
        return {
          group: null,
          isNewGroup: true,
          pendingOrderNo: null,
          alreadyJoined: false,
          alreadyJoinedOrderNo: null,
          preview: {
            productId: this.toNumber(product.id),
            skuId: this.toNumber(sku.id),
            title: product.title,
            coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
            needed: Number(groupConfig.needed),
            groupPrice: groupPrice.toFixed(2),
            originPrice: originPrice.toFixed(2),
            expireHours: Number(groupConfig.expireHours),
          },
        };
      }

      // 若该用户此前已为该团创建过未支付订单，直接把订单号带回去，方便前端续付，避免重复下单锁重复库存
      const pendingOrder = alreadyJoined
        ? null
        : await tx.order.findFirst({
            where: { groupBuyId: group!.id, userId: user.id, orderStatus: PlatformDataService.ORDER_STATUS.PENDING, payStatus: PlatformDataService.PAY_STATUS.UNPAID },
            select: { orderNo: true },
            orderBy: { createdAt: 'desc' },
          });

      return {
        group,
        isNewGroup,
        pendingOrderNo: pendingOrder?.orderNo ?? null,
        alreadyJoined,
        alreadyJoinedOrderNo,
        preview: null as null | {
          productId: number;
          skuId: number;
          title: string;
          coverUrl: string;
          needed: number;
          groupPrice: string;
          originPrice: string;
          expireHours: number;
        },
      };
    });

    if (result.isNewGroup && result.preview && !result.group) {
      return {
        groupId: 0,
        groupNo: '',
        inviteCode: null,
        productId: result.preview.productId,
        skuId: result.preview.skuId,
        title: result.preview.title,
        coverUrl: result.preview.coverUrl,
        roughArea: '',
        memberCount: 0,
        needed: result.preview.needed,
        groupPrice: result.preview.groupPrice,
        originPrice: result.preview.originPrice,
        expireAt: '',
        expireHours: result.preview.expireHours,
        status: 'OPEN' as const,
        isNewGroup: true,
        pendingOrderNo: null,
        alreadyJoined: false,
        orderNo: null,
      };
    }

    const g = result.group!;
    return {
      groupId: this.toNumber(g.id),
      groupNo: g.groupNo,
      inviteCode: g.inviteCode,
      productId: this.toNumber(g.productId),
      skuId: this.toNumber(g.skuId),
      title: g.product.title,
      coverUrl: this.resolvePublicUrl(g.product.coverUrl) ?? '',
      roughArea: g.roughArea ?? '',
      memberCount: g.members.length,
      needed: g.needed,
      groupPrice: Number(g.groupPrice).toFixed(2),
      originPrice: Number(g.originPrice).toFixed(2),
      expireAt: g.expireAt.toISOString(),
      status: this.resolveGroupBuyStatus(g.status, g.expireAt),
      isNewGroup: result.isNewGroup,
      pendingOrderNo: result.pendingOrderNo,
      alreadyJoined: result.alreadyJoined,
      orderNo: result.alreadyJoinedOrderNo,
    };
  }

  /** 未成团(非 COMPLETED)的拼团订单禁止接单/发货 */
  private async assertGroupBuyFulfillable(groupBuyId: bigint | null | undefined) {
    if (groupBuyId == null) {
      return;
    }
    const group = await this.prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      select: { status: true },
    });
    if (!group || group.status !== 'COMPLETED') {
      throw new BadRequestException('拼团尚未成团，暂不能接单/发货');
    }
  }

  /** 拼团详情：供分享参团链接、邀请码落地页使用。groupId 优先，其次 inviteCode。 */
  async getQuickGroupBuyDetail(query: { groupId?: number; inviteCode?: string }) {
    await this.withSeed();

    let where: Prisma.GroupBuyWhereInput | null = null;
    if (query.groupId != null && query.groupId > 0) {
      where = { id: BigInt(query.groupId) };
    } else if (query.inviteCode) {
      where = { inviteCode: String(query.inviteCode).trim().toUpperCase() };
    }
    if (!where) {
      throw new BadRequestException('缺少拼团标识');
    }

    const group = await this.prisma.groupBuy.findFirst({
      where,
      include: {
        product: { include: { skus: { orderBy: { id: 'asc' } } } },
        sku: true,
        members: { select: { id: true, userId: true, isInitiator: true, joinedAt: true } },
      },
    });
    if (!group) {
      throw new NotFoundException('拼团不存在或已失效');
    }

    return {
      groupId: this.toNumber(group.id),
      groupNo: group.groupNo,
      inviteCode: group.inviteCode,
      productId: this.toNumber(group.productId),
      skuId: this.toNumber(group.skuId),
      title: group.product.title,
      coverUrl: this.resolvePublicUrl(group.product.coverUrl) ?? '',
      roughArea: group.roughArea ?? '',
      memberCount: group.members.length,
      needed: group.needed,
      expireAt: group.expireAt.toISOString(),
      completedAt: group.completedAt ? group.completedAt.toISOString() : null,
      groupPrice: Number(group.groupPrice).toFixed(2),
      originPrice: Number(group.originPrice).toFixed(2),
      status: this.resolveGroupBuyStatus(group.status, group.expireAt),
    };
  }

  /** 我的拼团：仅展示已支付入团的记录（未付款不占名额、不出现在列表） */
  async getMyGroupBuys(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);

    const groups = await this.prisma.groupBuy.findMany({
      where: {
        members: { some: { userId: user.id } },
      },
      include: {
        product: { select: { title: true, coverUrl: true } },
        members: {
          select: {
            id: true,
            userId: true,
            orderNo: true,
            user: { select: { nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const groupIds = groups.map((g) => g.id);
    const pendingOrders = groupIds.length
      ? await this.prisma.order.findMany({
          where: {
            userId: user.id,
            groupBuyId: { in: groupIds },
            orderStatus: PlatformDataService.ORDER_STATUS.PENDING,
            payStatus: PlatformDataService.PAY_STATUS.UNPAID,
          },
          select: { groupBuyId: true, orderNo: true },
        })
      : [];
    const pendingByGroup = new Map(pendingOrders.map((o) => [o.groupBuyId!.toString(), o.orderNo]));

    const openGroupIds = groups
      .filter((g) => g.status === 'OPEN' && this.resolveGroupBuyStatus(g.status, g.expireAt) === 'OPEN')
      .map((g) => g.id);
    const paidOrdersForOpen =
      openGroupIds.length > 0
        ? await this.prisma.order.findMany({
            where: {
              groupBuyId: { in: openGroupIds },
              payStatus: PlatformDataService.PAY_STATUS.PAID,
            },
            select: { groupBuyId: true, refundStatus: true, orderStatus: true },
          })
        : [];
    const paidOrdersByGroupId = new Map<string, typeof paidOrdersForOpen>();
    for (const order of paidOrdersForOpen) {
      const key = order.groupBuyId!.toString();
      const list = paidOrdersByGroupId.get(key) ?? [];
      list.push(order);
      paidOrdersByGroupId.set(key, list);
    }

    const groupIdsToHeal: bigint[] = [];
    const displayStatusByGroupId = new Map<string, 'OPEN' | 'COMPLETED' | 'FAILED'>();
    for (const g of groups) {
      let status = this.resolveGroupBuyStatus(g.status, g.expireAt);
      if (g.status === 'OPEN' && status === 'OPEN') {
        const paidOrders = paidOrdersByGroupId.get(g.id.toString()) ?? [];
        if (this.shouldFailOpenGroupBuyDueToRefunds(paidOrders)) {
          status = 'FAILED';
          groupIdsToHeal.push(g.id);
        }
      }
      displayStatusByGroupId.set(g.id.toString(), status);
    }
    if (groupIdsToHeal.length > 0) {
      await this.prisma.groupBuy
        .updateMany({
          where: { id: { in: groupIdsToHeal }, status: 'OPEN' },
          data: { status: 'FAILED' },
        })
        .catch(() => undefined);
    }

    return {
      items: groups.map((g) => {
        const myMember = g.members.find((m) => this.toNumber(m.userId) === this.toNumber(user.id));
        const isPaidMember = Boolean(myMember);
        return {
          groupId: this.toNumber(g.id),
          groupNo: g.groupNo,
          inviteCode: g.inviteCode,
          productId: this.toNumber(g.productId),
          skuId: this.toNumber(g.skuId),
          title: g.product.title,
          coverUrl: this.resolvePublicUrl(g.product.coverUrl) ?? '',
          status: displayStatusByGroupId.get(g.id.toString()) ?? this.resolveGroupBuyStatus(g.status, g.expireAt),
          needed: g.needed,
          memberCount: g.members.length,
          isInitiator: this.toNumber(g.initiatorId) === this.toNumber(user.id),
          isPaidMember,
          needsPayment: !isPaidMember,
          orderNo: myMember?.orderNo ?? null,
          pendingOrderNo: pendingByGroup.get(g.id.toString()) ?? null,
          groupPrice: Number(g.groupPrice).toFixed(2),
          originPrice: Number(g.originPrice).toFixed(2),
          expireAt: g.expireAt.toISOString(),
          completedAt: g.completedAt ? g.completedAt.toISOString() : null,
          members: g.members.map((m) => ({
            userId: this.toNumber(m.userId),
            isInitiator: this.toNumber(m.userId) === this.toNumber(g.initiatorId),
            isMine: this.toNumber(m.userId) === this.toNumber(user.id),
            nickname: m.user.nickname ?? '',
            avatarUrl: this.resolvePublicUrl(m.user.avatarUrl) ?? '',
          })),
        };
      }),
    };
  }

  private async generateUniqueInviteCode(tx: Prisma.TransactionClient): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await tx.groupBuy.findUnique({ where: { inviteCode: code }, select: { id: true } });
      if (!existing) {
        return code;
      }
    }
    return `${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }

  private roughAreaFromLatLng(lat: number, lng: number): string {
    const areaLabels = ['城东', '城西', '城南', '城北', '新城', '老城'];
    const idx = Math.abs(Math.round((lat * 13 + lng * 7) * 10)) % areaLabels.length;
    return `${areaLabels[idx]}附近`;
  }

  async getQuickGiftZoneItems(query: { page?: number; pageSize?: number; sortBy?: 'sales' | 'price' }) {
    await this.withSeed();

    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      OR: [
        { category: { name: { contains: '礼盒' } } },
        { category: { name: { contains: '特产' } } },
        { subtitle: { contains: '礼盒' } },
        { title: { contains: '礼盒' } },
      ],
    };

    const salesRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
    });
    const salesMap = new Map<string, number>();
    for (const row of salesRows) {
      salesMap.set(String(row.productId), Number(row._sum.quantity ?? 0));
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { skus: { orderBy: { id: 'asc' } }, category: true },
        orderBy: query.sortBy === 'price' ? { id: 'asc' } : { id: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const allCats = await this.prisma.category.findMany({ select: { id: true, parentId: true, name: true } });
    const catById = new Map<bigint, { id: bigint; parentId: bigint | null; name: string }>();
    for (const c of allCats) {
      catById.set(c.id, { id: c.id, parentId: c.parentId, name: c.name });
    }
    const rootCatCache = new Map<bigint, { id: number; name: string }>();

    const items = products.map((product, index) => {
      const sku = product.skus[0];
      const price = sku ? Number(this.computeDisplayPrice(sku)) : 0;
      const originPrice = price > 0 ? (price * 1.2).toFixed(2) : '';

      let rootCat: { id: number; name: string } = { id: 0, name: '' };
      if (product.category) {
        const cached = rootCatCache.get(product.categoryId);
        if (cached) {
          rootCat = cached;
        } else {
          let cur = catById.get(product.categoryId);
          const seen = new Set<bigint>();
          while (cur && cur.parentId != null && !seen.has(cur.id)) {
            seen.add(cur.id);
            const next = catById.get(cur.parentId);
            if (!next) break;
            cur = next;
          }
          rootCat = cur ? { id: Number(cur.id), name: cur.name } : { id: 0, name: '' };
          rootCatCache.set(product.categoryId, rootCat);
        }
      }

      return {
        productId: this.toNumber(product.id),
        skuId: sku ? this.toNumber(sku.id) : undefined,
        title: product.title,
        subtitle: product.subtitle ?? '',
        coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
        minPrice: price.toFixed(2),
        originPrice,
        saleCount: salesMap.get(product.id.toString()) ?? 0,
        originPlace: this.normalizeOriginPlace(product.originPlace) || undefined,
        badge: index < 2 ? '礼赠' : '团购',
        categoryId: rootCat.id,
        categoryName: rootCat.name,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      generatedAt: new Date().toISOString(),
    };
  }

  private collectCategoryDescendants(rootId: number, all: { id: number; parentId: number | null }[]): number[] {
    const out: number[] = [rootId];
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const c of all) {
        if (c.parentId === cur) {
          out.push(c.id);
          stack.push(c.id);
        }
      }
    }
    return out;
  }

  async getQuickOriginZoneItems(query: { page?: number; pageSize?: number; originPlace?: string; categoryId?: number }) {
    await this.withSeed();

    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;

    // 预加载全量类目树（避免 N+1，可复用）
    const allCats = await this.prisma.category.findMany({ select: { id: true, parentId: true, name: true } });
    const catById = new Map<bigint, { id: bigint; parentId: bigint | null; name: string }>();
    for (const c of allCats) {
      catById.set(c.id, { id: c.id, parentId: c.parentId, name: c.name });
    }

    let categoryIds: number[] | undefined;
    if (query.categoryId != null) {
      const flat = allCats.map((c) => ({ id: Number(c.id), parentId: c.parentId != null ? Number(c.parentId) : null }));
      categoryIds = this.collectCategoryDescendants(Number(query.categoryId), flat);
    }

    const where: Prisma.ProductWhereInput = {
      status: 1,
      auditStatus: 2,
      deletedAt: null,
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(query.originPlace ? { originPlace: { contains: query.originPlace } } : {}),
    };

    const salesRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
    });
    const salesMap = new Map<string, number>();
    for (const row of salesRows) {
      salesMap.set(String(row.productId), Number(row._sum.quantity ?? 0));
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { skus: { orderBy: { id: 'asc' } }, category: true },
        orderBy: [{ isHot: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const rootCatCache = new Map<bigint, { id: number; name: string }>();

    const items = products.map((product, index) => {
      const sku = product.skus[0];
      const price = sku ? Number(this.computeDisplayPrice(sku)) : 0;
      const originPrice = price > 0 ? (price * 1.15).toFixed(2) : '';

      let rootCat: { id: number; name: string } = { id: 0, name: '' };
      if (product.category) {
        const cached = rootCatCache.get(product.categoryId);
        if (cached) {
          rootCat = cached;
        } else {
          let cur = catById.get(product.categoryId);
          const seen = new Set<bigint>();
          while (cur && cur.parentId != null && !seen.has(cur.id)) {
            seen.add(cur.id);
            const next = catById.get(cur.parentId);
            if (!next) break;
            cur = next;
          }
          rootCat = cur ? { id: Number(cur.id), name: cur.name } : { id: 0, name: '' };
          rootCatCache.set(product.categoryId, rootCat);
        }
      }

      return {
        productId: this.toNumber(product.id),
        skuId: sku ? this.toNumber(sku.id) : undefined,
        title: product.title,
        subtitle: product.subtitle ?? (this.normalizeOriginPlace(product.originPlace) ? `${this.normalizeOriginPlace(product.originPlace)} 直发` : '原产地新鲜直送'),
        coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
        minPrice: price.toFixed(2),
        originPrice,
        saleCount: salesMap.get(product.id.toString()) ?? 0,
        originPlace: this.normalizeOriginPlace(product.originPlace) || undefined,
        badge: index < 2 ? '直供' : '源头',
        categoryId: rootCat.id,
        categoryName: rootCat.name,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      generatedAt: new Date().toISOString(),
    };
  }

  async getOriginSales(authUser?: AuthUser) {
    await this.withSeed();
    const merchantScope = await this.resolveAdminMerchantScope(authUser);
    const merchantFilter =
      merchantScope != null ? { merchantId: BigInt(merchantScope) } : {};

    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, ...merchantFilter },
      include: { skus: true },
    });
    const productIds = products.map((item) => item.id);

    const orderItems = await this.prisma.orderItem.findMany({
      where:
        merchantScope != null
          ? {
              productId: { in: productIds.length ? productIds : [BigInt(-1)] },
              order: { merchantId: BigInt(merchantScope), deletedAt: null },
            }
          : { order: { deletedAt: null } },
      select: {
        productId: true,
        lineAmount: true,
      },
    });

    const productById = new Map(products.map((entry) => [entry.id.toString(), entry]));
    const sales = new Map<string, { originPlace: string; salesAmount: number; orderCount: number }>();
    for (const item of orderItems) {
      const product = productById.get(item.productId.toString());
      const originPlace = this.normalizeOriginPlace(product?.originPlace) || '未知';
      const current = sales.get(originPlace) ?? {
        originPlace,
        salesAmount: 0,
        orderCount: 0,
      };

      current.orderCount += 1;
      current.salesAmount += Number(item.lineAmount);
      sales.set(originPlace, current);
    }

    return [...sales.values()].map((item) => ({
      originPlace: this.normalizeOriginPlace(item.originPlace),
      salesAmount: item.salesAmount.toFixed(2),
      orderCount: item.orderCount,
    }));
  }

  async getBanners() {
    await this.withSeed();

    const banners = await this.prisma.banner.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return banners.map((banner) => ({
      id: this.toNumber(banner.id),
      title: banner.title,
      imageUrl: this.resolvePublicUrl(banner.imageUrl) ?? '',
      linkType: banner.linkType,
      linkId: banner.linkId != null ? this.toNumber(banner.linkId) : null,
      startAt: this.toIso(banner.startAt),
      endAt: this.toIso(banner.endAt),
      sortOrder: banner.sortOrder,
      status: banner.status,
    }));
  }

  getActivities() {
    return this.withSeed().then(() =>
        this.prisma.activity
            .findMany({
              where: { deletedAt: null },
              orderBy: [{ id: 'desc' }],
            })
            .then((activities) =>
                activities.map((activity) => ({
                  id: this.toNumber(activity.id),
                  activityName: activity.activityName,
                  activityType: activity.activityType,
                  status: activity.status,
                  startAt: this.formatChinaDateTime(activity.startAt),
                  endAt: this.formatChinaDateTime(activity.endAt),
                  productCount: activity.productCount,
                })),
            ));
  }

  private normalizeActivityRule(ruleJson: Prisma.JsonValue | null | undefined) {
    return ruleJson && typeof ruleJson === 'object' && !Array.isArray(ruleJson)
      ? (ruleJson as Record<string, unknown>)
      : {};
  }

  private normalizeActivityProducts(productsJson: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(productsJson)) {
      return [] as Array<Record<string, unknown>>;
    }
    return productsJson
      .filter((item) => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      .map((item) => item as Record<string, unknown>);
  }

  async getPublicActivities(query: Record<string, string>) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();

    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      status: 'PUBLISHED',
      ...(keyword ? { activityName: { contains: keyword } } : {}),
    };

    const [total, activities] = await Promise.all([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({
        where,
        orderBy: [{ startAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: activities.map((activity) => {
        const products = this.normalizeActivityProducts(activity.productsJson);
        const ruleJson = this.normalizeActivityRule(activity.ruleJson);
        const firstProduct = products[0] ?? null;
        return {
          id: this.toNumber(activity.id),
          activityId: this.toNumber(activity.id),
          title: activity.activityName,
          activityName: activity.activityName,
          activityType: activity.activityType,
          status: activity.status,
          startAt: this.toIso(activity.startAt),
          endAt: this.toIso(activity.endAt),
          productCount: activity.productCount,
          coverUrl: typeof firstProduct?.coverUrl === 'string' ? firstProduct.coverUrl : '',
          ruleJson,
        };
      }),
    };
  }

  async getPublicActivityDetail(activityId: number) {
    await this.withSeed();
    const activity = await this.prisma.activity.findFirst({
      where: { id: BigInt(activityId), deletedAt: null, status: 'PUBLISHED' },
    });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const products = this.normalizeActivityProducts(activity.productsJson);
    const ruleJson = this.normalizeActivityRule(activity.ruleJson);

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
      products,
      ruleJson,
    };
  }

  async getPublicActivityProducts(activityId: number, query: Record<string, string>) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const activity = await this.prisma.activity.findFirst({
      where: { id: BigInt(activityId), deletedAt: null, status: 'PUBLISHED' },
    });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const products = this.normalizeActivityProducts(activity.productsJson);
    const items = products
      .slice((page - 1) * pageSize, page * pageSize)
      .map((product, index) => ({
        id: Number(product.productId ?? index + 1),
        productId: Number(product.productId ?? index + 1),
        title: String(product.title ?? '活动商品'),
        coverUrl: typeof product.coverUrl === 'string' ? product.coverUrl : '',
        originalPrice: String(product.originalPrice ?? '0.00'),
        activityPrice: String(product.activityPrice ?? '0.00'),
        stock: Number(product.stock ?? 0),
      }));

    return {
      page,
      pageSize,
      total: products.length,
      items,
    };
  }

  getLogisticsRules() {
    return this.withSeed().then(async () => {
      const [rules, publicRuleIdSetting] = await Promise.all([
        this.prisma.logisticsRule.findMany({
          orderBy: [{ active: 'desc' }, { id: 'asc' }],
        }),
        this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightRuleId' } }),
      ]);
      const publicRuleId = Number(publicRuleIdSetting?.value ?? 0);

      return rules.map((rule) => ({
        id: this.toNumber(rule.id),
        name: rule.name,
        province: rule.province,
        thresholdAmount: this.toMoney(rule.thresholdAmount),
        freightAmount: this.toMoney(rule.freightAmount),
        active: rule.active,
        isPublic: publicRuleId > 0 && this.toNumber(rule.id) === publicRuleId,
      }));
    });
  }

  async getPublicFreightPromo() {
    await this.withSeed();
    const [thresholdSetting, freightSetting, ruleIdSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightFreeThreshold' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightAmount' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightRuleId' } }),
    ]);

    const ruleId = Number(ruleIdSetting?.value ?? 0);
    if (ruleId > 0) {
      const rule = await this.prisma.logisticsRule.findUnique({ where: { id: BigInt(ruleId) } });
      if (rule && rule.active) {
        return {
          ruleId: this.toNumber(rule.id),
          thresholdAmount: this.toMoney(rule.thresholdAmount),
          freightAmount: this.toMoney(rule.freightAmount),
          name: rule.name,
        };
      }
    }

    if (thresholdSetting && Number(thresholdSetting.value) > 0) {
      return {
        ruleId: null,
        thresholdAmount: Number(thresholdSetting.value).toFixed(2),
        freightAmount: freightSetting ? Number(freightSetting.value || 0).toFixed(2) : '0.00',
        name: '公共满减规则',
      };
    }

    const national = await this.prisma.logisticsRule.findFirst({
      where: { active: true, province: '全国' },
      orderBy: { thresholdAmount: 'asc' },
    });
    if (national) {
      return {
        ruleId: this.toNumber(national.id),
        thresholdAmount: this.toMoney(national.thresholdAmount),
        freightAmount: this.toMoney(national.freightAmount),
        name: national.name,
      };
    }

    return {
      ruleId: null,
      thresholdAmount: '0.00',
      freightAmount: '0.00',
      name: '',
    };
  }

  private async syncPublicFreightSettings(rule: {
    id: bigint | number;
    thresholdAmount: Prisma.Decimal | number | string;
    freightAmount: Prisma.Decimal | number | string;
    name?: string;
  } | null) {
    if (!rule) {
      await Promise.all([
        this.prisma.systemSetting.deleteMany({ where: { key: 'publicFreightRuleId' } }),
        this.prisma.systemSetting.deleteMany({ where: { key: 'publicFreightFreeThreshold' } }),
        this.prisma.systemSetting.deleteMany({ where: { key: 'publicFreightAmount' } }),
      ]);
      return;
    }

    const ruleId = String(this.toNumber(rule.id as bigint));
    const threshold = this.toMoney(rule.thresholdAmount);
    const freight = this.toMoney(rule.freightAmount);

    await Promise.all([
      this.prisma.systemSetting.upsert({
        where: { key: 'publicFreightRuleId' },
        create: { key: 'publicFreightRuleId', value: ruleId },
        update: { value: ruleId },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'publicFreightFreeThreshold' },
        create: { key: 'publicFreightFreeThreshold', value: threshold },
        update: { value: threshold },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'publicFreightAmount' },
        create: { key: 'publicFreightAmount', value: freight },
        update: { value: freight },
      }),
    ]);
  }

  getSystemSettings() {
    return this.withSeed().then(() =>
        this.prisma.systemSetting
            .findMany({
              orderBy: { key: 'asc' },
            })
            .then(async (settings) => {
              const map = new Map(settings.map((item) => [item.key, item.value]));
              const [adminCount, operationLogCount] = await Promise.all([
                this.prisma.adminUser.count(),
                this.prisma.adminOperationLog.count(),
              ]);

              return {
                siteName: map.get('siteName') ?? '',
                adminCount,
                permissionNodeCount: ADMIN_PERMISSION_KEYS.length,
                operationLogCount,
                systemEntryCount: settings.length,
                customerServiceHotline: map.get('customerServiceHotline') ?? '',
                platformOfficialMerchantName:
                    map.get('platformOfficialMerchantName') ?? DEFAULT_PLATFORM_OFFICIAL_MERCHANT_NAME,
                platformSupportMerchantId: map.get('platformSupportMerchantId') ?? '',
                auditMode: map.get('auditMode') ?? '',
                pointsRedeemEnabled: String(map.get('pointsRedeemEnabled') ?? 'true') !== 'false',
                pointsEarnRate: map.get('pointsEarnRate') ?? '1',
                pointsRedeemRate: map.get('pointsRedeemRate') ?? '100',
                logisticsCompanies: (() => {
                  try {
                    return this.normalizeLogisticsCompanies(
                      map.get('logisticsCompanies') ? JSON.parse(String(map.get('logisticsCompanies'))) : null,
                    );
                  } catch {
                    return this.getDefaultLogisticsCompanies();
                  }
                })(),
                items: settings.map((item) => ({
                  key: item.key,
                  value: item.value,
                })),
              };
            }));
  }

  async getChatSupportTarget() {
    await this.withSeed();

    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['platformSupportMerchantId', 'customerServiceHotline', 'platformOfficialMerchantName'],
        },
      },
    });
    const map = new Map(settings.map((item) => [item.key, item.value]));
    const configuredMerchantId = Number(map.get('platformSupportMerchantId') ?? 0);

    const configuredMerchant = configuredMerchantId
      ? await this.prisma.merchant.findFirst({
          where: {
            id: BigInt(configuredMerchantId),
            deletedAt: null,
            status: 1,
          },
          include: {
            user: {
              select: {
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        })
      : null;

    const merchant =
      configuredMerchant ??
      (await (async () => {
        const officialMerchant = await this.ensurePlatformMerchant();
        return this.prisma.merchant.findFirst({
          where: { id: officialMerchant.id, deletedAt: null, status: 1 },
          include: {
            user: {
              select: {
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        });
      })());

    if (!merchant) {
      throw new NotFoundException('Customer service target not found');
    }

    return {
      merchantId: this.toNumber(merchant.id),
      merchantName: resolveProfileText(merchant.user.nickname, resolveProfileText(merchant.storeName, '在线客服')),
      merchantLogo: resolveProfileText(merchant.storeLogo, merchant.user.avatarUrl || ''),
      hotline: map.get('customerServiceHotline') ?? '',
      source: (configuredMerchant ? 'CONFIGURED' : 'FALLBACK') as 'CONFIGURED' | 'FALLBACK',
      sceneType: 'OFFICIAL' as const,
      sceneLabel: '平台管理员在线客服',
      sceneSource: configuredMerchant ? '平台配置客服商户' : '系统默认客服',
    };
  }

  async updateSystemSettings(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const entries: Array<[string, string]> = [];
    if (body.key != null && body.value != null) {
      entries.push([String(body.key).trim(), String(body.value)]);
    } else if (Array.isArray(body.settings)) {
      for (const item of body.settings) {
        if (item && typeof item === 'object') {
          const key = String((item as Record<string, unknown>).key ?? '').trim();
          const value = (item as Record<string, unknown>).value;
          if (key && value != null) {
            entries.push([key, String(value)]);
          }
        }
      }
    } else {
      for (const [key, value] of Object.entries(body)) {
        if (value != null && !['settings'].includes(key)) {
          entries.push([key, String(value)]);
        }
      }
    }

    if (entries.length === 0) {
      throw new BadRequestException('System settings are required');
    }

    await this.prisma.$transaction(
        entries.map(([key, value]) =>
            this.prisma.systemSetting.upsert({
              where: { key },
              create: { key, value },
              update: { value },
            }),
        ),
    );

    if (entries.some(([key]) => key === 'platformOfficialMerchantName' || key === 'platformSupportMerchantId')) {
      await this.ensurePlatformMerchant();
    }

    await this.recordAdminOperation(authUser, 'UPDATE_SETTINGS', '系统配置', undefined, {
      keys: entries.map(([key]) => key),
    });

    return this.getSystemSettings();
  }

  async getOperationLogs(query: Record<string, string> = {}) {
    await this.withSeed();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const action = String(query.action ?? '').trim();
    const moduleName = String(query.module ?? '').trim();

    const where: Prisma.AdminOperationLogWhereInput = {
      ...(action ? { action } : {}),
      ...(moduleName
          ? {
            targetType: { contains: moduleName },
          }
          : {}),
      ...(keyword
          ? {
            OR: [
              { action: { contains: keyword } },
              { targetType: { contains: keyword } },
              { adminUser: { username: { contains: keyword } } },
              { adminUser: { nickname: { contains: keyword } } },
            ],
          }
          : {}),
    };

    const [total, logs] = await Promise.all([
      this.prisma.adminOperationLog.count({ where }),
      this.prisma.adminOperationLog.findMany({
        where,
        include: {
          adminUser: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(page, 1) - 1) * Math.max(pageSize, 1),
        take: Math.max(pageSize, 1),
      }),
    ]);

    return {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      total,
      items: logs.map((log) => ({
        id: this.toNumber(log.id),
        operator: log.adminUser?.nickname ?? '系统',
        operatorAccount: log.adminUser?.username ?? 'system',
        module: log.targetType ?? '系统',
        action: log.action,
        createdAt: log.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        riskLevel: '正常',
      })),
    };
  }

  async createBanner(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const startAt = this.parseDate(body.startAt);
    const endAt = this.parseDate(body.endAt);
    const linkType = 'none';
    const linkId = null;

    const banner = await this.prisma.banner.create({
      data: {
        title: String(body.title ?? '新Banner'),
        imageUrl: String(body.imageUrl ?? ''),
        linkType,
        linkId,
        startAt,
        endAt,
        sortOrder: Number(body.sortOrder ?? 1),
        status: String(body.status ?? 'ENABLED'),
      },
    });

    await this.recordAdminOperation(authUser, 'CREATE_BANNER', 'Banner管理', banner.id, {
      title: banner.title,
      linkType: banner.linkType,
    });

    return {
      bannerId: this.toNumber(banner.id),
      id: this.toNumber(banner.id),
      title: banner.title,
      imageUrl: this.resolvePublicUrl(banner.imageUrl) ?? '',
      linkType: banner.linkType,
      linkId: null,
      startAt: this.toIso(banner.startAt),
      endAt: this.toIso(banner.endAt),
      sortOrder: banner.sortOrder,
      status: banner.status,
      input: body,
    };
  }

  async updateBannerStatus(bannerId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const banner = await this.prisma.banner.findUnique({ where: { id: BigInt(bannerId) } });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    const nextStatus = String(body.status ?? '');
    if (nextStatus !== 'ENABLED' && nextStatus !== 'DISABLED') {
      throw new BadRequestException('Invalid banner status, expected ENABLED or DISABLED');
    }

    const updated = await this.prisma.banner.update({
      where: { id: banner.id },
      data: { status: nextStatus },
    });

    await this.recordAdminOperation(
        authUser,
        'UPDATE_BANNER_STATUS',
        'Banner管理',
        updated.id,
        { from: banner.status, to: nextStatus, remark: String(body.remark ?? '') },
    );

    return {
      bannerId: this.toNumber(updated.id),
      id: this.toNumber(updated.id),
      title: updated.title,
      imageUrl: this.resolvePublicUrl(updated.imageUrl) ?? '',
      linkType: updated.linkType,
      linkId: updated.linkId != null ? this.toNumber(updated.linkId) : null,
      startAt: this.toIso(updated.startAt),
      endAt: this.toIso(updated.endAt),
      sortOrder: updated.sortOrder,
      status: updated.status,
    };
  }

  async updateBanner(bannerId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const banner = await this.prisma.banner.findFirst({
      where: { id: BigInt(bannerId), deletedAt: null },
    });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    const startAt = this.parseDate(body.startAt);
    const endAt = this.parseDate(body.endAt);
    const linkType = 'none';
    const linkId = null;

    const updated = await this.prisma.banner.update({
      where: { id: banner.id },
      data: {
        title: String(body.title ?? banner.title),
        imageUrl: String((body.imageUrl && String(body.imageUrl).trim()) || banner.imageUrl),
        linkType,
        linkId,
        startAt,
        endAt,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : banner.sortOrder,
        status: String(body.status ?? banner.status),
      },
    });

    await this.recordAdminOperation(authUser, 'UPDATE_BANNER', 'Banner管理', updated.id, {
      title: updated.title,
      linkType: updated.linkType,
    });

    return {
      bannerId: this.toNumber(updated.id),
      id: this.toNumber(updated.id),
      title: updated.title,
      imageUrl: this.resolvePublicUrl(updated.imageUrl) ?? '',
      linkType: updated.linkType,
      linkId: null,
      startAt: this.toIso(updated.startAt),
      endAt: this.toIso(updated.endAt),
      sortOrder: updated.sortOrder,
      status: updated.status,
    };
  }

  async deleteBanner(bannerId: number, authUser?: AuthUser) {
    await this.withSeed();

    const banner = await this.prisma.banner.findFirst({
      where: { id: BigInt(bannerId), deletedAt: null },
    });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    await this.prisma.banner.update({
      where: { id: BigInt(bannerId) },
      data: { deletedAt: this.now() },
    });

    await this.recordAdminOperation(authUser, 'DELETE_BANNER', 'Banner管理', banner.id, {
      title: banner.title,
    });

    return {
      success: true,
      bannerId,
    };
  }

  async reorderBanners(bannerIds: number[], authUser?: AuthUser) {
    await this.withSeed();

    await this.prisma.$transaction(
      bannerIds.map((id, index) =>
        this.prisma.banner.update({
          where: { id: BigInt(id) },
          data: { sortOrder: index + 1 },
        })
      )
    );

    await this.recordAdminOperation(authUser, 'REORDER_BANNERS', 'Banner管理', 0n, {
      bannerIds,
    });

    return { success: true };
  }

  async createActivity(body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();
    const activityName = String(body.activityName ?? body.title ?? '新活动');
    const activityType = String(body.activityType ?? 'SECKILL').trim().toUpperCase() || 'SECKILL';
    const products = Array.isArray(body.products)
      ? body.products.filter((item) => item && typeof item === 'object')
      : [];
    const ruleJson =
      body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson)
        ? (body.ruleJson as Record<string, unknown>)
        : {};
    const productCount = body.productCount != null ? Number(body.productCount) : products.length;

    const activity = await this.prisma.activity.create({
      data: {
        activityName,
        activityType,
        status: String(body.status ?? 'DRAFT'),
        startAt: this.parseChinaDateTime(body.startAt),
        endAt: this.parseChinaDateTime(body.endAt),
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
          validStartAt: this.parseChinaDateTime(body.startAt),
          validEndAt: this.parseChinaDateTime(body.endAt),
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

    if (activity.activityType === 'SECKILL') {
      await this.syncSeckillActivityToFlashSale(activity);
    }
    if (activity.activityType === 'GROUP_BUY') {
      await this.syncGroupBuyActivityToProducts(activity);
    }

    await this.recordAdminOperation(authUser, 'CREATE_ACTIVITY', '活动管理', activity.id, {
      activityName: activity.activityName,
      activityType: activity.activityType,
    });

    return {
      activityId: this.toNumber(activity.id),
      id: this.toNumber(activity.id),
      activityName: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: this.formatChinaDateTime(activity.startAt),
      endAt: this.formatChinaDateTime(activity.endAt),
      productCount: activity.productCount,
      products,
      ruleJson,
      input: body,
    };
  }

  async updateActivity(activityId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const oldActivity = await this.prisma.activity.findFirst({
      where: { id: activityId, deletedAt: null },
    });

    if (!oldActivity) {
      throw new NotFoundException('Activity not found');
    }
    const activityName = String(body.activityName ?? body.title ?? oldActivity.activityName);
    const activityType = String(body.activityType ?? oldActivity.activityType).trim().toUpperCase() || oldActivity.activityType;
    const products = Array.isArray(body.products)
      ? body.products.filter((item) => item && typeof item === 'object')
      : [];
    const ruleJson =
      body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson)
        ? (body.ruleJson as Record<string, unknown>)
        : {};
    const productCount = body.productCount != null ? Number(body.productCount) : (products.length || oldActivity.productCount);

    const activity = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        activityName,
        activityType,
        status: String(body.status ?? oldActivity.status),
        startAt: body.startAt !== undefined ? this.parseChinaDateTime(body.startAt) : oldActivity.startAt,
        endAt: body.endAt !== undefined ? this.parseChinaDateTime(body.endAt) : oldActivity.endAt,
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
            validStartAt: body.startAt !== undefined ? this.parseChinaDateTime(body.startAt) : coupon.validStartAt,
            validEndAt: body.endAt !== undefined ? this.parseChinaDateTime(body.endAt) : coupon.validEndAt,
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
      } else {
        await this.prisma.coupon.create({
          data: {
            name: activity.activityName,
            type: 'CASHBACK',
            thresholdAmount: new Prisma.Decimal(String(ruleJson.thresholdAmount ?? body.thresholdAmount ?? '100')),
            discountAmount: new Prisma.Decimal(String(ruleJson.discountAmount ?? body.discountAmount ?? '10')),
            stock: Number(ruleJson.couponStock ?? body.stock ?? 100),
            issuedStock: 0,
            validStartAt: this.parseChinaDateTime(body.startAt),
            validEndAt: this.parseChinaDateTime(body.endAt),
            scope: String(body.scope ?? ruleJson.scope ?? 'ALL').trim().toUpperCase() || 'ALL',
            perUserLimit: Math.max(Number(ruleJson.perUserLimit ?? body.perUserLimit ?? 1) || 1, 1),
            ruleJson: {
              ...ruleJson,
              ...(products.length ? { products } : {}),
              activityId,
            } as Prisma.InputJsonValue,
            status: String(body.status ?? oldActivity.status) === 'DRAFT' ? 'DRAFT' : 'ENABLED',
          },
        });
      }
    }

    if (activity.activityType === 'SECKILL') {
      await this.syncSeckillActivityToFlashSale(activity);
    }
    if (activity.activityType === 'GROUP_BUY') {
      await this.syncGroupBuyActivityToProducts(activity);
    }

    await this.recordAdminOperation(authUser, 'UPDATE_ACTIVITY', '活动管理', activity.id, {
      activityName: activity.activityName,
      activityType: activity.activityType,
    });

    return {
      activityId: this.toNumber(activity.id),
      id: this.toNumber(activity.id),
      activityName: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: this.formatChinaDateTime(activity.startAt),
      endAt: this.formatChinaDateTime(activity.endAt),
      productCount: activity.productCount,
      products,
      ruleJson,
      input: body,
    };
  }

  async deleteActivity(activityId: number, authUser?: AuthUser) {
    await this.withSeed();

    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, deletedAt: null },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    await this.prisma.activity.update({
      where: { id: activityId },
      data: { deletedAt: this.now() },
    });

    if (activity.activityType === 'SECKILL') {
      await this.syncSeckillActivityToFlashSale({
        ...activity,
        status: 'ENDED',
      });
    }
    if (activity.activityType === 'GROUP_BUY') {
      await this.syncGroupBuyActivityToProducts({
        ...activity,
        status: 'ENDED',
      });
    }

    if (activity.activityType === 'CASHBACK') {
      const coupon = await this.prisma.coupon.findFirst({
        where: { name: activity.activityName, deletedAt: null },
      });
      if (coupon) {
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { deletedAt: this.now() },
        });
      }
    }

    await this.recordAdminOperation(authUser, 'DELETE_ACTIVITY', '活动管理', activity.id, {
      activityName: activity.activityName,
      activityType: activity.activityType,
    });

    return {
      success: true,
      activityId,
    };
  }

  async arbitrateRefund(refundNo: string, body: Record<string, unknown>, authUser?: AuthUser) {
    await this.withSeed();

    const refund = await this.prisma.refundApply.findUnique({ where: { refundNo } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== PlatformDataService.REFUND_STATUS.PENDING_MERCHANT && refund.status !== PlatformDataService.REFUND_STATUS.PROCESSING) {
      throw new BadRequestException('该退款申请当前状态不可仲裁');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: refund.orderId },
      select: { orderStatus: true, orderNo: true },
    });
    if (!order || order.orderStatus === PlatformDataService.ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('订单已取消，不可仲裁退款');
    }

    const isApprove = String(body.action ?? 'approve') !== 'reject';
    const status = isApprove ? 3 : 4;

    // P0-6: 获取订单项信息用于库存恢复
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: refund.orderItemId },
      select: { skuId: true, quantity: true },
    });

    if (isApprove) {
      const wallet = await this.prisma.merchantWallet.findUnique({
        where: { merchantId: refund.merchantId },
      });
      if (!wallet || wallet.availableBalance.lt(refund.refundAmount)) {
        throw new BadRequestException('商户余额不足，无法退款');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // P0-7: 使用 CAS 条件更新防止重复退款
      const updated = await tx.refundApply.updateMany({
        where: { id: refund.id, status: { in: [1, 2] } },
        data: {
          status,
          adminRemark: typeof body.remark === 'string' ? body.remark : null,
          processedAt: this.now(),
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException('退款状态已变更，请刷新后重试');
      }

      await tx.order.updateMany({
        where: { id: refund.orderId },
        data: { refundStatus: status },
      });

      if (isApprove) {
        await tx.merchantWallet.update({
          where: { merchantId: refund.merchantId },
          data: {
            availableBalance: { decrement: refund.refundAmount },
          },
        });

        // P0-6: 退款同意后恢复库存
        if (orderItem) {
          await tx.productSku.update({
            where: { id: orderItem.skuId },
            data: {
              stock: { increment: orderItem.quantity },
              lockedStock: { decrement: orderItem.quantity },
            },
          });
        }
      }
    });

    await this.recordAdminOperation(authUser, 'ARBITRATE_REFUND', '售后仲裁', refund.id, {
      refundNo,
      action: body.action ?? 'approve',
      remark: body.remark ?? '',
    });

    const orderNo = order.orderNo;
    const remark = typeof body.remark === 'string' ? body.remark : '';
    try {
      await this.notifyUserRefundResult({
        userId: refund.userId,
        refundNo,
        orderNo,
        approved: isApprove,
        refundAmount: this.toMoney(refund.refundAmount),
        applyReason: refund.applyReason,
        remark,
      });
    } catch {
      // 通知失败不影响主流程
    }

    return {
      refundNo,
      result: body.action ?? 'approve',
      remark: body.remark ?? 'ok',
    };
  }

  async getCoupons(authUser?: AuthUser, merchantId?: number) {
    await this.withSeed();

    const user = await this.resolveOptionalUser(authUser);
    const lifecycleUser = user ? { createdAt: user.createdAt, lastLoginAt: user.lastLoginAt } : null;
    const receivedCouponIds = user
        ? new Set(
            (
                await this.prisma.userCoupon.findMany({
                  where: { userId: user.id },
                  select: { couponId: true },
                })
            ).map((item) => this.toNumber(item.couponId)),
        )
        : new Set<number>();

    const coupons = await this.prisma.coupon.findMany({
      where: { deletedAt: null },
      orderBy: [{ id: 'asc' }],
    });

    return coupons
      .map((coupon) => {
        const couponType = String(coupon.type ?? '').trim().toUpperCase();
        const lifecycleEligible = lifecycleUser
          ? this.isCouponUserLifecycleEligible(coupon, lifecycleUser, lifecycleUser.lastLoginAt)
          : !['NEW_USER', 'RETURNING_USER'].includes(couponType);
        return {
          couponId: this.toNumber(coupon.id),
          name: coupon.name,
          type: coupon.type,
          thresholdAmount: this.toMoney(coupon.thresholdAmount),
          discountAmount: this.toMoney(coupon.discountAmount),
          stock: coupon.stock,
          issuedStock: coupon.issuedStock,
          validStartAt: this.toIso(coupon.validStartAt),
          validEndAt: this.toIso(coupon.validEndAt),
          scope: coupon.scope,
          perUserLimit: coupon.perUserLimit,
          isActive: coupon.status === 'ENABLED'
            && this.isCouponInValidWindow(coupon)
            && lifecycleEligible,
          receiveStatus: coupon.status,
          received: receivedCouponIds.has(this.toNumber(coupon.id)),
        };
      })
      .filter((coupon) => {
        if (!merchantId || !Number.isFinite(merchantId) || merchantId <= 0) {
          return true;
        }
        return this.isCouponApplicableToMerchant(coupon, merchantId);
      });
  }

  private isCouponApplicableToMerchant(
    coupon: { scope: string; ruleJson?: Prisma.JsonValue | null },
    merchantId: number,
  ): boolean {
    const rule = this.getCouponRuleData(coupon);
    if (rule.scope === 'ALL') {
      return true;
    }
    if (rule.scope === 'SHOP') {
      return rule.merchantIds.length === 0 || rule.merchantIds.includes(merchantId);
    }
    if (rule.scope === 'CATEGORY_SHOP') {
      return rule.merchantIds.length === 0 || rule.merchantIds.includes(merchantId);
    }
    return true;
  }

  async getUserCoupons(authUser: AuthUser, status?: string) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: {
        userId: user.id,
        ...(status ? { status } : {}),
      },
      include: { coupon: true },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });

    return userCoupons.map((item) => {
      const available = this.evaluateCouponUsage(item.coupon, item, 0, {
        userCreatedAt: user.createdAt,
        previousLoginAt: user.lastLoginAt,
      });
      return {
        userCouponId: this.toNumber(item.id),
        userCouponNo: item.orderNo ? `${item.orderNo}` : `UC${this.toNumber(item.id)}`,
        couponId: this.toNumber(item.couponId),
        name: item.coupon.name,
        type: item.coupon.type,
        thresholdAmount: this.toMoney(item.coupon.thresholdAmount),
        discountAmount: this.toMoney(item.coupon.discountAmount),
        status: item.status,
        sourceType: item.sourceType,
        receivedAt: item.receivedAt.toISOString(),
        usedAt: item.usedAt ? item.usedAt.toISOString() : null,
        expiredAt: item.expiredAt ? item.expiredAt.toISOString() : null,
        orderNo: item.orderNo,
        validStartAt: this.toIso(item.coupon.validStartAt),
        validEndAt: this.toIso(item.coupon.validEndAt),
        scope: item.coupon.scope,
        perUserLimit: item.coupon.perUserLimit,
        usable: available.usable,
        unusableReason: available.reason,
      };
    });
  }

  async getPointExchangeItems(authUser?: AuthUser) {
    await this.withSeed();
    const user = await this.resolveOptionalUser(authUser);
    const pointRule = await this.getPointRuleConfig();
    const coupons = await this.prisma.coupon.findMany({
      where: { deletedAt: null, type: 'CASHBACK' },
      orderBy: [{ id: 'asc' }],
    });
    const receivedCouponIds = user
      ? new Set(
          (
            await this.prisma.userCoupon.findMany({
              where: { userId: user.id },
              select: { couponId: true },
            })
          ).map((item) => this.toNumber(item.couponId)),
        )
      : new Set<number>();
    const balanceAgg = user
      ? await this.prisma.pointLog.aggregate({
          where: { userId: user.id },
          _sum: { points: true },
        })
      : null;
    const balance = Math.max(Number(balanceAgg?._sum.points ?? 0), 0);

    const items = coupons
      .filter((coupon) => coupon.status === 'ENABLED' && this.isCouponInValidWindow(coupon))
      .map((coupon) => {
        const rule = this.getExchangeRuleObject(coupon.ruleJson);
        const exchangeKind = this.getExchangeKindFromRuleJson(coupon.ruleJson);
        const pointsCost = this.resolveExchangePointsCost(coupon, pointRule.redeemRate);
        const received = receivedCouponIds.has(this.toNumber(coupon.id));
        return {
          couponId: this.toNumber(coupon.id),
          name: coupon.name,
          type: coupon.type,
          exchangeKind,
          productId: Number(rule.productId ?? 0) || null,
          coverUrl: typeof rule.coverUrl === 'string' ? rule.coverUrl : '',
          thresholdAmount: this.toMoney(coupon.thresholdAmount),
          discountAmount: this.toMoney(coupon.discountAmount),
          stock: coupon.stock,
          issuedStock: coupon.issuedStock,
          validStartAt: this.toIso(coupon.validStartAt),
          validEndAt: this.toIso(coupon.validEndAt),
          received,
          pointsCost,
          canRedeem: Boolean(user) && !received && coupon.stock > coupon.issuedStock && balance >= pointsCost,
        };
      })
      .sort((left, right) => Number(left.pointsCost) - Number(right.pointsCost));

    return {
      balance,
      items,
    };
  }

  async getAvailableCoupons(authUser: AuthUser, cartAmount: number, merchantId?: number) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);
    const now = this.now();
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: { userId: user.id, status: 'RECEIVED' },
      include: { coupon: true },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });

    const results: Array<Record<string, unknown>> = [];
    for (const item of userCoupons) {
      const available = this.evaluateCouponUsage(item.coupon, item, cartAmount, {
        merchantId,
        userCreatedAt: user.createdAt,
        previousLoginAt: user.lastLoginAt,
      });
      if (!available.usable) {
        continue;
      }
      results.push({
        userCouponId: this.toNumber(item.id),
        couponId: this.toNumber(item.couponId),
        name: item.coupon.name,
        type: item.coupon.type,
        thresholdAmount: this.toMoney(item.coupon.thresholdAmount),
        discountAmount: this.toMoney(item.coupon.discountAmount),
        stock: item.coupon.stock,
        issuedStock: item.coupon.issuedStock,
        validStartAt: this.toIso(item.coupon.validStartAt),
        validEndAt: this.toIso(item.coupon.validEndAt),
        scope: item.coupon.scope,
        perUserLimit: item.coupon.perUserLimit,
        receivedAt: item.receivedAt.toISOString(),
        matchScore: cartAmount >= Number(item.coupon.thresholdAmount) ? 1 : 0.5,
        matchReason: merchantId ? '当前订单可使用' : '当前金额可使用',
        usable: true,
        availableAt: now.toISOString(),
      });
    }
    return results;
  }

  async receiveCoupon(authUser: AuthUser, couponId: number) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);

    let result: { coupon: any; alreadyReceived: boolean } | null = null;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const coupon = await tx.coupon.findUniqueOrThrow({
          where: { id: BigInt(couponId) },
        });
        if (coupon.deletedAt || coupon.status !== 'ENABLED') {
          throw new BadRequestException('优惠券已下架');
        }
        if (!this.isCouponInValidWindow(coupon)) {
          throw new BadRequestException('优惠券不在有效期内');
        }
        if (!this.isCouponUserLifecycleEligible(coupon, { createdAt: user.createdAt, lastLoginAt: user.lastLoginAt }, user.lastLoginAt)) {
          throw new BadRequestException(coupon.type === 'NEW_USER' ? '仅限新用户领取' : coupon.type === 'RETURNING_USER' ? '仅限回归用户领取' : '当前用户不满足领取条件');
        }
        if (coupon.stock <= coupon.issuedStock) {
          throw new BadRequestException('优惠券已抢光');
        }

        const existing = await tx.userCoupon.findUnique({
          where: {
            userId_couponId: {
              userId: user.id,
              couponId: BigInt(couponId),
            },
          },
        });

        if (existing) {
          return { coupon, alreadyReceived: true as const };
        }

        const updated = await tx.coupon.updateMany({
          where: { id: BigInt(couponId) },
          data: { issuedStock: { increment: 1 } },
        });

        if (updated.count === 0) {
          throw new BadRequestException('优惠券已抢光');
        }

        await tx.userCoupon.create({
          data: {
            userId: user.id,
            couponId: BigInt(couponId),
            status: 'RECEIVED',
            sourceType: 'ISSUE',
            expiredAt: coupon.validEndAt ?? null,
          },
        });

        return { coupon, alreadyReceived: false as const };
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
        const coupon = await this.prisma.coupon.findUnique({ where: { id: BigInt(couponId) } });
        if (coupon) {
          result = { coupon, alreadyReceived: true };
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (!result) {
      throw new InternalServerErrorException('领取优惠券失败');
    }

    return {
      couponId,
      received: true,
      alreadyReceived: result.alreadyReceived,
      discountAmount: this.toMoney(result.coupon.discountAmount),
      thresholdAmount: this.toMoney(result.coupon.thresholdAmount),
      userCouponNo: `UC${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    };
  }

  async getPointsLogs(authUser?: AuthUser) {
    await this.withSeed();
    const user = await this.resolveOptionalUser(authUser);

    if (!user) {
      return [];
    }

    return this.prisma.pointLog
        .findMany({
          where: { userId: user.id },
          orderBy: [{ createdAt: 'desc' }],
          take: 100,
        })
        .then((logs) =>
            logs.map((item) => ({
              id: this.toNumber(item.id),
              changeType: item.changeType,
              points: item.points,
              sourceType: item.sourceType,
              sourceNo: item.sourceNo ?? '',
              remark: item.remark ?? '',
              createdAt: item.createdAt.toISOString(),
            })),
        );
  }

  async exchangePointsCoupon(authUser: AuthUser, couponId: number) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);
    const pointRule = await this.getPointRuleConfig();

    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({
        where: { id: BigInt(couponId) },
      });
      if (!coupon || coupon.deletedAt) {
        throw new BadRequestException('优惠券不存在');
      }
      if (coupon.status !== 'ENABLED') {
        throw new BadRequestException('优惠券已下架');
      }
      if (!this.isCouponInValidWindow(coupon)) {
        throw new BadRequestException('优惠券不在有效期内');
      }
      if (String(coupon.type ?? '').toUpperCase() !== 'CASHBACK') {
        throw new BadRequestException('该优惠券暂不支持积分兑换');
      }

      const existing = await tx.userCoupon.findUnique({
        where: {
          userId_couponId: {
            userId: user.id,
            couponId: coupon.id,
          },
        },
      });
      if (existing) {
        const currentPoints = await tx.pointLog.aggregate({
          where: { userId: user.id },
          _sum: { points: true },
        });
        return {
          alreadyExchanged: true,
          couponId: this.toNumber(coupon.id),
          userCouponId: this.toNumber(existing.id),
          pointsCost: 0,
          remainingPoints: Math.max(Number(currentPoints._sum.points ?? 0), 0),
        };
      }

      const pointsCost = this.resolveExchangePointsCost(coupon, pointRule.redeemRate);
      const pointsAgg = await tx.pointLog.aggregate({
        where: { userId: user.id },
        _sum: { points: true },
      });
      const availablePoints = Math.max(Number(pointsAgg._sum.points ?? 0), 0);
      if (availablePoints < pointsCost) {
        throw new BadRequestException('积分余额不足');
      }

      const stockUpdated = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          status: 'ENABLED',
          deletedAt: null,
          stock: { gt: 0 },
          issuedStock: { lt: coupon.stock },
        },
        data: {
          issuedStock: { increment: 1 },
        },
      });
      if (stockUpdated.count === 0) {
        throw new BadRequestException('优惠券已抢光');
      }

      await tx.pointLog.create({
        data: {
          userId: user.id,
          changeType: 'DEDUCT',
          points: -pointsCost,
          sourceType: 'EXCHANGE',
          sourceNo: `EXCHANGE_COUPON_${coupon.id}`,
          remark: `积分兑换优惠券：${coupon.name}`,
        },
      });

      const userCoupon = await tx.userCoupon.create({
        data: {
          userId: user.id,
          couponId: coupon.id,
          status: 'RECEIVED',
          sourceType: 'EXCHANGE',
          receivedAt: this.now(),
          expiredAt: coupon.validEndAt ?? null,
        },
      });

      return {
        alreadyExchanged: false,
        couponId: this.toNumber(coupon.id),
        userCouponId: this.toNumber(userCoupon.id),
        couponName: coupon.name,
        pointsCost,
        remainingPoints: availablePoints - pointsCost,
      };
    });
  }

  async applyLeader(authUser: AuthUser, body: Record<string, unknown>) {
    return this.leaderService.applyLeader(authUser, body);
  }

  async bindLeader(authUser: AuthUser, leaderId: number) {
    return this.leaderService.bindLeader(authUser, leaderId);
  }

  getLeaderCommissions(authUser?: AuthUser) {
    if (!authUser) {
      return this.prisma.leaderCommission
          .findMany({ orderBy: [{ createdAt: 'desc' }] })
          .then((items) =>
              items.map((item) => ({
                id: this.toNumber(item.id),
                orderNo: item.orderNo,
                commissionAmount: this.toMoney(item.commissionAmount),
                status: item.status,
                remark: item.remark ?? '',
                boundLeaderId: item.boundLeaderId != null ? this.toNumber(item.boundLeaderId) : null,
              })),
          );
    }
    return this.leaderService.listAppCommissions(authUser, {});
  }

  async getAssetsSummary(authUser: AuthUser) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);

    const [pointsAgg, orderRows, couponCount, favoriteCount, defaultAddress] = await Promise.all([
      this.prisma.pointLog.aggregate({
        where: { userId: user.id },
        _sum: { points: true },
      }),
      this.prisma.order.findMany({
        where: { userId: user.id, deletedAt: null, isParent: false },
        select: {
          orderStatus: true,
          payStatus: true,
          deliveryStatus: true,
          refundStatus: true,
          expireAt: true,
        },
      }),
      this.prisma.userCoupon.count({
        where: { userId: user.id, status: 'RECEIVED', coupon: { deletedAt: null } },
      }),
      this.prisma.favorite.count({ where: { userId: user.id } }),
      this.prisma.userAddress.findFirst({
        where: { userId: user.id, isDefault: true, deletedAt: null },
        orderBy: { id: 'desc' },
      }),
    ]);
    const pointRule = await this.getPointRuleConfig();

    const pointsBalance = Number(pointsAgg._sum.points ?? 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEarned = await this.prisma.pointLog.aggregate({
      where: { userId: user.id, changeType: 'EARN', createdAt: { gte: todayStart } },
      _sum: { points: true },
    });

    const orders = {
      pendingPay: 0,
      pendingShip: 0,
      pendingReceive: 0,
      pendingReview: 0,
      refunding: 0,
      totalCompleted: 0,
    };
    const now = new Date();
    for (const row of orderRows) {
      const statusEnum = this.getUserOrderStatusEnum(
        row.orderStatus,
        row.payStatus,
        row.deliveryStatus,
        row.refundStatus,
        row.expireAt,
      );
      // 已过期但未落库取消的待支付单，不计入待付款角标
      if (
        row.payStatus === 0 &&
        row.orderStatus === PlatformDataService.ORDER_STATUS.PENDING &&
        row.expireAt != null &&
        row.expireAt < now
      ) {
        continue;
      }
      switch (statusEnum) {
        case 'PENDING_PAY':
          orders.pendingPay += 1;
          break;
        case 'PENDING_SHIP':
          orders.pendingShip += 1;
          break;
        case 'PENDING_RECEIVE':
          orders.pendingReceive += 1;
          break;
        case 'REFUNDING':
          orders.refunding += 1;
          break;
        case 'COMPLETED':
          orders.totalCompleted += 1;
          break;
        default:
          break;
      }
    }

    const maskedMobile = defaultAddress
        ? `${String(defaultAddress.receiverMobile).slice(0, 3)}****${String(defaultAddress.receiverMobile).slice(-4)}`
        : null;

    return {
      user: {
        id: this.toNumber(user.id),
        displayName: user.nickname ?? user.accountNo ?? `用户${user.id}`,
        avatarUrl: user.avatarUrl ?? '',
        vipLevel: 1,
        vipName: '湾源常客',
      },
      points: {
        balance: pointsBalance,
        expireIn30d: 0,
        todayEarned: Number(todayEarned._sum.points ?? 0),
        redeemEnabled: pointRule.redeemEnabled,
        earnRate: pointRule.earnRate,
        redeemRate: pointRule.redeemRate,
      },
      coupons: {
        unused: couponCount,
        available: couponCount,
        expiredUnused: 0,
      },
      favorites: {
        total: favoriteCount,
        recentViewed: 0,
      },
      orders,
      defaultAddress: defaultAddress
          ? {
            id: this.toNumber(defaultAddress.id),
            receiverName: defaultAddress.receiverName,
            mobileMasked: maskedMobile,
            fullRegion: `${defaultAddress.province} ${defaultAddress.city} ${defaultAddress.district}`,
            shortAddress: defaultAddress.detailAddress,
            tag: 'home',
          }
          : null,
      wallet: {
        available: '0.00',
        frozen: '0.00',
        note: '钱包功能即将上线',
      },
      updatedAt: this.now().toISOString(),
    };
  }

  async getRecommendedCoupons(
      authUser: AuthUser | undefined,
      scene: string,
      cartAmount: number,
      merchantId: number | undefined,
      limit: number,
  ) {
    await this.withSeed();

    const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 20);
    const user = authUser ? await this.resolveOptionalUser(authUser) : null;
    const userEligibility = user ? { createdAt: user.createdAt, lastLoginAt: user.lastLoginAt } : null;
    const receivedIds = user
        ? new Set(
            (
                await this.prisma.userCoupon.findMany({
                  where: { userId: user.id, status: 'RECEIVED' },
                  select: { couponId: true },
                })
            ).map((row) => this.toNumber(row.couponId)),
        )
        : new Set<number>();

    const coupons = await this.prisma.coupon.findMany({
      where: { status: 'ENABLED', deletedAt: null },
      orderBy: { id: 'asc' },
    });

    const candidates = coupons
        .map((coupon) => {
          const id = this.toNumber(coupon.id);
          const issued = coupon.issuedStock ?? 0;
          const stock = coupon.stock ?? 0;
          if (stock <= issued) return null;
          if (receivedIds.has(id)) return null;
          if (!this.isCouponInValidWindow(coupon)) return null;
          if (userEligibility && !this.isCouponUserLifecycleEligible(coupon, userEligibility, userEligibility.lastLoginAt)) return null;
          if (!userEligibility && (String(coupon.type ?? '').toUpperCase() === 'NEW_USER' || String(coupon.type ?? '').toUpperCase() === 'RETURNING_USER')) {
            return null;
          }
          const threshold = Number(coupon.thresholdAmount);
          const discount = Number(coupon.discountAmount);
          let matchScore = 0.5;
          let matchReason = '平台通用券';
          if (scene === 'cart' || scene === 'checkout') {
            if (cartAmount >= threshold) {
              matchScore = 1.0;
              matchReason = `已满足『满 ${threshold} 减 ${discount}』，去使用`;
            } else if (cartAmount > 0) {
              matchScore = 0.4 + 0.6 * (cartAmount / threshold);
              const diff = Math.max(threshold - cartAmount, 0).toFixed(2);
              matchReason = `再买 ¥${diff} 即可使用『满 ${threshold} 减 ${discount}』`;
            } else {
              matchReason = `下单满 ${threshold} 元可用`;
            }
          } else if (scene === 'shop') {
            matchReason = merchantId ? '本店铺可领券' : '平台通用券';
          }
          return {
            couponId: id,
            name: coupon.name,
            type: coupon.type,
            thresholdAmount: this.toMoney(coupon.thresholdAmount),
            discountAmount: this.toMoney(coupon.discountAmount),
            validStartAt: this.toIso(coupon.validStartAt),
            validEndAt: this.toIso(coupon.validEndAt),
            scope: coupon.scope,
            perUserLimit: coupon.perUserLimit,
            stock,
            issuedStock: issued,
            received: false,
            matchScore,
            matchReason,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    if (scene === 'checkout' && cartAmount > 0) {
      candidates.sort((left, right) => {
        const lMatch = left.matchScore >= 1 ? 0 : 1;
        const rMatch = right.matchScore >= 1 ? 0 : 1;
        if (lMatch !== rMatch) return lMatch - rMatch;
        const lThreshold = Number(left.thresholdAmount);
        const rThreshold = Number(right.thresholdAmount);
        return Math.abs(lThreshold - cartAmount) - Math.abs(rThreshold - cartAmount);
      });
    } else if (scene === 'cart' && cartAmount > 0) {
      candidates.sort((left, right) => {
        const lMatch = left.matchScore >= 1 ? 0 : 1;
        const rMatch = right.matchScore >= 1 ? 0 : 1;
        if (lMatch !== rMatch) return lMatch - rMatch;
        const lThreshold = Number(left.thresholdAmount);
        const rThreshold = Number(right.thresholdAmount);
        return Math.abs(lThreshold - cartAmount) - Math.abs(rThreshold - cartAmount);
      });
    } else {
      candidates.sort((left, right) => {
        if (left.matchScore !== right.matchScore) return right.matchScore - left.matchScore;
        return right.issuedStock - left.issuedStock;
      });
    }

    const items = candidates.slice(0, safeLimit);
    const topHit = items[0];
    let hint: string | null = null;
    if ((scene === 'cart' || scene === 'checkout') && topHit) {
      const threshold = Number(topHit.thresholdAmount);
      if (cartAmount < threshold) {
        const diff = (threshold - cartAmount).toFixed(2);
        hint = `再买 ¥${diff} 即可使用『${topHit.name}』`;
      } else if (topHit.matchScore >= 1) {
        hint = `已自动选用『${topHit.name}』`;
      }
    }

    return { scene, items, hint };
  }

  async getCategoryRecommendations(categoryId: number, period: string, limit: number, page: number) {
    await this.withSeed();

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const since = this.periodToDate(period);

    const products = await this.prisma.product.findMany({
      where: { categoryId: BigInt(categoryId), status: 1, auditStatus: 2, deletedAt: null },
      include: { skus: { orderBy: { id: 'asc' }, take: 1 } },
      take: safeLimit * 3,
    });

    const orderItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: products.map((p) => p.id) },
        order: { payStatus: 1, orderStatus: { in: [2, 3, 4] }, paidAt: { gte: since } },
      },
      _sum: { quantity: true },
    });
    const salesMap = new Map<string, number>();
    for (const row of orderItems) {
      salesMap.set(String(row.productId), Number(row._sum.quantity ?? 0));
    }

    const sorted = [...products].sort((left, right) => {
      const l = salesMap.get(left.id.toString()) ?? 0;
      const r = salesMap.get(right.id.toString()) ?? 0;
      if (l !== r) return r - l;
      return Number(right.id) - Number(left.id);
    });
    const total = sorted.length;
    const offset = (safePage - 1) * safeLimit;
    const slice = sorted.slice(offset, offset + safeLimit);

    return {
      categoryId,
      period,
      page: safePage,
      pageSize: safeLimit,
      total,
      items: slice.map((product) => this.toRecommendItem(product, salesMap)),
    };
  }

  async getRelatedProducts(productId: number, limit: number) {
    await this.withSeed();
    const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 10);

    const current = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });
    if (!current || !this.isPublicProductVisible(current)) {
      return { productId, items: [] };
    }

    const candidates = await this.prisma.product.findMany({
      where: {
        id: { not: BigInt(productId) },
        status: 1,
        auditStatus: 2,
        deletedAt: null,
        OR: [
          { categoryId: current.categoryId },
          { merchantId: current.merchantId },
          { originPlace: current.originPlace },
        ],
      },
      include: { skus: { orderBy: { id: 'asc' }, take: 1 } },
      take: safeLimit * 2,
    });

    const salesMap = await this.salesMapFor(candidates.map((p) => p.id));
    const ordered = [...candidates].sort((left, right) => {
      const lScore = this.relevanceScore(left, current);
      const rScore = this.relevanceScore(right, current);
      if (lScore !== rScore) return rScore - lScore;
      const lSales = salesMap.get(left.id.toString()) ?? 0;
      const rSales = salesMap.get(right.id.toString()) ?? 0;
      if (lSales !== rSales) return rSales - lSales;
      return Number(right.id) - Number(left.id);
    });

    return {
      productId,
      items: ordered.slice(0, safeLimit).map((product) => this.toRecommendItem(product, salesMap)),
    };
  }

  private relevanceScore(
      candidate: { categoryId: bigint; merchantId: bigint; originPlace: string | null },
      current: { categoryId: bigint; merchantId: bigint; originPlace: string | null },
  ) {
    let score = 0;
    if (candidate.categoryId === current.categoryId) score += 100;
    if (candidate.merchantId === current.merchantId) score += 30;
    if (
        candidate.originPlace &&
        current.originPlace &&
        candidate.originPlace === current.originPlace
    ) {
      score += 10;
    }
    return score;
  }

  private async salesMapFor(productIds: bigint[]) {
    if (productIds.length === 0) return new Map<string, number>();
    const since = this.periodToDate('day');
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        order: { payStatus: 1, orderStatus: { in: [2, 3, 4] }, paidAt: { gte: since } },
      },
      _sum: { quantity: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(String(row.productId), Number(row._sum.quantity ?? 0));
    }
    return map;
  }

  private isPublicProductVisible(product: {
    status: number;
    auditStatus: number;
    deletedAt?: Date | null;
  }): boolean {
    return product.deletedAt == null && product.status === 1 && product.auditStatus === 2;
  }

  private toRecommendItem(
      product: {
        id: bigint;
        title: string;
        subtitle: string | null;
        coverUrl: string | null;
        isPreSale: boolean;
        isHot: boolean;
        merchantId: bigint;
        skus: Array<{ price: Prisma.Decimal; originalPrice: Prisma.Decimal | null }>;
      },
      salesMap: Map<string, number>,
  ) {
    const sku = product.skus[0];
    const priceView = sku ? this.getDisplayPriceSplit(sku) : null;
    return {
      id: this.toNumber(product.id),
      title: product.title,
      subtitle: product.subtitle ?? '',
      coverUrl: this.resolvePublicUrl(product.coverUrl) ?? '',
      price: priceView?.displayPrice ?? this.toMoney(sku?.price ?? 0),
      originalPrice: priceView?.originalPrice ?? this.toMoney(sku?.originalPrice ?? sku?.price ?? 0),
      salesCount: salesMap.get(product.id.toString()) ?? 0,
      isHot: product.isHot,
      isPreSale: product.isPreSale,
      merchantId: this.toNumber(product.merchantId),
      storeName: '',
    };
  }

  private periodToDate(period: string): Date {
    const now = this.now();
    if (period === 'day') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0);
  }

  getFallbackProducts() {
    return [];
  }

  getFallbackProductDetails() {
    return null;
  }

  getFallbackAdminUsers() {
    return [];
  }

  getFallbackAdminMerchants() {
    return [];
  }

  getFallbackAdminProducts() {
    return [];
  }

  getFallbackAdminRefunds() {
    return [];
  }

  getFallbackDashboardOverview() {
    return this.getDashboardOverview();
  }

  getFallbackHotProducts() {
    return this.getHotProducts();
  }

  getFallbackOriginSales() {
    return this.getOriginSales();
  }

  async createWxacode(authUser: AuthUser, body: Record<string, unknown>) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);

    const type = String(body.type ?? '');
    const refId = Number(body.id ?? body.refId ?? 0);
    if (!['p', 'm', 'c', 'o', 'a'].includes(type) || !Number.isFinite(refId) || refId <= 0) {
      throw new BadRequestException('Invalid qr-code payload: type/id required');
    }

    const inviterId = body.inviter != null ? Number(body.inviter) : undefined;
    const scene = this.buildScene(type, refId, inviterId, user.id);
    const existing = await this.prisma.qrCodeRecord.findUnique({ where: { scene } });
    if (existing) {
      return {
        scene: existing.scene,
        imageUrl: existing.imageUrl,
        expireAt: this.toIso(existing.expireAt),
        width: 280,
        cached: true,
      };
    }

    const imageUrl = `${this.getDemoQrBaseUrl()}/${scene.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    const record = await this.prisma.qrCodeRecord.create({
      data: {
        scene,
        type,
        refId: BigInt(refId),
        inviterId: inviterId ? BigInt(inviterId) : null,
        channel: 'wxacode',
        imageUrl,
        status: 1,
        payload: { generatedBy: this.toNumber(user.id) } as Prisma.InputJsonValue,
      },
    });

    return {
      scene: record.scene,
      imageUrl: record.imageUrl,
      expireAt: null,
      width: 280,
      cached: false,
    };
  }

  async createShareCard(authUser: AuthUser, body: Record<string, unknown>) {
    await this.withSeed();
    const user = await this.ensureUser(authUser);

    const activityId = Number(body.activityId ?? 0);
    if (!Number.isFinite(activityId) || activityId <= 0) {
      throw new BadRequestException('activityId is required');
    }
    const channel = String(body.channel ?? 'wechat');
    const scene = this.buildScene('a', activityId, undefined, user.id, 'i');
    const imageUrl = `${this.getDemoShareBaseUrl()}/${scene.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    const expireAt = new Date(this.now().getTime() + 30 * 60 * 1000);

    const existing = await this.prisma.qrCodeRecord.findUnique({ where: { scene } });
    if (existing && existing.expireAt && existing.expireAt > this.now()) {
      return {
        scene: existing.scene,
        imageUrl: existing.imageUrl,
        expireAt: this.toIso(existing.expireAt),
        channel,
        cached: true,
      };
    }

    const record = await this.prisma.qrCodeRecord.upsert({
      where: { scene },
      create: {
        scene,
        type: 'a',
        refId: BigInt(activityId),
        inviterId: user.id,
        channel,
        imageUrl,
        status: 1,
        expireAt,
        payload: { activityId, channel } as Prisma.InputJsonValue,
      },
      update: {
        imageUrl,
        expireAt,
        status: 1,
        channel,
      },
    });

    return {
      scene: record.scene,
      imageUrl: record.imageUrl,
      expireAt: this.toIso(record.expireAt),
      channel,
      cached: false,
    };
  }

  async scanQrCode(authUser: AuthUser, body: Record<string, unknown>) {
    await this.withSeed();
    const scene = String(body.scene ?? '');
    if (!scene) {
      throw new BadRequestException('scene is required');
    }

    const record = await this.prisma.qrCodeRecord.findUnique({ where: { scene } });
    if (!record) {
      return { redirect: null, bindStatus: 'none' };
    }

    if (record.expireAt && record.expireAt < this.now()) {
      return { redirect: this.redirectFor(record), bindStatus: 'expired' };
    }

    if (record.status === 2) {
      return { redirect: this.redirectFor(record), bindStatus: 'duplicate' };
    }

    const updateResult = await this.prisma.qrCodeRecord.updateMany({
      where: { id: record.id, status: { not: 2 } },
      data: { status: 2 },
    });

    if (updateResult.count === 0) {
      return { redirect: this.redirectFor(record), bindStatus: 'duplicate' };
    }

    let rewardId: number | null = null;
    if (record.type === 'a' && record.inviterId) {
      const scanner = await this.ensureUser(authUser);
      if (this.toNumber(record.inviterId) !== this.toNumber(scanner.id)) {
        rewardId = this.toNumber(record.refId);
      }
    }

    return {
      redirect: this.redirectFor(record),
      bindStatus: 'bound',
      rewardId,
    };
  }

  async resolveQrRedirect(query: Record<string, string>) {
    const scene = String(query.scene ?? '');
    if (!scene) {
      return { redirect: '/pages/index/index' };
    }
    const record = await this.prisma.qrCodeRecord.findUnique({ where: { scene } });
    if (!record) {
      return { redirect: '/pages/index/index' };
    }
    return { redirect: this.redirectFor(record) };
  }

  private buildScene(
      type: string,
      refId: number,
      inviterId: number | undefined,
      currentUserId: bigint,
      prefixOverride?: string,
  ) {
    if (type === 'a' && (inviterId != null || prefixOverride === 'i')) {
      const inviter = inviterId ?? this.toNumber(currentUserId);
      return `a:${refId}:i:u:${inviter}`;
    }
    return `${type}:${refId}`;
  }

  private redirectFor(record: { type: string; refId: bigint; inviterId: bigint | null }) {
    const refId = this.toNumber(record.refId);
    switch (record.type) {
      case 'p':
        return `/pages/category/detail/detail?id=${refId}`;
      case 'm':
        return `/pages/category/category?merchantId=${refId}`;
      case 'c':
        return `/pages/marketing/marketing?couponId=${refId}`;
      case 'o':
        return `/pages/order/detail/index?orderNo=${refId}`;
      case 'a':
        return `/pages/marketing/marketing?activityId=${refId}&inviter=${record.inviterId ? this.toNumber(record.inviterId) : ''}`;
      default:
        return '/pages/index/index';
    }
  }

  async syncMerchantProductDraft(authUser: AuthUser, payload: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const form = payload?.form as any;
    const title = (form?.title as string) || '未命名草稿';
    const coverUrl = (form?.images?.[0] as string) || (form?.coverUrl as string) || undefined;
    const existing = await this.prisma.merchantProductDraft.findFirst({
      where: { merchantId: merchant.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      const updated = await this.prisma.merchantProductDraft.update({
        where: { id: existing.id },
        data: { title, coverUrl: coverUrl ?? existing.coverUrl, payload: payload as any, updatedAt: new Date() },
      });
      return { draftId: `DR${String(Number(updated.id)).padStart(6, '0')}` };
    }
    const created = await this.prisma.merchantProductDraft.create({
      data: { merchantId: merchant.id, draftNo: '', title, coverUrl, payload: payload as any },
    });
    const draftNo = `DR${String(Number(created.id)).padStart(6, '0')}`;
    await this.prisma.merchantProductDraft.update({ where: { id: created.id }, data: { draftNo } });
    return { draftId: draftNo };
  }

  async fetchMerchantProductDraft(authUser: AuthUser, draftRef: string) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const draft = await this.prisma.merchantProductDraft.findFirst({
      where: {
        merchantId: merchant.id, deletedAt: null,
        OR: [{ draftNo: draftRef }, ...(isNaN(Number(draftRef)) ? [] : [{ id: BigInt(draftRef) }])],
      },
    });
    if (!draft) return null;
    return {
      id: this.toNumber(draft.id), draftNo: draft.draftNo, title: draft.title,
      coverUrl: draft.coverUrl, payloadJson: draft.payload, updatedAt: draft.updatedAt, createdAt: draft.createdAt,
    };
  }

  async listMerchantProductDrafts(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const drafts = await this.prisma.merchantProductDraft.findMany({
      where: { merchantId: merchant.id, deletedAt: null }, orderBy: { updatedAt: 'desc' },
      select: { id: true, draftNo: true, title: true, coverUrl: true, updatedAt: true },
    });
    return drafts.map((d) => ({
      id: this.toNumber(d.id), draftNo: d.draftNo, title: d.title,
      coverUrl: d.coverUrl, completeness: 100, updatedAt: d.updatedAt,
    }));
  }

  async deleteMerchantProductDraft(authUser: AuthUser, draftRef: string) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const draft = await this.prisma.merchantProductDraft.findFirst({
      where: {
        merchantId: merchant.id, deletedAt: null,
        OR: [{ draftNo: draftRef }, ...(isNaN(Number(draftRef)) ? [] : [{ id: BigInt(draftRef) }])],
      },
    });
    if (!draft) return { success: false };
    await this.prisma.merchantProductDraft.update({ where: { id: draft.id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // ====== 商家售后列表/详情 ======

  async listMerchantRefunds(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const status = Number(query.status);

    const where: Prisma.RefundApplyWhereInput = {
      merchantId: merchant.id,
      deletedAt: null,
      ...(Number.isFinite(status) && status > 0 ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { refundNo: { contains: keyword } },
              { order: { orderNo: { contains: keyword } } },
              { user: { nickname: { contains: keyword } } },
              { user: { mobile: { contains: keyword } } },
            ],
          }
        : {}),
    };

    const [total, refunds] = await Promise.all([
      this.prisma.refundApply.count({ where }),
      this.prisma.refundApply.findMany({
        where,
        include: {
          user: true,
          order: true,
          orderItem: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: refunds.map((r) => ({
        refundNo: r.refundNo,
        orderNo: r.order.orderNo,
        buyer: {
          userId: this.toNumber(r.user.id),
          nickname: r.user.nickname ?? '买家',
          avatarUrl: r.user.avatarUrl ?? '',
          mobile: r.user.mobile ?? '',
        },
        item: {
          productId: this.toNumber(r.orderItem.productId),
          skuId: this.toNumber(r.orderItem.skuId),
          title: r.orderItem.productTitle,
          skuName: r.orderItem.skuName,
          coverUrl: r.orderItem.productImage,
          quantity: r.orderItem.quantity,
          price: this.toMoney(r.orderItem.unitPrice),
        },
        applyType: r.applyType,
        applyReason: r.applyReason,
        applyImages: r.applyImages ?? [],
        refundAmount: this.toMoney(r.refundAmount),
        status: r.status,
        statusLabel: this.getRefundStatusLabel(r.status),
        merchantRemark: r.merchantRemark,
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt?.toISOString() ?? null,
      })),
    };
  }

  async getMerchantRefundDetail(authUser: AuthUser, refundNo: string) {
    const merchant = await this.ensureCurrentMerchant(authUser);

    const r = await this.prisma.refundApply.findFirst({
      where: {
        merchantId: merchant.id,
        refundNo,
        deletedAt: null,
      },
      include: {
        user: true,
        order: true,
        orderItem: true,
      },
    });

    if (!r) {
      throw new NotFoundException('退款申请不存在');
    }

    return {
      refundNo: r.refundNo,
      orderNo: r.order.orderNo,
      buyer: {
        userId: this.toNumber(r.user.id),
        nickname: r.user.nickname ?? '买家',
        avatarUrl: r.user.avatarUrl ?? '',
        mobile: r.user.mobile ?? '',
      },
      item: {
        productId: this.toNumber(r.orderItem.productId),
        skuId: this.toNumber(r.orderItem.skuId),
        title: r.orderItem.productTitle,
        skuName: r.orderItem.skuName,
        coverUrl: r.orderItem.productImage,
        quantity: r.orderItem.quantity,
        price: this.toMoney(r.orderItem.unitPrice),
      },
      applyType: r.applyType,
      applyTypeLabel: r.applyType === 2 ? '退货退款' : '仅退款',
      applyReason: r.applyReason,
      applyImages: r.applyImages ?? [],
      refundAmount: this.toMoney(r.refundAmount),
      status: r.status,
      statusLabel: this.getRefundStatusLabel(r.status),
      merchantRemark: r.merchantRemark,
      createdAt: r.createdAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
      timeline: [
        { title: '买家提交退款', desc: r.createdAt.toISOString() },
        ...(r.processedAt ? [{ title: '商家已处理', desc: r.processedAt.toISOString() }] : []),
      ],
    };
  }

  // ====== 商家评价管理 ======

  async listMerchantReviews(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
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
    const merchant = await this.ensureCurrentMerchant(authUser);
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
    const merchant = await this.ensureCurrentMerchant(authUser);
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

  // ====== C端提交评价 ======

  async submitOrderReview(authUser: AuthUser, orderNo: string, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);

    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId: user.id, deletedAt: null },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.orderStatus !== PlatformDataService.ORDER_STATUS.COMPLETED) {
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

  // ====== 商家工作台/统计 ======

  async getMerchantWorkbench(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);

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

    // 7日趋势
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
    const merchant = await this.ensureCurrentMerchant(authUser);
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
    const merchant = await this.ensureCurrentMerchant(authUser);
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

  // ====== 促销价工具方法 ======

  computeDisplayPrice(sku: { price: Prisma.Decimal; promotionPrice?: Prisma.Decimal | null; promotionStartAt?: Date | null; promotionEndAt?: Date | null }): string {
    const now = this.now();
    if (sku.promotionPrice && sku.promotionStartAt && sku.promotionEndAt) {
      if (now >= sku.promotionStartAt && now <= sku.promotionEndAt) {
        return this.toMoney(sku.promotionPrice);
      }
    }
    return this.toMoney(sku.price);
  }

  getDisplayPriceSplit(sku: { price: Prisma.Decimal; promotionPrice?: Prisma.Decimal | null; promotionStartAt?: Date | null; promotionEndAt?: Date | null }) {
    const now = this.now();
    const hasPromotion = !!(sku.promotionPrice && sku.promotionStartAt && sku.promotionEndAt && now >= sku.promotionStartAt && now <= sku.promotionEndAt);
    return {
      displayPrice: hasPromotion ? this.toMoney(sku.promotionPrice!) : this.toMoney(sku.price),
      hasPromotion,
      originalPrice: hasPromotion ? this.toMoney(sku.price) : undefined,
      promotionPrice: hasPromotion ? this.toMoney(sku.promotionPrice!) : undefined,
      promotionEndAt: hasPromotion ? sku.promotionEndAt?.toISOString() : undefined,
    };
  }

  // ====== 配送设置 ======

  async getMerchantDeliverySettings(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: `merchant_delivery_${merchant.id}` } });
    if (setting) {
      try { return JSON.parse(setting.value); } catch { /* fall through */ }
    }
    return {
      senderName: merchant.storeName,
      senderMobile: merchant.contactMobile,
      senderAddress: '',
      defaultCompany: '顺丰速运',
      coldChainEnabled: false,
      restrictedRegions: [] as string[],
    };
  }

  async saveMerchantDeliverySettings(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    await this.prisma.systemSetting.upsert({
      where: { key: `merchant_delivery_${merchant.id}` },
      create: { key: `merchant_delivery_${merchant.id}`, value: JSON.stringify(body) },
      update: { value: JSON.stringify(body) },
    });
    return { success: true };
  }

  async listMerchantFreightTemplates(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const rules = await this.prisma.logisticsRule.findMany({ orderBy: { createdAt: 'desc' } });
    return rules.map((r) => ({
      id: this.toNumber(r.id),
      name: r.name,
      province: r.province,
      thresholdAmount: this.toMoney(r.thresholdAmount),
      freightAmount: this.toMoney(r.freightAmount),
      active: r.active,
    }));
  }

  async createMerchantFreightTemplate(authUser: AuthUser, body: Record<string, unknown>) {
    await this.ensureCurrentMerchant(authUser);
    const rule = await this.prisma.logisticsRule.create({
      data: {
        name: String(body.name ?? ''),
        province: String(body.province ?? '全国'),
        thresholdAmount: new Prisma.Decimal(String(body.thresholdAmount ?? '0')),
        freightAmount: new Prisma.Decimal(String(body.freightAmount ?? '0')),
        active: Boolean(body.active ?? true),
      },
    });
    return { id: this.toNumber(rule.id), success: true };
  }

  async updateMerchantFreightTemplate(authUser: AuthUser, templateId: number, body: Record<string, unknown>) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.logisticsRule.update({
      where: { id: BigInt(templateId) },
      data: {
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.province !== undefined ? { province: String(body.province) } : {}),
        ...(body.thresholdAmount !== undefined ? { thresholdAmount: new Prisma.Decimal(String(body.thresholdAmount)) } : {}),
        ...(body.freightAmount !== undefined ? { freightAmount: new Prisma.Decimal(String(body.freightAmount)) } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      },
    });
    return { success: true };
  }

  async deleteMerchantFreightTemplate(authUser: AuthUser, templateId: number) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.logisticsRule.delete({ where: { id: BigInt(templateId) } }).catch(() => {});
    return { success: true };
  }

  // ====== 通知中心 ======

  async listMerchantNotices(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    // 通知来自系统消息 + 订单/退款事件，暂时返回空列表
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);

    const notices = await this.prisma.systemMessage.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { senderType: 'SYSTEM' },
          { senderType: 'ADMIN' },
        ],
      },
      include: {
        receipts: {
          where: { userId: merchant.userId },
          select: { isRead: true, readAt: true },
        },
      },
      orderBy: { publishAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await this.prisma.systemMessage.count({
      where: { status: 'PUBLISHED', OR: [{ senderType: 'SYSTEM' }, { senderType: 'ADMIN' }] },
    });

    return {
      page,
      pageSize,
      total,
      items: notices.map((n) => ({
        id: this.toNumber(n.id),
        type: n.bizType || 'SYSTEM',
        typeLabel: n.bizType === 'ORDER' ? '订单公告' : n.bizType === 'REFUND' ? '退款公告' : n.bizType === 'AUDIT' ? '审核公告' : '系统公告',
        title: n.title,
        content: n.summary || n.title,
        read: n.receipts[0]?.isRead ?? false,
        orderNo: n.bizId || undefined,
        createdAt: n.publishAt.toISOString(),
      })),
    };
  }

  async getMerchantNoticeDetail(authUser: AuthUser, noticeId: number) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const notice = await this.prisma.systemMessage.findUnique({ where: { id: BigInt(noticeId) } });
    if (!notice) throw new NotFoundException('公告不存在');
    // 自动标记已读
    await this.prisma.userMessage.upsert({
      where: { userId_messageId: { userId: merchant.userId, messageId: BigInt(noticeId) } },
      create: { userId: merchant.userId, messageId: BigInt(noticeId), isRead: true, readAt: this.now() },
      update: { isRead: true, readAt: this.now() },
    });
    return {
      id: this.toNumber(notice.id),
      type: notice.bizType || 'SYSTEM',
      typeLabel: notice.bizType === 'ORDER' ? '订单公告' : '系统公告',
      title: notice.title,
      content: notice.contentJson ?? notice.summary ?? '',
      read: true,
      createdAt: notice.publishAt.toISOString(),
    };
  }

  async markMerchantNoticeRead(authUser: AuthUser, noticeId: number) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    await this.prisma.userMessage.upsert({
      where: { userId_messageId: { userId: merchant.userId, messageId: BigInt(noticeId) } },
      create: { userId: merchant.userId, messageId: BigInt(noticeId), isRead: true, readAt: this.now() },
      update: { isRead: true, readAt: this.now() },
    });
    return { success: true };
  }

  async markAllMerchantNoticesRead(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const unread = await this.prisma.userMessage.findMany({
      where: { userId: merchant.userId, isRead: false },
      select: { messageId: true },
    });
    if (unread.length) {
      await this.prisma.userMessage.updateMany({
        where: { userId: merchant.userId, messageId: { in: unread.map((u) => u.messageId) } },
        data: { isRead: true, readAt: this.now() },
      });
    }
    return { success: true };
  }

  // ====== 安全设置 ======

  async getMerchantSecurity(authUser: AuthUser) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: (await this.ensureCurrentMerchant(authUser)).id },
      include: { user: true },
    });
    if (!merchant) throw new NotFoundException('商户不存在');
    return {
      contactMobile: merchant.contactMobile,
      bindWechat: true,
      lastLoginAt: merchant.user.lastLoginAt?.toISOString() ?? '',
    };
  }

  async updateMerchantSecurity(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    if (typeof body.contactMobile === 'string' && body.contactMobile.trim()) {
      await this.prisma.merchant.update({ where: { id: merchant.id }, data: { contactMobile: body.contactMobile.trim() } });
    }
    return { success: true };
  }

  // ====== 资质管理 ======

  async listMerchantQualifications(authUser: AuthUser) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const quals = await this.prisma.merchantQualification.findMany({ where: { merchantId: merchant.id } });
    return quals.map((q) => ({
      id: this.toNumber(q.id),
      qualificationType: q.qualificationType,
      fileName: q.fileName,
      fileUrl: q.fileUrl,
      status: q.status,
      auditRemark: q.auditRemark,
    }));
  }

  async createMerchantQualification(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const q = await this.prisma.merchantQualification.create({
      data: {
        merchantId: merchant.id,
        qualificationType: String(body.qualificationType ?? ''),
        fileName: String(body.fileName ?? ''),
        fileUrl: String(body.fileUrl ?? ''),
        status: 2,
      },
    });
    return { id: this.toNumber(q.id), success: true };
  }

  async updateMerchantQualification(authUser: AuthUser, qualificationId: number, body: Record<string, unknown>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    await this.prisma.merchantQualification.updateMany({
      where: { id: BigInt(qualificationId), merchantId: merchant.id },
      data: {
        ...(body.qualificationType !== undefined ? { qualificationType: String(body.qualificationType) } : {}),
        ...(body.fileName !== undefined ? { fileName: String(body.fileName) } : {}),
        ...(body.fileUrl !== undefined ? { fileUrl: String(body.fileUrl) } : {}),
      },
    });
    return { success: true };
  }

  async deleteMerchantQualification(authUser: AuthUser, qualificationId: number) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    await this.prisma.merchantQualification.deleteMany({ where: { id: BigInt(qualificationId), merchantId: merchant.id } });
    return { success: true };
  }

  // ====== SKU 管理 ======

  async listMerchantProductSkus(authUser: AuthUser, productId: number) {
    await this.ensureCurrentMerchant(authUser);
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
    const merchant = await this.ensureCurrentMerchant(authUser);
    const product = await this.prisma.product.findFirst({ where: { id: BigInt(productId), merchantId: merchant.id } });
    if (!product) throw new NotFoundException('商品不存在');
    const skuCode = `SKU${Date.now()}${Math.random().toString(36).slice(2, 4)}`;
    const sku = await this.prisma.productSku.create({
      data: {
        productId: BigInt(productId),
        skuName: String(body.skuName ?? '默认规格'),
        skuCode,
        imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        specJson: body.specJson as any ?? {},
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
    await this.ensureCurrentMerchant(authUser);
    const data: Record<string, unknown> = {};
    if (body.skuName !== undefined) data.skuName = String(body.skuName);
    if (body.imageUrl !== undefined) data.imageUrl = String(body.imageUrl);
    if (body.price !== undefined) data.price = new Prisma.Decimal(String(body.price));
    if (body.originalPrice !== undefined) data.originalPrice = new Prisma.Decimal(String(body.originalPrice));
    if (body.stock !== undefined) data.stock = Number(body.stock);
    if (body.safetyStock !== undefined) data.safetyStock = Number(body.safetyStock);
    if (body.specJson !== undefined) data.specJson = body.specJson as any;
    if (Object.keys(data).length) {
      await this.prisma.productSku.update({ where: { id: BigInt(skuId) }, data: data as any });
    }
    return { success: true };
  }

  async updateMerchantSkuStatus(authUser: AuthUser, skuId: number, body: Record<string, unknown>) {
    await this.ensureCurrentMerchant(authUser);
    const status = String(body.status ?? 'ENABLED') === 'DISABLED' ? 2 : 1;
    await this.prisma.productSku.update({ where: { id: BigInt(skuId) }, data: { status } });
    return { success: true };
  }

  async deleteMerchantSku(authUser: AuthUser, skuId: number) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.productSku.update({ where: { id: BigInt(skuId) }, data: { deletedAt: this.now() } });
    return { success: true };
  }

  async batchUpdateMerchantSkus(authUser: AuthUser, productId: number, body: Record<string, unknown>) {
    await this.ensureCurrentMerchant(authUser);
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

  // ====== 活动完整操作 ======

  async getMerchantActivityDetail(authUser: AuthUser, activityId: number) {
    const merchant = await this.ensureCurrentMerchant(authUser);
    const activity = await this.prisma.activity.findFirst({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');
    const ruleJson =
      activity.ruleJson && typeof activity.ruleJson === 'object' && !Array.isArray(activity.ruleJson)
        ? (activity.ruleJson as Record<string, unknown>)
        : {};
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

  async publishMerchantActivity(authUser: AuthUser, activityId: number) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'PUBLISHED' } });
    return { success: true };
  }

  async pauseMerchantActivity(authUser: AuthUser, activityId: number) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'PAUSED' } });
    return { success: true };
  }

  async finishMerchantActivity(authUser: AuthUser, activityId: number) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.activity.update({ where: { id: BigInt(activityId) }, data: { status: 'ENDED' } });
    return { success: true };
  }

  async copyMerchantActivity(authUser: AuthUser, activityId: number) {
    const merchant = await this.ensureCurrentMerchant(authUser);
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

  async getMerchantActivityStatistics(authUser: AuthUser, activityId: number) {
    await this.ensureCurrentMerchant(authUser);
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

  async getMerchantActivityProductCandidates(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.ensureCurrentMerchant(authUser);
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

  async listMerchantActivityDrafts(authUser: AuthUser, query: Record<string, string>) {
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

  async createMerchantActivityDraft(authUser: AuthUser, body: Record<string, unknown>) {
    const products = Array.isArray(body.products)
      ? body.products.filter((item) => item && typeof item === 'object')
      : [];
    const ruleJson =
      body.ruleJson && typeof body.ruleJson === 'object' && !Array.isArray(body.ruleJson)
        ? (body.ruleJson as Record<string, unknown>)
        : {};
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

  async publishMerchantActivityDraft(authUser: AuthUser, draftId: string) {
    await this.ensureCurrentMerchant(authUser);
    const id = BigInt(Number(draftId));
    await this.prisma.activity.update({ where: { id }, data: { status: 'PUBLISHED' } });
    return { success: true };
  }

  async deleteMerchantActivityDraft(authUser: AuthUser, draftId: number) {
    await this.ensureCurrentMerchant(authUser);
    await this.prisma.activity.delete({ where: { id: BigInt(draftId) } }).catch(() => {});
    return { success: true };
  }

  // ====== 后台活动操作 ======

  async getAdminActivityDetail(activityId: number) {
    const activity = await this.prisma.activity.findUnique({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');
    const activityRule =
      activity.ruleJson && typeof activity.ruleJson === 'object' && !Array.isArray(activity.ruleJson)
        ? (activity.ruleJson as Record<string, unknown>)
        : {};
    const activityProducts = Array.isArray(activity.productsJson) ? activity.productsJson : [];
    const coupon = activity.activityType === 'CASHBACK'
      ? await this.prisma.coupon.findFirst({
          where: { name: activity.activityName, deletedAt: null },
        })
      : null;
    const couponRule =
      coupon?.ruleJson && typeof coupon.ruleJson === 'object' && !Array.isArray(coupon.ruleJson)
        ? (coupon.ruleJson as Record<string, unknown>)
        : {};
    return {
      activityId: this.toNumber(activity.id),
      id: this.toNumber(activity.id),
      title: activity.activityName,
      activityName: activity.activityName,
      activityType: activity.activityType,
      status: activity.status,
      startAt: this.formatChinaDateTime(activity.startAt),
      endAt: this.formatChinaDateTime(activity.endAt),
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

  async publishAdminActivity(authUser: AuthUser, activityId: number) {
    const activity = await this.prisma.activity.findUnique({ where: { id: BigInt(activityId) } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (!activity.startAt || !activity.endAt) {
      throw new BadRequestException('活动开始时间和结束时间不能为空，请先编辑活动补充时间');
    }
    const updated = await this.prisma.activity.update({
      where: { id: BigInt(activityId) },
      data: { status: 'PUBLISHED' },
    });
    if (updated.activityType === 'SECKILL') {
      await this.syncSeckillActivityToFlashSale(updated);
    }
    if (updated.activityType === 'GROUP_BUY') {
      await this.syncGroupBuyActivityToProducts(updated);
    }
    return { success: true };
  }

  async pauseAdminActivity(authUser: AuthUser, activityId: number) {
    const updated = await this.prisma.activity.update({
      where: { id: BigInt(activityId) },
      data: { status: 'PAUSED' },
    });
    if (updated.activityType === 'SECKILL') {
      await this.syncSeckillActivityToFlashSale(updated);
    }
    if (updated.activityType === 'GROUP_BUY') {
      await this.syncGroupBuyActivityToProducts(updated);
    }
    return { success: true };
  }

  async finishAdminActivity(authUser: AuthUser, activityId: number) {
    const updated = await this.prisma.activity.update({
      where: { id: BigInt(activityId) },
      data: { status: 'ENDED' },
    });
    if (updated.activityType === 'SECKILL') {
      await this.syncSeckillActivityToFlashSale(updated);
    }
    if (updated.activityType === 'GROUP_BUY') {
      await this.syncGroupBuyActivityToProducts(updated);
    }
    return { success: true };
  }

  // ====== 后台商品强制下架/恢复 ======

  async takedownAdminProduct(productId: number, authUser: AuthUser, body: Record<string, unknown> = {}) {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: { merchant: true },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('商品不存在');
    }

    await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        status: 0,
        auditRemark: reason ? `【平台下架】${reason}` : product.auditRemark,
      },
    });

    if (product.merchant && reason) {
      const message = await this.prisma.systemMessage.create({
        data: {
          type: 'NOTIFICATION',
          title: '商品已被平台下架',
          summary: `您的商品「${product.title}」已被平台下架，原因：${reason}`,
          contentType: 'TEXT',
          contentJson: {
            productId,
            productTitle: product.title,
            reason,
            takedownAt: this.now().toISOString(),
          } as Prisma.InputJsonValue,
          senderType: 'SYSTEM',
          bizType: 'PRODUCT_TAKEDOWN',
          bizId: String(productId),
          publishAt: this.now(),
          status: 'PUBLISHED',
        },
      });
      await this.prisma.userMessage.create({
        data: {
          userId: product.merchant.userId,
          messageId: message.id,
          isRead: false,
          deliveredAt: this.now(),
        },
      });
    }

    await this.recordAdminOperation(authUser, 'TAKEDOWN_PRODUCT', '商品管理', BigInt(productId), {
      reason,
    });

    return { success: true, reason };
  }

  async restoreAdminProduct(productId: number, authUser: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { id: BigInt(productId) } });
    if (!product || product.deletedAt) {
      throw new NotFoundException('商品不存在');
    }
    if (product.auditStatus !== 2) {
      throw new BadRequestException('仅审核通过的商品可重新上架，请先完成审核');
    }

    await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        status: 1,
        auditRemark: '平台恢复上架',
      },
    });

    await this.recordAdminOperation(authUser, 'RESTORE_PRODUCT', '商品管理', BigInt(productId), {});

    return { success: true };
  }

  // ====== 后台商户启用/禁用/扣率 ======

  async enableMerchant(merchantId: number, authUser: AuthUser) {
    await this.prisma.merchant.update({ where: { id: BigInt(merchantId) }, data: { status: 1 } });
    return { success: true };
  }

  async disableMerchant(merchantId: number, authUser: AuthUser) {
    await this.prisma.merchant.update({ where: { id: BigInt(merchantId) }, data: { status: 0 } });
    return { success: true };
  }

  async updateMerchantCommissionRule(merchantId: number, body: Record<string, unknown>, authUser: AuthUser) {
    const rate = body.commissionRate !== undefined ? new Prisma.Decimal(String(body.commissionRate)) : undefined;
    if (rate) {
      await this.prisma.merchant.update({ where: { id: BigInt(merchantId) }, data: { commissionRate: rate } });
    }
    return { success: true };
  }

  // ====== 后台物流规则 ======

  async createLogisticsRule(body: Record<string, unknown>, authUser: AuthUser) {
    const rule = await this.prisma.logisticsRule.create({
      data: {
        name: String(body.name ?? '').trim() || '物流规则',
        province: String(body.province ?? '全国').trim() || '全国',
        thresholdAmount: new Prisma.Decimal(String(body.thresholdAmount ?? '0')),
        freightAmount: new Prisma.Decimal(String(body.freightAmount ?? '0')),
        active: body.active !== false && body.active !== 'false',
      },
    });

    if (body.isPublic === true || body.isPublic === 'true' || body.isPublic === 1) {
      await this.syncPublicFreightSettings(rule);
    }

    return {
      id: this.toNumber(rule.id),
      success: true,
      isPublic: body.isPublic === true || body.isPublic === 'true' || body.isPublic === 1,
    };
  }

  async updateLogisticsRule(templateId: number, body: Record<string, unknown>, authUser: AuthUser) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim() || '物流规则';
    if (body.province !== undefined) data.province = String(body.province).trim() || '全国';
    if (body.thresholdAmount !== undefined) data.thresholdAmount = new Prisma.Decimal(String(body.thresholdAmount));
    if (body.freightAmount !== undefined) data.freightAmount = new Prisma.Decimal(String(body.freightAmount));
    if (body.active !== undefined) data.active = body.active !== false && body.active !== 'false';

    const rule = Object.keys(data).length
      ? await this.prisma.logisticsRule.update({ where: { id: BigInt(templateId) }, data: data as any })
      : await this.prisma.logisticsRule.findUnique({ where: { id: BigInt(templateId) } });

    if (!rule) {
      throw new NotFoundException('物流规则不存在');
    }

    if (body.isPublic !== undefined) {
      const makePublic = body.isPublic === true || body.isPublic === 'true' || body.isPublic === 1;
      if (makePublic) {
        await this.syncPublicFreightSettings(rule);
      } else {
        const current = await this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightRuleId' } });
        if (Number(current?.value ?? 0) === templateId) {
          await this.syncPublicFreightSettings(null);
        }
      }
    } else {
      const current = await this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightRuleId' } });
      if (Number(current?.value ?? 0) === templateId) {
        await this.syncPublicFreightSettings(rule);
      }
    }

    return { success: true };
  }

  async deleteLogisticsRule(templateId: number, authUser: AuthUser) {
    const current = await this.prisma.systemSetting.findUnique({ where: { key: 'publicFreightRuleId' } });
    await this.prisma.logisticsRule.delete({ where: { id: BigInt(templateId) } }).catch(() => {});
    if (Number(current?.value ?? 0) === templateId) {
      await this.syncPublicFreightSettings(null);
    }
    return { success: true };
  }

  // ====== 后台退款详情 ======

  async getAdminRefundDetail(refundNo: string) {
    const refund = await this.prisma.refundApply.findUnique({
      where: { refundNo },
      include: { user: true, merchant: true, order: true },
    });
    if (!refund) throw new NotFoundException('退款申请不存在');
    const applyImages = this.normalizeRefundImages(refund.applyImages);
    return {
      refundNo: refund.refundNo,
      orderNo: refund.order.orderNo,
      userName: refund.user.nickname ?? refund.user.mobile ?? '用户',
      merchantName: refund.merchant.storeName,
      amount: this.toMoney(refund.refundAmount),
      applyType: refund.applyType,
      applyTypeLabel: refund.applyType === 2 ? '退货退款' : '仅退款',
      applyReason: refund.applyReason,
      applyImages,
      userEvidence: applyImages,
      status: this.getRefundStatusLabel(refund.status),
      statusText: this.getRefundStatusText(refund.status),
      statusCode: refund.status,
      statusLabel: this.getRefundStatusText(refund.status),
      merchantRemark: refund.merchantRemark,
      adminRemark: refund.adminRemark,
      createdAt: refund.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      processedAt: refund.processedAt?.toISOString().slice(0, 16).replace('T', ' ') ?? null,
    };
  }

  // ====== 物流公司 ======

  private getDefaultLogisticsCompanies() {
    return [
      { code: 'SF', name: '顺丰速运' },
      { code: 'JD', name: '京东物流' },
      { code: 'YT', name: '圆通快递' },
      { code: 'ZTO', name: '中通快递' },
      { code: 'STO', name: '申通快递' },
      { code: 'YUNDA', name: '韵达快递' },
      { code: 'EMS', name: 'EMS' },
    ];
  }

  private normalizeLogisticsCompanies(raw: unknown): Array<{ code: string; name: string }> {
    const defaults = this.getDefaultLogisticsCompanies();
    if (!Array.isArray(raw)) {
      return defaults;
    }
    const items = raw
      .map((item, index) => {
        if (typeof item === 'string') {
          const name = item.trim();
          if (!name) return null;
          return {
            code: `C${index + 1}`,
            name,
          };
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const name = String(record.name ?? record.label ?? '').trim();
          if (!name) return null;
          const codeRaw = String(record.code ?? '').trim().toUpperCase();
          return {
            code: codeRaw || `C${index + 1}`,
            name,
          };
        }
        return null;
      })
      .filter((item): item is { code: string; name: string } => item != null);

    return items.length ? items : defaults;
  }

  async getLogisticsCompanies() {
    await this.withSeed();
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'logisticsCompanies' },
    });
    if (!setting?.value) {
      return this.getDefaultLogisticsCompanies();
    }
    try {
      return this.normalizeLogisticsCompanies(JSON.parse(setting.value));
    } catch {
      return this.getDefaultLogisticsCompanies();
    }
  }
}
