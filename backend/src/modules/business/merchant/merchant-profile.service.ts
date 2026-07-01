import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class MerchantProfileService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async getMerchantSecurity(authUser: AuthUser) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const record = await this.prisma.merchant.findFirst({
      where: { id: merchant.id },
      include: { user: true },
    });

    if (!record) {
      throw new NotFoundException('商户不存在');
    }

    return {
      contactMobile: record.contactMobile,
      bindWechat: true,
      lastLoginAt: record.user.lastLoginAt?.toISOString() ?? '',
    };
  }

  async updateMerchantSecurity(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    if (typeof body.contactMobile === 'string' && body.contactMobile.trim()) {
      await this.prisma.merchant.update({
        where: { id: merchant.id },
        data: { contactMobile: body.contactMobile.trim() },
      });
    }
    return { success: true };
  }

  async listMerchantQualifications(authUser: AuthUser) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const quals = await this.prisma.merchantQualification.findMany({
      where: { merchantId: merchant.id },
    });
    return quals.map((q) => ({
      id: Number(q.id),
      qualificationType: q.qualificationType,
      fileName: q.fileName,
      fileUrl: q.fileUrl,
      status: q.status,
      auditRemark: q.auditRemark,
    }));
  }

  async createMerchantQualification(authUser: AuthUser, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const q = await this.prisma.merchantQualification.create({
      data: {
        merchantId: merchant.id,
        qualificationType: String(body.qualificationType ?? ''),
        fileName: String(body.fileName ?? ''),
        fileUrl: String(body.fileUrl ?? ''),
        status: 2,
      },
    });
    return { id: Number(q.id), success: true };
  }

  async updateMerchantQualification(authUser: AuthUser, qualificationId: number, body: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
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
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.merchantQualification.deleteMany({
      where: { id: BigInt(qualificationId), merchantId: merchant.id },
    });
    return { success: true };
  }

  getLogisticsCompanies() {
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
}
