import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { RoleCode } from '../enums/role.enum';
import { AuthUser } from '../types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { buildFallbackNickname } from '../utils/profile';

const LEADER_STATUS_LABELS: Record<string, string> = {
  NOT_APPLIED: '未申请',
  PENDING_AUDIT: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  DISABLED: '已禁用',
};

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING_SETTLEMENT: '待结算',
  SETTLED: '已结算',
  CANCELLED: '已取消',
};

@Injectable()
export class LeaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  private toNumber(value: bigint | number | null | undefined): number {
    if (value == null) return 0;
    return Number(value);
  }

  private toMoney(value: Prisma.Decimal | number | string | null | undefined): string {
    if (value == null) return '0.00';
    return Number(value).toFixed(2);
  }

  private normalizePage(value: string | number | null | undefined): number {
    const page = Number(value ?? 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private normalizePageSize(value: string | number | null | undefined): number {
    const size = Number(value ?? 20);
    if (!Number.isFinite(size) || size <= 0) return 20;
    return Math.min(Math.floor(size), 100);
  }

  private resolvePublicUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return this.objectStorageService.buildPublicObjectUrl(url.replace(/^\/+/, ''));
  }

  private async ensureUser(authUser: AuthUser) {
    if (
      authUser.role !== RoleCode.USER
      && authUser.role !== RoleCode.GUEST
      && authUser.role !== RoleCode.MERCHANT
      && authUser.role !== RoleCode.LEADER
    ) {
      throw new UnauthorizedException('Admin session cannot access user data');
    }

    const user = await this.prisma.user.findUnique({ where: { openid: authUser.sub } });
    if (!user || user.status !== 1) {
      throw new ForbiddenException('User account is unavailable');
    }
    return user;
  }

  private async requireApprovedLeader(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);
    const leader = await this.prisma.communityLeader.findFirst({
      where: { userId: user.id, status: 'APPROVED', deletedAt: null },
    });
    if (!leader) {
      throw new ForbiddenException('您还不是已通过审核的团长');
    }
    return { user, leader };
  }

  private resolveAdminUserId(authUser?: AuthUser): bigint | null {
    if (!authUser?.sub?.startsWith('admin_')) return null;
    const id = Number(authUser.sub.replace('admin_', ''));
    return Number.isFinite(id) && id > 0 ? BigInt(id) : null;
  }

  private mapApplication(leader: {
    id: bigint;
    status: string;
    realName: string;
    mobile: string;
    idCardNo: string | null;
    businessCertUrl: string | null;
    idCardFrontUrl: string | null;
    idCardBackUrl: string | null;
    rejectReason: string | null;
    createdAt: Date;
    auditedAt: Date | null;
  } | null) {
    if (!leader) {
      return {
        id: 0,
        status: 'NOT_APPLIED',
        statusLabel: LEADER_STATUS_LABELS.NOT_APPLIED,
        realName: '',
        idCardNo: '',
        mobile: '',
        businessCertUrl: '',
        idCardFrontUrl: '',
        idCardBackUrl: '',
        rejectRemark: '',
      };
    }

    return {
      id: this.toNumber(leader.id),
      status: leader.status,
      statusLabel: LEADER_STATUS_LABELS[leader.status] ?? leader.status,
      realName: leader.realName,
      idCardNo: leader.idCardNo ?? '',
      mobile: leader.mobile,
      businessCertUrl: this.resolvePublicUrl(leader.businessCertUrl),
      idCardFrontUrl: this.resolvePublicUrl(leader.idCardFrontUrl),
      idCardBackUrl: this.resolvePublicUrl(leader.idCardBackUrl),
      rejectRemark: leader.rejectReason ?? '',
      createdAt: leader.createdAt.toISOString(),
      auditAt: leader.auditedAt?.toISOString(),
    };
  }

  private mapAdminLeader(
    leader: Prisma.CommunityLeaderGetPayload<{
      include: {
        user: { select: { id: true; nickname: true; mobile: true; openid: true; avatarUrl: true } };
        pickupPoints: { where: { deletedAt: null } };
        _count: { select: { pickupPoints: true } };
      };
    }>,
  ) {
    return {
      id: this.toNumber(leader.id),
      userId: this.toNumber(leader.userId),
      applicationNo: leader.applicationNo,
      realName: leader.realName,
      mobile: leader.mobile,
      idCardNo: leader.idCardNo,
      idCardFrontUrl: this.resolvePublicUrl(leader.idCardFrontUrl),
      idCardBackUrl: this.resolvePublicUrl(leader.idCardBackUrl),
      businessCertUrl: this.resolvePublicUrl(leader.businessCertUrl),
      status: leader.status,
      rejectReason: leader.rejectReason,
      commissionRate: Number(leader.commissionRate),
      auditedBy: leader.auditedBy != null ? this.toNumber(leader.auditedBy) : null,
      auditedAt: leader.auditedAt?.toISOString() ?? null,
      createdAt: leader.createdAt.toISOString(),
      updatedAt: leader.updatedAt.toISOString(),
      pickupPointCount: leader._count.pickupPoints,
      user: leader.user
        ? {
            id: this.toNumber(leader.user.id),
            nickname: leader.user.nickname ?? buildFallbackNickname(leader.user.openid, '微信用户'),
            mobile: leader.user.mobile,
            openid: leader.user.openid,
            avatarUrl: this.resolvePublicUrl(leader.user.avatarUrl),
          }
        : null,
      pickupPoints: leader.pickupPoints.map((point) => this.mapAdminPickupPoint(point, leader)),
    };
  }

  private mapAdminPickupPoint(
    point: Prisma.PickupPointGetPayload<{ include: { leader: true } }> | Prisma.PickupPointGetPayload<Record<string, never>>,
    leaderFallback?: { id: bigint; realName: string; mobile: string } | null,
  ) {
    const leader = 'leader' in point ? point.leader : leaderFallback ?? null;
    return {
      id: this.toNumber(point.id),
      leaderId: point.leaderId != null ? this.toNumber(point.leaderId) : null,
      name: point.name,
      contactName: point.contactName,
      contactMobile: point.contactMobile,
      province: point.province,
      city: point.city,
      district: point.district,
      detailAddress: point.detailAddress,
      storePhoto: this.resolvePublicUrl(point.storePhoto),
      description: point.description,
      longitude: point.longitude != null ? Number(point.longitude) : null,
      latitude: point.latitude != null ? Number(point.latitude) : null,
      businessHours: point.businessHours,
      status: point.status,
      source: point.source,
      createdAt: point.createdAt.toISOString(),
      updatedAt: point.updatedAt.toISOString(),
      leader: leader
        ? {
            id: this.toNumber(leader.id),
            realName: leader.realName,
            mobile: leader.mobile,
          }
        : null,
    };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private formatDistance(km: number): string {
    if (km < 1) return `${Math.max(Math.round(km * 1000), 1)}m`;
    return `${km.toFixed(1)}km`;
  }

  async seedDemoDataIfEmpty() {
    const count = await this.prisma.communityLeader.count({ where: { deletedAt: null } });
    if (count > 0) return;

    const user = await this.prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
    if (!user) return;

    const leader = await this.prisma.communityLeader.create({
      data: {
        userId: user.id,
        applicationNo: `LA${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        realName: '示例团长',
        mobile: user.mobile ?? '13800000000',
        status: 'APPROVED',
        commissionRate: new Prisma.Decimal('0.05'),
        auditedAt: new Date(),
      },
    });

    await this.prisma.pickupPoint.create({
      data: {
        leaderId: leader.id,
        name: '浔源农仓社区自提点',
        contactName: leader.realName,
        contactMobile: leader.mobile,
        province: '广东省',
        city: '广州市',
        district: '天河区',
        detailAddress: '示例路 88 号',
        latitude: new Prisma.Decimal('23.1291'),
        longitude: new Prisma.Decimal('113.2644'),
        businessHours: '09:00-21:00',
        status: 'ENABLED',
        source: 'ADMIN',
        description: '平台默认演示自提点',
      },
    });
  }

  async getApplication(authUser: AuthUser) {
    await this.seedDemoDataIfEmpty();
    const user = await this.ensureUser(authUser);
    const leader = await this.prisma.communityLeader.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return this.mapApplication(leader);
  }

  async applyLeader(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const realName = String(body.realName ?? '').trim();
    const mobile = String(body.mobile ?? '').trim();
    const idCardNo = String(body.idCardNo ?? '').trim();
    if (!realName || !mobile) {
      throw new BadRequestException('请填写姓名和手机号');
    }

    const existing = await this.prisma.communityLeader.findFirst({
      where: { userId: user.id, deletedAt: null },
    });
    if (existing?.status === 'PENDING_AUDIT') {
      throw new BadRequestException('申请审核中，请勿重复提交');
    }
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('您已是团长，无需重复申请');
    }

    const payload = {
      realName,
      mobile,
      idCardNo: idCardNo || null,
      businessCertUrl: String(body.businessCertUrl ?? '') || null,
      idCardFrontUrl: String(body.idCardFrontUrl ?? '') || null,
      idCardBackUrl: String(body.idCardBackUrl ?? '') || null,
      status: 'PENDING_AUDIT',
      rejectReason: null,
    };

    const leader = existing
      ? await this.prisma.communityLeader.update({
          where: { id: existing.id },
          data: payload,
        })
      : await this.prisma.communityLeader.create({
          data: {
            userId: user.id,
            applicationNo: `LA${randomUUID().replace(/-/g, '').slice(0, 12)}`,
            ...payload,
          },
        });

    await this.prisma.leaderApplication.create({
      data: {
        userId: user.id,
        applicationNo: leader.applicationNo,
        status: 'PENDING_AUDIT',
        inputJson: body as Prisma.InputJsonValue,
      },
    });

    return this.mapApplication(leader);
  }

  async updateApplication(authUser: AuthUser, body: Record<string, unknown>) {
    const user = await this.ensureUser(authUser);
    const leader = await this.prisma.communityLeader.findFirst({
      where: { userId: user.id, deletedAt: null },
    });
    if (!leader) {
      throw new NotFoundException('未找到团长申请');
    }
    if (!['REJECTED', 'PENDING_AUDIT'].includes(leader.status)) {
      throw new BadRequestException('当前状态不可修改申请');
    }

    const updated = await this.prisma.communityLeader.update({
      where: { id: leader.id },
      data: {
        realName: body.realName != null ? String(body.realName).trim() : leader.realName,
        mobile: body.mobile != null ? String(body.mobile).trim() : leader.mobile,
        idCardNo: body.idCardNo != null ? String(body.idCardNo).trim() : leader.idCardNo,
        businessCertUrl: body.businessCertUrl != null ? String(body.businessCertUrl) : leader.businessCertUrl,
        idCardFrontUrl: body.idCardFrontUrl != null ? String(body.idCardFrontUrl) : leader.idCardFrontUrl,
        idCardBackUrl: body.idCardBackUrl != null ? String(body.idCardBackUrl) : leader.idCardBackUrl,
        status: 'PENDING_AUDIT',
        rejectReason: null,
      },
    });

    return this.mapApplication(updated);
  }

  async bindLeader(authUser: AuthUser, leaderId: number) {
    const user = await this.ensureUser(authUser);
    const leader = await this.prisma.communityLeader.findFirst({
      where: { id: BigInt(leaderId), status: 'APPROVED', deletedAt: null },
    });
    if (!leader) {
      throw new NotFoundException('团长不存在或未通过审核');
    }

    const binding = await this.prisma.leaderBinding.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        leaderId: leader.id,
        bindingNo: `LB${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        status: 'BOUND',
      },
      update: {
        leaderId: leader.id,
        status: 'BOUND',
      },
    });

    return {
      leaderId: this.toNumber(leader.id),
      bound: true,
      bindingNo: binding.bindingNo,
    };
  }

  async listAppPickupPoints(query: Record<string, string>) {
    await this.seedDemoDataIfEmpty();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const latitude = query.latitude ? Number(query.latitude) : null;
    const longitude = query.longitude ? Number(query.longitude) : null;

    const where: Prisma.PickupPointWhereInput = {
      deletedAt: null,
      status: 'ENABLED',
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { detailAddress: { contains: keyword, mode: 'insensitive' } },
              { city: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, points] = await Promise.all([
      this.prisma.pickupPoint.count({ where }),
      this.prisma.pickupPoint.findMany({
        where,
        include: { leader: true },
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = points.map((point) => {
      const lat = point.latitude != null ? Number(point.latitude) : 0;
      const lng = point.longitude != null ? Number(point.longitude) : 0;
      const distance =
        latitude != null && longitude != null && lat && lng
          ? this.haversineKm(latitude, longitude, lat, lng)
          : undefined;
      return {
        id: this.toNumber(point.id),
        leaderId: point.leaderId != null ? this.toNumber(point.leaderId) : 0,
        storeName: point.name,
        storeAddress: [point.province, point.city, point.district, point.detailAddress].filter(Boolean).join(''),
        storePhoto: this.resolvePublicUrl(point.storePhoto),
        latitude: lat,
        longitude: lng,
        distance,
        distanceLabel: distance != null ? this.formatDistance(distance) : undefined,
        leaderName: point.leader?.realName ?? point.contactName ?? '',
        leaderPhone: point.leader?.mobile ?? point.contactMobile ?? '',
        businessHours: point.businessHours ?? '',
        status: point.status === 'ENABLED' ? 1 : 0,
      };
    });

    if (latitude != null && longitude != null) {
      items.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    }

    return { page, pageSize, total, items };
  }

  async getAppPickupPointDetail(pickupPointId: number) {
    const point = await this.prisma.pickupPoint.findFirst({
      where: { id: BigInt(pickupPointId), deletedAt: null },
      include: { leader: true },
    });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    return this.mapAppPickupPointDetail(point);
  }

  async getMyPickupPoint(authUser: AuthUser) {
    const { leader } = await this.requireApprovedLeader(authUser);
    const point = await this.prisma.pickupPoint.findFirst({
      where: { leaderId: leader.id, deletedAt: null },
      include: { leader: true },
      orderBy: { id: 'asc' },
    });
    if (!point) {
      return null;
    }
    return this.mapAppPickupPointDetail(point);
  }

  async upsertMyPickupPoint(authUser: AuthUser, body: Record<string, unknown>) {
    const { leader } = await this.requireApprovedLeader(authUser);
    const name = String(body.storeName ?? body.name ?? '').trim();
    const province = String(body.province ?? '').trim();
    const city = String(body.city ?? '').trim();
    const detailAddress = String(body.detailAddress ?? '').trim();
    if (!name || !province || !city || !detailAddress) {
      throw new BadRequestException('请填写自提点名称、地区和详细地址');
    }

    const data = {
      name,
      contactName: leader.realName,
      contactMobile: leader.mobile,
      province,
      city,
      district: body.district != null ? String(body.district).trim() : null,
      detailAddress,
      longitude: body.longitude != null ? new Prisma.Decimal(Number(body.longitude)) : null,
      latitude: body.latitude != null ? new Prisma.Decimal(Number(body.latitude)) : null,
      businessHours: body.businessHours != null ? String(body.businessHours).trim() : null,
      storePhoto: body.storePhoto != null ? String(body.storePhoto) : null,
      description: body.description != null ? String(body.description) : null,
      status: 'ENABLED',
      source: 'LEADER',
    };

    const existing = await this.prisma.pickupPoint.findFirst({
      where: { leaderId: leader.id, deletedAt: null },
    });

    if (existing) {
      const updated = await this.prisma.pickupPoint.update({
        where: { id: existing.id },
        data,
        include: { leader: true },
      });
      return this.mapAppPickupPointDetail(updated);
    }

    const created = await this.prisma.pickupPoint.create({
      data: {
        ...data,
        leaderId: leader.id,
      },
      include: { leader: true },
    });
    return this.mapAppPickupPointDetail(created);
  }

  private mapAppPickupPointDetail(
    point: Prisma.PickupPointGetPayload<{ include: { leader: true } }>,
  ) {
    return {
      id: this.toNumber(point.id),
      leaderId: point.leaderId != null ? this.toNumber(point.leaderId) : 0,
      storeName: point.name,
      storeAddress: [point.province, point.city, point.district, point.detailAddress].filter(Boolean).join(''),
      storePhoto: this.resolvePublicUrl(point.storePhoto),
      latitude: point.latitude != null ? Number(point.latitude) : 0,
      longitude: point.longitude != null ? Number(point.longitude) : 0,
      leaderName: point.leader?.realName ?? point.contactName ?? '',
      leaderPhone: point.leader?.mobile ?? point.contactMobile ?? '',
      businessHours: point.businessHours ?? '',
      status: point.status === 'ENABLED' ? 1 : 0,
      description: point.description ?? '',
      province: point.province,
      city: point.city,
      district: point.district ?? '',
      detailAddress: point.detailAddress,
      createdAt: point.createdAt.toISOString(),
    };
  }

  async getDashboard(authUser: AuthUser) {
    const { leader } = await this.requireApprovedLeader(authUser);
    const leaderId = leader.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [orders, commissions, pendingPickupCount] = await Promise.all([
      this.prisma.order.findMany({
        where: { leaderId, deletedAt: null, isParent: false, payStatus: 1 },
        include: { user: true, items: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.leaderCommission.findMany({
        where: { leaderId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.order.count({
        where: { leaderId, deletedAt: null, isParent: false, pickupStatus: 'PENDING', payStatus: 1 },
      }),
    ]);

    const totalCommission = commissions.reduce((sum, item) => sum + Number(item.commissionAmount), 0);
    const todayOrders = orders.filter((item) => item.createdAt >= todayStart);
    const todayCommission = commissions
      .filter((item) => item.createdAt >= todayStart)
      .reduce((sum, item) => sum + Number(item.commissionAmount), 0);
    const pendingSettlement = commissions
      .filter((item) => item.status === 'PENDING_SETTLEMENT')
      .reduce((sum, item) => sum + Number(item.commissionAmount), 0);

    const trendMap = new Map<string, { orders: number; commission: number }>();
    for (const item of commissions.slice(0, 7)) {
      const key = item.createdAt.toISOString().slice(0, 10);
      const current = trendMap.get(key) ?? { orders: 0, commission: 0 };
      current.commission += Number(item.commissionAmount);
      trendMap.set(key, current);
    }
    for (const item of orders.slice(0, 7)) {
      const key = item.createdAt.toISOString().slice(0, 10);
      const current = trendMap.get(key) ?? { orders: 0, commission: 0 };
      current.orders += 1;
      trendMap.set(key, current);
    }

    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, value]) => ({
        date,
        orders: value.orders,
        commission: value.commission.toFixed(2),
      }));

    return {
      overview: {
        totalOrders: orders.length,
        totalCommission: totalCommission.toFixed(2),
        todayOrders: todayOrders.length,
        todayCommission: todayCommission.toFixed(2),
        pendingPickup: pendingPickupCount,
        availableWithdraw: pendingSettlement.toFixed(2),
      },
      recentOrders: orders.slice(0, 5).map((order) => ({
        orderNo: order.orderNo,
        buyerName: order.user.nickname ?? '用户',
        totalAmount: this.toMoney(order.payAmount),
        commission: this.toMoney(Number(order.payAmount) * Number(leader.commissionRate)),
        status: order.pickupStatus ?? 'PENDING',
        createdAt: order.createdAt.toISOString(),
      })),
      trend,
    };
  }

  private mapLeaderOrder(order: Prisma.OrderGetPayload<{ include: { user: true; items: true } }>, commissionRate: number) {
    return {
      orderNo: order.orderNo,
      buyerName: order.user.nickname ?? '用户',
      buyerPhone: order.user.mobile ?? '',
      buyerAvatar: this.resolvePublicUrl(order.user.avatarUrl),
      status: order.orderStatus === 3 ? 'COMPLETED' : order.orderStatus === 2 ? 'PAID' : 'PENDING',
      statusLabel: order.orderStatus === 3 ? '已完成' : order.payStatus === 1 ? '已支付' : '待支付',
      totalAmount: this.toMoney(order.payAmount),
      commission: this.toMoney(Number(order.payAmount) * commissionRate),
      pickupStatus: (order.pickupStatus ?? 'PENDING') as 'PENDING' | 'PICKED_UP',
      items: order.items.map((item) => ({
        orderItemId: this.toNumber(item.id),
        productId: this.toNumber(item.productId),
        skuId: this.toNumber(item.skuId),
        title: item.productTitle,
        skuName: item.skuName,
        price: this.toMoney(item.unitPrice),
        quantity: item.quantity,
        coverUrl: this.resolvePublicUrl(item.productImage),
      })),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString(),
      pickedUpAt: order.pickedUpAt?.toISOString(),
      pickupCode: order.pickupCode ?? '',
    };
  }

  async listLeaderOrders(authUser: AuthUser, query: Record<string, string>) {
    const { leader } = await this.requireApprovedLeader(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const pickupStatus = String(query.pickupStatus ?? query.status ?? '').trim().toUpperCase();

    const where: Prisma.OrderWhereInput = {
      leaderId: leader.id,
      deletedAt: null,
      isParent: false,
      payStatus: 1,
      ...(pickupStatus === 'PENDING' ? { pickupStatus: 'PENDING' } : {}),
      ...(pickupStatus === 'PICKED_UP' || pickupStatus === 'PICKED' ? { pickupStatus: 'PICKED_UP' } : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { user: true, items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: orders.map((order) => this.mapLeaderOrder(order, Number(leader.commissionRate))),
    };
  }

  async confirmOrderPickup(authUser: AuthUser, orderNo: string) {
    const { leader } = await this.requireApprovedLeader(authUser);
    const order = await this.prisma.order.findFirst({
      where: { orderNo, leaderId: leader.id, deletedAt: null, isParent: false },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.pickupStatus === 'PICKED_UP') {
      throw new BadRequestException('订单已提货');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pickupStatus: 'PICKED_UP',
        pickedUpAt: new Date(),
        deliveryStatus: 3,
        orderStatus: 3,
        completedAt: new Date(),
      },
    });

    return { orderNo, pickupStatus: 'PICKED_UP' };
  }

  async listAppCommissions(authUser: AuthUser, query: Record<string, string>) {
    const { leader } = await this.requireApprovedLeader(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const status = String(query.status ?? '').trim().toUpperCase();

    const where: Prisma.LeaderCommissionWhereInput = {
      leaderId: leader.id,
      ...(status === 'PENDING' || status === 'PENDING_SETTLEMENT' ? { status: 'PENDING_SETTLEMENT' } : {}),
      ...(status === 'SETTLED' ? { status: 'SETTLED' } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.leaderCommission.count({ where }),
      this.prisma.leaderCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => ({
        id: this.toNumber(item.id),
        commissionNo: `LC${String(item.id).padStart(8, '0')}`,
        orderNo: item.orderNo,
        amount: this.toMoney(item.commissionAmount),
        type: 'ORDER',
        typeLabel: '订单分佣',
        status: item.status === 'PENDING_SETTLEMENT' ? 'PENDING' : item.status,
        statusLabel: COMMISSION_STATUS_LABELS[item.status] ?? item.status,
        description: item.remark ?? '订单分佣',
        createdAt: item.createdAt.toISOString(),
        settledAt: item.settledAt?.toISOString(),
      })),
    };
  }

  async listAdminLeaders(query: Record<string, string>) {
    await this.seedDemoDataIfEmpty();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const status = String(query.status ?? '').trim().toUpperCase();

    const where: Prisma.CommunityLeaderWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { realName: { contains: keyword, mode: 'insensitive' } },
              { mobile: { contains: keyword, mode: 'insensitive' } },
              { applicationNo: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, leaders] = await Promise.all([
      this.prisma.communityLeader.count({ where }),
      this.prisma.communityLeader.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, mobile: true, openid: true, avatarUrl: true } },
          pickupPoints: { where: { deletedAt: null } },
          _count: { select: { pickupPoints: { where: { deletedAt: null } } } },
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
      items: leaders.map((leader) => this.mapAdminLeader(leader)),
    };
  }

  async getAdminLeader(leaderId: number) {
    const leader = await this.prisma.communityLeader.findFirst({
      where: { id: BigInt(leaderId), deletedAt: null },
      include: {
        user: { select: { id: true, nickname: true, mobile: true, openid: true, avatarUrl: true } },
        pickupPoints: { where: { deletedAt: null } },
        _count: { select: { pickupPoints: { where: { deletedAt: null } } } },
      },
    });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }
    return this.mapAdminLeader(leader);
  }

  async auditAdminLeader(leaderId: number, body: Record<string, unknown>, authUser?: AuthUser) {
    const leader = await this.prisma.communityLeader.findFirst({ where: { id: BigInt(leaderId), deletedAt: null } });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    const status = String(body.status ?? 'APPROVED').trim().toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new BadRequestException('审核状态无效');
    }
    if (status === 'REJECTED' && !String(body.rejectReason ?? '').trim()) {
      throw new BadRequestException('请填写拒绝原因');
    }

    const updated = await this.prisma.communityLeader.update({
      where: { id: leader.id },
      data: {
        status,
        rejectReason: status === 'REJECTED' ? String(body.rejectReason).trim() : null,
        auditedBy: this.resolveAdminUserId(authUser),
        auditedAt: new Date(),
      },
      include: {
        user: { select: { id: true, nickname: true, mobile: true, openid: true, avatarUrl: true } },
        pickupPoints: { where: { deletedAt: null } },
        _count: { select: { pickupPoints: { where: { deletedAt: null } } } },
      },
    });

    await this.prisma.leaderApplication.updateMany({
      where: { userId: leader.userId, applicationNo: leader.applicationNo },
      data: { status, remark: status === 'REJECTED' ? String(body.rejectReason).trim() : '审核通过' },
    });

    return this.mapAdminLeader(updated);
  }

  async updateAdminLeader(leaderId: number, body: Record<string, unknown>) {
    const leader = await this.prisma.communityLeader.findFirst({ where: { id: BigInt(leaderId), deletedAt: null } });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    const updated = await this.prisma.communityLeader.update({
      where: { id: leader.id },
      data: {
        realName: body.realName != null ? String(body.realName).trim() : undefined,
        mobile: body.mobile != null ? String(body.mobile).trim() : undefined,
        commissionRate: body.commissionRate != null ? new Prisma.Decimal(Number(body.commissionRate)) : undefined,
        status: body.status != null ? String(body.status).trim().toUpperCase() : undefined,
      },
      include: {
        user: { select: { id: true, nickname: true, mobile: true, openid: true, avatarUrl: true } },
        pickupPoints: { where: { deletedAt: null } },
        _count: { select: { pickupPoints: { where: { deletedAt: null } } } },
      },
    });

    return this.mapAdminLeader(updated);
  }

  async deleteAdminLeader(leaderId: number) {
    const leader = await this.prisma.communityLeader.findFirst({ where: { id: BigInt(leaderId), deletedAt: null } });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    await this.prisma.$transaction([
      this.prisma.pickupPoint.updateMany({
        where: { leaderId: leader.id },
        data: { leaderId: null },
      }),
      this.prisma.communityLeader.update({
        where: { id: leader.id },
        data: { deletedAt: new Date(), status: 'DISABLED' },
      }),
    ]);

    return { success: true, id: leaderId };
  }

  async listAdminPickupPoints(query: Record<string, string>) {
    await this.seedDemoDataIfEmpty();
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const keyword = String(query.keyword ?? '').trim();
    const city = String(query.city ?? '').trim();
    const district = String(query.district ?? '').trim();
    const status = String(query.status ?? '').trim().toUpperCase();

    const where: Prisma.PickupPointWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      ...(district ? { district: { contains: district, mode: 'insensitive' } } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { detailAddress: { contains: keyword, mode: 'insensitive' } },
              { contactName: { contains: keyword, mode: 'insensitive' } },
              { contactMobile: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, points] = await Promise.all([
      this.prisma.pickupPoint.count({ where }),
      this.prisma.pickupPoint.findMany({
        where,
        include: { leader: true },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: points.map((point) => this.mapAdminPickupPoint(point)),
    };
  }

  async createAdminPickupPoint(body: Record<string, unknown>) {
    const name = String(body.name ?? '').trim();
    const province = String(body.province ?? '').trim();
    const city = String(body.city ?? '').trim();
    const detailAddress = String(body.detailAddress ?? '').trim();
    if (!name || !province || !city || !detailAddress) {
      throw new BadRequestException('请填写自提点名称、省市区和详细地址');
    }

    if (body.leaderId != null) {
      const leader = await this.prisma.communityLeader.findFirst({
        where: { id: BigInt(Number(body.leaderId)), deletedAt: null, status: 'APPROVED' },
      });
      if (!leader) {
        throw new BadRequestException('关联团长不存在或未通过审核');
      }
    }

    const point = await this.prisma.pickupPoint.create({
      data: {
        leaderId: body.leaderId != null ? BigInt(Number(body.leaderId)) : null,
        name,
        contactName: body.contactName != null ? String(body.contactName).trim() : null,
        contactMobile: body.contactMobile != null ? String(body.contactMobile).trim() : null,
        province,
        city,
        district: body.district != null ? String(body.district).trim() : null,
        detailAddress,
        longitude: body.longitude != null ? new Prisma.Decimal(Number(body.longitude)) : null,
        latitude: body.latitude != null ? new Prisma.Decimal(Number(body.latitude)) : null,
        businessHours: body.businessHours != null ? String(body.businessHours).trim() : null,
        storePhoto: body.storePhoto != null ? String(body.storePhoto) : null,
        description: body.description != null ? String(body.description) : null,
        status: 'ENABLED',
        source: 'ADMIN',
      },
      include: { leader: true },
    });

    return this.mapAdminPickupPoint(point);
  }

  async updateAdminPickupPoint(pickupPointId: number, body: Record<string, unknown>) {
    const point = await this.prisma.pickupPoint.findFirst({
      where: { id: BigInt(pickupPointId), deletedAt: null },
    });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    const updated = await this.prisma.pickupPoint.update({
      where: { id: point.id },
      data: {
        leaderId: body.leaderId != null ? BigInt(Number(body.leaderId)) : body.leaderId === null ? null : undefined,
        name: body.name != null ? String(body.name).trim() : undefined,
        contactName: body.contactName != null ? String(body.contactName).trim() : undefined,
        contactMobile: body.contactMobile != null ? String(body.contactMobile).trim() : undefined,
        province: body.province != null ? String(body.province).trim() : undefined,
        city: body.city != null ? String(body.city).trim() : undefined,
        district: body.district != null ? String(body.district).trim() : undefined,
        detailAddress: body.detailAddress != null ? String(body.detailAddress).trim() : undefined,
        longitude: body.longitude != null ? new Prisma.Decimal(Number(body.longitude)) : undefined,
        latitude: body.latitude != null ? new Prisma.Decimal(Number(body.latitude)) : undefined,
        businessHours: body.businessHours != null ? String(body.businessHours).trim() : undefined,
        storePhoto: body.storePhoto != null ? String(body.storePhoto) : undefined,
        description: body.description != null ? String(body.description) : undefined,
      },
      include: { leader: true },
    });

    return this.mapAdminPickupPoint(updated);
  }

  async updateAdminPickupPointStatus(pickupPointId: number, body: Record<string, unknown>) {
    const status = String(body.status ?? '').trim().toUpperCase();
    if (!['ENABLED', 'DISABLED'].includes(status)) {
      throw new BadRequestException('状态无效');
    }

    const point = await this.prisma.pickupPoint.findFirst({
      where: { id: BigInt(pickupPointId), deletedAt: null },
    });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    const updated = await this.prisma.pickupPoint.update({
      where: { id: point.id },
      data: { status },
      include: { leader: true },
    });

    return this.mapAdminPickupPoint(updated);
  }

  async deleteAdminPickupPoint(pickupPointId: number) {
    const point = await this.prisma.pickupPoint.findFirst({
      where: { id: BigInt(pickupPointId), deletedAt: null },
    });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    const linkedOrders = await this.prisma.order.count({
      where: { pickupPointId: point.id, deletedAt: null },
    });
    if (linkedOrders > 0) {
      throw new BadRequestException('该自提点已关联订单，无法删除');
    }

    await this.prisma.pickupPoint.update({
      where: { id: point.id },
      data: { deletedAt: new Date(), status: 'DISABLED' },
    });

    return { success: true, id: pickupPointId };
  }

  async listAdminCommissions(query: Record<string, string>) {
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const leaderId = query.leaderId ? Number(query.leaderId) : undefined;
    const status = String(query.status ?? '').trim().toUpperCase();

    const where: Prisma.LeaderCommissionWhereInput = {
      ...(leaderId ? { leaderId: BigInt(leaderId) } : {}),
      ...(status ? { status } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.leaderCommission.count({ where }),
      this.prisma.leaderCommission.findMany({
        where,
        include: { leader: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => ({
        id: this.toNumber(item.id),
        leaderId: item.leaderId != null ? this.toNumber(item.leaderId) : null,
        orderId: item.orderId != null ? this.toNumber(item.orderId) : null,
        orderNo: item.orderNo,
        orderAmount: Number(item.orderAmount),
        commissionRate: Number(item.commissionRate),
        commissionAmount: Number(item.commissionAmount),
        status: item.status,
        settledAt: item.settledAt?.toISOString() ?? null,
        remark: item.remark,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        leader: item.leader
          ? {
              id: this.toNumber(item.leader.id),
              realName: item.leader.realName,
              mobile: item.leader.mobile,
            }
          : null,
      })),
    };
  }

  async settleAdminCommission(commissionId: number) {
    const commission = await this.prisma.leaderCommission.findUnique({ where: { id: BigInt(commissionId) } });
    if (!commission) {
      throw new NotFoundException('佣金记录不存在');
    }
    if (commission.status !== 'PENDING_SETTLEMENT') {
      throw new BadRequestException('当前状态不可结算');
    }

    const updated = await this.prisma.leaderCommission.update({
      where: { id: commission.id },
      data: { status: 'SETTLED', settledAt: new Date() },
      include: { leader: true },
    });

    return {
      id: this.toNumber(updated.id),
      status: updated.status,
      settledAt: updated.settledAt?.toISOString(),
    };
  }

  async batchSettleAdminCommissions(ids: number[]) {
    if (!ids.length) {
      throw new BadRequestException('请选择要结算的佣金');
    }

    const result = await this.prisma.leaderCommission.updateMany({
      where: {
        id: { in: ids.map((id) => BigInt(id)) },
        status: 'PENDING_SETTLEMENT',
      },
      data: { status: 'SETTLED', settledAt: new Date() },
    });

    return { settledCount: result.count };
  }

  async resolvePickupOrderMeta(body: Record<string, unknown>) {
    const pickupPointId = body.pickupPointId != null ? Number(body.pickupPointId) : null;
    if (!pickupPointId) return {};

    const point = await this.prisma.pickupPoint.findFirst({
      where: { id: BigInt(pickupPointId), deletedAt: null, status: 'ENABLED' },
    });
    if (!point) {
      throw new BadRequestException('自提点不存在或已停用');
    }

    return {
      pickupPointId: point.id,
      leaderId: point.leaderId,
      pickupStatus: 'PENDING',
      pickupCode: String(Math.floor(100000 + Math.random() * 900000)),
    };
  }
}
