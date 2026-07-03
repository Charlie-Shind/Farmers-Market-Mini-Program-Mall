import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuthUser } from '../../../../common/types';
import { RoleCode } from '../../../../common/enums/role.enum';
import { ApplyLeaderDto, UpdateLeaderApplicationDto } from '../dto/apply-leader.dto';
import { AuditLeaderDto, UpdateLeaderDto, UpdateLeaderStatusDto } from '../dto/audit-leader.dto';
import { LeaderStatus, PickupPointSource, PickupPointStatus } from '../types/leader.types';

@Injectable()
export class LeaderApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  private generateApplicationNo(): string {
    return `LA${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  private async ensureUser(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { openid: authUser.sub } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  private async ensureLeaderRole(userId: bigint) {
    const leaderRole = await this.prisma.role.findUnique({ where: { code: RoleCode.LEADER } });
    if (!leaderRole) {
      throw new BadRequestException('LEADER 角色未初始化');
    }
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: leaderRole.id } },
      create: { userId, roleId: leaderRole.id },
      update: {},
    });
  }

  private async removeLeaderRole(userId: bigint) {
    const leaderRole = await this.prisma.role.findUnique({ where: { code: RoleCode.LEADER } });
    if (leaderRole) {
      await this.prisma.userRole.deleteMany({ where: { userId, roleId: leaderRole.id } });
    }
  }

  async apply(authUser: AuthUser, dto: ApplyLeaderDto) {
    const user = await this.ensureUser(authUser);

    const existing = await this.prisma.communityLeader.findUnique({
      where: { userId: user.id },
    });

    if (existing?.status === LeaderStatus.APPROVED) {
      throw new BadRequestException('您已经是团长，无需重复申请');
    }

    const payload = {
      userId: user.id,
      applicationNo: this.generateApplicationNo(),
      realName: dto.realName,
      mobile: dto.mobile,
      idCardNo: dto.idCardNo ?? null,
      idCardFrontUrl: dto.idCardFrontUrl ?? null,
      idCardBackUrl: dto.idCardBackUrl ?? null,
      businessCertUrl: dto.businessCertUrl ?? null,
      status: LeaderStatus.PENDING_AUDIT,
      rejectReason: null,
    };

    const leader = existing
      ? await this.prisma.communityLeader.update({
          where: { userId: user.id },
          data: {
            ...payload,
            status: LeaderStatus.PENDING_AUDIT,
            rejectReason: null,
            auditedBy: null,
            auditedAt: null,
          },
        })
      : await this.prisma.communityLeader.create({ data: payload });

    return this.serializeLeader(leader);
  }

  async updateApplication(authUser: AuthUser, dto: UpdateLeaderApplicationDto) {
    const user = await this.ensureUser(authUser);

    const existing = await this.prisma.communityLeader.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      throw new NotFoundException('尚未提交团长申请');
    }

    if (existing.status === LeaderStatus.APPROVED) {
      throw new BadRequestException('申请已通过，不允许修改');
    }

    const leader = await this.prisma.communityLeader.update({
      where: { userId: user.id },
      data: {
        realName: dto.realName,
        mobile: dto.mobile,
        idCardNo: dto.idCardNo ?? null,
        idCardFrontUrl: dto.idCardFrontUrl ?? null,
        idCardBackUrl: dto.idCardBackUrl ?? null,
        businessCertUrl: dto.businessCertUrl ?? null,
        status: LeaderStatus.PENDING_AUDIT,
        rejectReason: null,
        auditedBy: null,
        auditedAt: null,
      },
    });

    return this.serializeLeader(leader);
  }

  async getMyApplication(authUser: AuthUser) {
    const user = await this.ensureUser(authUser);
    const leader = await this.prisma.communityLeader.findUnique({
      where: { userId: user.id },
    });
    if (!leader) {
      return null;
    }
    return this.serializeLeader(leader);
  }

  async audit(leaderId: bigint, adminUserId: bigint, dto: AuditLeaderDto) {
    const leader = await this.prisma.communityLeader.findUnique({
      where: { id: leaderId },
    });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    if (leader.status === LeaderStatus.APPROVED) {
      throw new BadRequestException('该申请已审核通过');
    }

    const isApproved = dto.status === LeaderStatus.APPROVED;

    const updated = await this.prisma.communityLeader.update({
      where: { id: leaderId },
      data: {
        status: dto.status,
        rejectReason: isApproved ? null : (dto.rejectReason ?? null),
        auditedBy: adminUserId,
        auditedAt: new Date(),
      },
    });

    if (isApproved) {
      await this.ensureLeaderRole(leader.userId);
      await this.ensureDefaultPickupPoint(updated);
    } else {
      await this.removeLeaderRole(leader.userId);
    }

    return this.serializeLeader(updated);
  }

  private async ensureDefaultPickupPoint(leader: { id: bigint; realName: string; mobile: string }) {
    const exists = await this.prisma.pickupPoint.findFirst({
      where: { leaderId: leader.id, source: PickupPointSource.LEADER },
    });
    if (exists) {
      return;
    }

    await this.prisma.pickupPoint.create({
      data: {
        leaderId: leader.id,
        name: `${leader.realName} 团长自提点`,
        contactName: leader.realName,
        contactMobile: leader.mobile,
        province: '',
        city: '',
        detailAddress: '待完善',
        status: PickupPointStatus.ENABLED,
        source: PickupPointSource.LEADER,
      },
    });
  }

  async updateLeader(leaderId: bigint, dto: UpdateLeaderDto) {
    const leader = await this.prisma.communityLeader.findUnique({
      where: { id: leaderId },
    });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    const data: Prisma.CommunityLeaderUpdateInput = {};
    if (dto.realName !== undefined) data.realName = dto.realName;
    if (dto.mobile !== undefined) data.mobile = dto.mobile;
    if (dto.commissionRate !== undefined) data.commissionRate = new Prisma.Decimal(dto.commissionRate.toFixed(4));
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.communityLeader.update({
      where: { id: leaderId },
      data,
    });

    if (dto.status === LeaderStatus.APPROVED) {
      await this.ensureLeaderRole(leader.userId);
      await this.ensureDefaultPickupPoint(updated);
    } else if (dto.status === LeaderStatus.DISABLED || dto.status === LeaderStatus.REJECTED) {
      await this.removeLeaderRole(leader.userId);
    }

    return this.serializeLeader(updated);
  }

  async updateStatus(leaderId: bigint, dto: UpdateLeaderStatusDto) {
    return this.updateLeader(leaderId, dto);
  }

  async deleteLeader(leaderId: bigint) {
    const leader = await this.prisma.communityLeader.findUnique({
      where: { id: leaderId },
      include: { pickupPoints: true },
    });
    if (!leader) {
      throw new NotFoundException('团长不存在');
    }

    await this.prisma.$transaction([
      this.prisma.communityLeader.delete({ where: { id: leaderId } }),
      ...leader.pickupPoints.map((p: { id: bigint }) =>
        this.prisma.pickupPoint.update({
          where: { id: p.id },
          data: { leaderId: null },
        }),
      ),
    ]);

    await this.removeLeaderRole(leader.userId);

    return { deleted: true };
  }

  serializeLeader(leader: {
    id: bigint;
    userId: bigint;
    applicationNo: string;
    realName: string;
    mobile: string;
    idCardNo: string | null;
    idCardFrontUrl: string | null;
    idCardBackUrl: string | null;
    businessCertUrl: string | null;
    status: string;
    rejectReason: string | null;
    commissionRate: Prisma.Decimal | null;
    auditedBy: bigint | null;
    auditedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: Number(leader.id),
      userId: Number(leader.userId),
      applicationNo: leader.applicationNo,
      realName: leader.realName,
      mobile: leader.mobile,
      idCardNo: leader.idCardNo,
      idCardFrontUrl: leader.idCardFrontUrl,
      idCardBackUrl: leader.idCardBackUrl,
      businessCertUrl: leader.businessCertUrl,
      status: leader.status,
      rejectReason: leader.rejectReason,
      commissionRate: leader.commissionRate ? Number(leader.commissionRate) : null,
      auditedBy: leader.auditedBy != null ? Number(leader.auditedBy) : null,
      auditedAt: leader.auditedAt?.toISOString() ?? null,
      createdAt: leader.createdAt.toISOString(),
      updatedAt: leader.updatedAt.toISOString(),
    };
  }
}
