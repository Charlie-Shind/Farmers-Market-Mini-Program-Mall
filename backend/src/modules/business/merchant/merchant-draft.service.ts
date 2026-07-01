import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class MerchantDraftService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async syncMerchantProductDraft(authUser: AuthUser, payload: Record<string, unknown>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const form = payload?.form as { title?: string; images?: unknown[]; coverUrl?: string } | undefined;
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
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const draft = await this.prisma.merchantProductDraft.findFirst({
      where: {
        merchantId: merchant.id,
        deletedAt: null,
        OR: [{ draftNo: draftRef }, ...(isNaN(Number(draftRef)) ? [] : [{ id: BigInt(draftRef) }])],
      },
    });
    if (!draft) return null;
    return {
      id: Number(draft.id),
      draftNo: draft.draftNo,
      title: draft.title,
      coverUrl: draft.coverUrl,
      payloadJson: draft.payload,
      updatedAt: draft.updatedAt,
      createdAt: draft.createdAt,
    };
  }

  async listMerchantProductDrafts(authUser: AuthUser) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const drafts = await this.prisma.merchantProductDraft.findMany({
      where: { merchantId: merchant.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, draftNo: true, title: true, coverUrl: true, updatedAt: true },
    });
    return drafts.map((d) => ({
      id: Number(d.id),
      draftNo: d.draftNo,
      title: d.title,
      coverUrl: d.coverUrl,
      completeness: 100,
      updatedAt: d.updatedAt,
    }));
  }

  async deleteMerchantProductDraft(authUser: AuthUser, draftRef: string) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const draft = await this.prisma.merchantProductDraft.findFirst({
      where: {
        merchantId: merchant.id,
        deletedAt: null,
        OR: [{ draftNo: draftRef }, ...(isNaN(Number(draftRef)) ? [] : [{ id: BigInt(draftRef) }])],
      },
    });
    if (!draft) return { success: false };
    await this.prisma.merchantProductDraft.update({ where: { id: draft.id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
