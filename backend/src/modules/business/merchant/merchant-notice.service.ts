import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class MerchantNoticeService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  private normalizePage(pageValue: string | undefined) {
    const page = Number(pageValue ?? 1);
    if (!Number.isFinite(page) || page < 1) {
      return 1;
    }
    return Math.floor(page);
  }

  private normalizePageSize(pageSizeValue: string | undefined) {
    const pageSize = Number(pageSizeValue ?? 20);
    if (!Number.isFinite(pageSize)) {
      return 20;
    }
    return Math.min(100, Math.max(20, Math.floor(pageSize)));
  }

  async listMerchantNotices(authUser: AuthUser, query: Record<string, string>) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);

    const notices = await this.prisma.systemMessage.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [{ senderType: 'SYSTEM' }, { senderType: 'ADMIN' }],
      },
      include: {
        receipts: {
          where: { userId: merchant.userId },
          select: { isRead: true, readAt: true },
        },
      },
      orderBy: { publishAt: 'desc' },
    });

    const total = await this.prisma.systemMessage.count({
      where: { status: 'PUBLISHED', OR: [{ senderType: 'SYSTEM' }, { senderType: 'ADMIN' }] },
    });

    return {
      page,
      pageSize,
      total,
      items: notices.map((n) => ({
        id: Number(n.id),
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
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const notice = await this.prisma.systemMessage.findUnique({ where: { id: BigInt(noticeId) } });
    if (!notice) throw new NotFoundException('公告不存在');

    await this.prisma.userMessage.upsert({
      where: { userId_messageId: { userId: merchant.userId, messageId: BigInt(noticeId) } },
      create: { userId: merchant.userId, messageId: BigInt(noticeId), isRead: true, readAt: new Date() },
      update: { isRead: true, readAt: new Date() },
    });

    return {
      id: Number(notice.id),
      type: notice.bizType || 'SYSTEM',
      typeLabel: notice.bizType === 'ORDER' ? '订单公告' : '系统公告',
      title: notice.title,
      content: notice.contentJson ?? notice.summary ?? '',
      read: true,
      createdAt: notice.publishAt.toISOString(),
    };
  }

  async markMerchantNoticeRead(authUser: AuthUser, noticeId: number) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    await this.prisma.userMessage.upsert({
      where: { userId_messageId: { userId: merchant.userId, messageId: BigInt(noticeId) } },
      create: { userId: merchant.userId, messageId: BigInt(noticeId), isRead: true, readAt: new Date() },
      update: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllMerchantNoticesRead(authUser: AuthUser) {
    const merchant = await this.platformDataService.ensureCurrentMerchant(authUser);
    const unread = await this.prisma.userMessage.findMany({
      where: { userId: merchant.userId, isRead: false },
      select: { messageId: true },
    });

    if (unread.length) {
      await this.prisma.userMessage.updateMany({
        where: { userId: merchant.userId, messageId: { in: unread.map((u) => u.messageId) } },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return { success: true };
  }
}
