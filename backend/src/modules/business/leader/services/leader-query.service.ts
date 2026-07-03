import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { QueryLeaderDto } from '../dto/query-leader.dto';
import { LeaderApplicationService } from './leader-application.service';

@Injectable()
export class LeaderQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderApplicationService: LeaderApplicationService,
  ) {}

  async findAll(query: QueryLeaderDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: {
      status?: string;
      OR?: Array<
        | { realName: { contains: string } }
        | { mobile: { contains: string } }
        | { applicationNo: { contains: string } }
      >;
    } = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { realName: { contains: query.keyword } },
        { mobile: { contains: query.keyword } },
        { applicationNo: { contains: query.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.communityLeader.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, openid: true } },
          _count: { select: { pickupPoints: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.communityLeader.count({ where }),
    ]);

    return {
      items: items.map((item: typeof items[0]) => ({
        ...this.leaderApplicationService.serializeLeader(item),
        user: item.user
          ? {
              id: Number(item.user.id),
              nickname: item.user.nickname,
              avatarUrl: item.user.avatarUrl,
              openid: item.user.openid,
            }
          : null,
        pickupPointCount: item._count.pickupPoints,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: bigint) {
    const leader = await this.prisma.communityLeader.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, openid: true, mobile: true } },
        pickupPoints: true,
      },
    });

    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    return {
      ...this.leaderApplicationService.serializeLeader(leader),
      user: leader.user
        ? {
            id: Number(leader.user.id),
            nickname: leader.user.nickname,
            avatarUrl: leader.user.avatarUrl,
            openid: leader.user.openid,
            mobile: leader.user.mobile,
          }
        : null,
      pickupPoints: leader.pickupPoints.map((p: typeof leader.pickupPoints[0]) => ({
        id: Number(p.id),
        name: p.name,
        province: p.province,
        city: p.city,
        district: p.district,
        detailAddress: p.detailAddress,
        status: p.status,
      })),
    };
  }
}
