import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreatePickupPointDto, NearbyPickupPointDto, QueryPickupPointDto, UpdatePickupPointDto, UpdatePickupPointStatusDto } from '../dto/pickup-point.dto';
import { PickupPointSource, PickupPointStatus } from '../types/leader.types';

@Injectable()
export class PickupPointService {
  constructor(private readonly prisma: PrismaService) {}

  private toDecimal(value: string | number | undefined): Prisma.Decimal | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return new Prisma.Decimal(value);
  }

  async create(dto: CreatePickupPointDto, source: PickupPointSource = PickupPointSource.ADMIN) {
    if (dto.leaderId != null) {
      const leader = await this.prisma.communityLeader.findUnique({
        where: { id: BigInt(dto.leaderId) },
      });
      if (!leader) {
        throw new NotFoundException('绑定的团长不存在');
      }
    }

    const point = await this.prisma.pickupPoint.create({
      data: {
        leaderId: dto.leaderId != null ? BigInt(dto.leaderId) : null,
        name: dto.name,
        contactName: dto.contactName ?? null,
        contactMobile: dto.contactMobile ?? null,
        province: dto.province,
        city: dto.city,
        district: dto.district ?? null,
        detailAddress: dto.detailAddress,
        longitude: this.toDecimal(dto.longitude),
        latitude: this.toDecimal(dto.latitude),
        businessHours: dto.businessHours ?? null,
        status: PickupPointStatus.ENABLED,
        source,
      },
    });

    return this.serialize(point);
  }

  async update(id: bigint, dto: UpdatePickupPointDto) {
    const point = await this.prisma.pickupPoint.findUnique({ where: { id } });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    if (dto.leaderId != null) {
      const leader = await this.prisma.communityLeader.findUnique({
        where: { id: BigInt(dto.leaderId) },
      });
      if (!leader) {
        throw new NotFoundException('绑定的团长不存在');
      }
    }

    const data: Prisma.PickupPointUpdateInput = {};
    if (dto.leaderId !== undefined) {
      if (dto.leaderId != null) {
        data.leader = { connect: { id: BigInt(dto.leaderId) } };
      } else {
        data.leader = { disconnect: true };
      }
    }
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.contactName !== undefined) data.contactName = dto.contactName ?? null;
    if (dto.contactMobile !== undefined) data.contactMobile = dto.contactMobile ?? null;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.district !== undefined) data.district = dto.district ?? null;
    if (dto.detailAddress !== undefined) data.detailAddress = dto.detailAddress;
    if (dto.longitude !== undefined) data.longitude = this.toDecimal(dto.longitude);
    if (dto.latitude !== undefined) data.latitude = this.toDecimal(dto.latitude);
    if (dto.businessHours !== undefined) data.businessHours = dto.businessHours ?? null;

    const updated = await this.prisma.pickupPoint.update({
      where: { id },
      data,
    });

    return this.serialize(updated);
  }

  async updateStatus(id: bigint, dto: UpdatePickupPointStatusDto) {
    const point = await this.prisma.pickupPoint.findUnique({ where: { id } });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    const updated = await this.prisma.pickupPoint.update({
      where: { id },
      data: { status: dto.status },
    });

    return this.serialize(updated);
  }

  async delete(id: bigint) {
    const point = await this.prisma.pickupPoint.findUnique({ where: { id } });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }

    const boundOrders = await this.prisma.order.count({
      where: { pickupPointId: id },
    });
    if (boundOrders > 0) {
      throw new BadRequestException('该自提点已关联订单，无法删除');
    }

    await this.prisma.pickupPoint.delete({ where: { id } });
    return { deleted: true };
  }

  async findById(id: bigint) {
    const point = await this.prisma.pickupPoint.findUnique({
      where: { id },
      include: { leader: true },
    });
    if (!point) {
      throw new NotFoundException('自提点不存在');
    }
    return this.serialize(point);
  }

  async findAll(query: QueryPickupPointDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PickupPointWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.city) where.city = { contains: query.city };
    if (query.district) where.district = { contains: query.district };
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { detailAddress: { contains: query.keyword } },
        { contactName: { contains: query.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.pickupPoint.findMany({
        where,
        include: { leader: { select: { id: true, realName: true, mobile: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pickupPoint.count({ where }),
    ]);

    return {
      items: items.map((item: typeof items[0]) => this.serialize(item)),
      total,
      page,
      pageSize,
    };
  }

  async findNearby(query: NearbyPickupPointDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PickupPointWhereInput = {
      status: PickupPointStatus.ENABLED,
      city: { contains: query.city },
    };
    if (query.district) {
      where.district = { contains: query.district };
    }

    const [items, total] = await Promise.all([
      this.prisma.pickupPoint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pickupPoint.count({ where }),
    ]);

    const result = items.map((item: typeof items[0]) => this.serialize(item));

    if (query.longitude != null && query.latitude != null) {
      const lng = Number(query.longitude);
      const lat = Number(query.latitude);
      result.sort((a: ReturnType<typeof this.serialize>, b: ReturnType<typeof this.serialize>) => {
        const da = a.longitude != null && a.latitude != null ? this.distance(lng, lat, a.longitude, a.latitude) : Infinity;
        const db = b.longitude != null && b.latitude != null ? this.distance(lng, lat, b.longitude, b.latitude) : Infinity;
        return da - db;
      });
    }

    return {
      items: result,
      total,
      page,
      pageSize,
    };
  }

  private distance(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  serialize(point: {
    id: bigint;
    leaderId: bigint | null;
    name: string;
    contactName: string | null;
    contactMobile: string | null;
    province: string;
    city: string;
    district: string | null;
    detailAddress: string;
    longitude: Prisma.Decimal | null;
    latitude: Prisma.Decimal | null;
    businessHours: string | null;
    status: string;
    source: string;
    createdAt: Date;
    updatedAt: Date;
    leader?: { id: bigint; realName: string; mobile: string } | null;
  }) {
    return {
      id: Number(point.id),
      leaderId: point.leaderId != null ? Number(point.leaderId) : null,
      name: point.name,
      contactName: point.contactName,
      contactMobile: point.contactMobile,
      province: point.province,
      city: point.city,
      district: point.district,
      detailAddress: point.detailAddress,
      longitude: point.longitude != null ? Number(point.longitude) : null,
      latitude: point.latitude != null ? Number(point.latitude) : null,
      businessHours: point.businessHours,
      status: point.status,
      source: point.source,
      createdAt: point.createdAt.toISOString(),
      updatedAt: point.updatedAt.toISOString(),
      leader: point.leader
        ? {
            id: Number(point.leader.id),
            realName: point.leader.realName,
            mobile: point.leader.mobile,
          }
        : null,
    };
  }
}
