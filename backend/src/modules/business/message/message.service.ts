import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';

import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ObjectStorageService } from '../../../common/storage/object-storage.service';
import {
  MessageContentBlock,
  MessageContentPayload,
  MessageDetailItem,
  MessageListItem,
  MessageListQuery,
  SendMessageInput,
} from './message.types';

type ListResult = {
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
  items: MessageListItem[];
};

function toNumber(value: bigint | number | null | undefined): number {
  return Number(value ?? 0);
}

function toIso(value: Date | null | undefined): string {
  return value ? value.toISOString() : '';
}

function toShanghaiDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((item) => item.type === 'year')?.value ?? '0000';
  const month = parts.find((item) => item.type === 'month')?.value ?? '00';
  const day = parts.find((item) => item.type === 'day')?.value ?? '00';

  return `${year}-${month}-${day}`;
}

function normalizeMessageIdList(values: Array<number | bigint | string> | undefined): bigint[] {
  return [...new Set((values ?? []).map((value) => BigInt(Number(value))).filter((value) => value > 0n))];
}

function resolveFirstTextBlock(contentJson: MessageContentPayload | null | undefined): string {
  const block = contentJson?.blocks?.find((item) => item.type === 'text');

  if (!block || block.type !== 'text') {
    return '';
  }

  return block.value.trim();
}

function resolveFirstImageUrl(contentJson: MessageContentPayload | null | undefined): string {
  const block = contentJson?.blocks?.find((item) => item.type === 'image');

  if (!block || block.type !== 'image') {
    return '';
  }

  return block.url.trim();
}

@Injectable()
export class MessageService implements OnModuleInit {
  private seedPromise: Promise<void> | null = null;
  private demoMessageImageCache = new Map<string, Promise<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async onModuleInit() {
    await this.seedDemoMessages();
  }

  private isDemoSeedEnabled(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', '').trim().toLowerCase();
    if (nodeEnv === 'production') {
      return false;
    }

    const explicitFlag = this.configService.get<string>('ENABLE_DEMO_SEED', '').trim().toLowerCase();
    if (explicitFlag === 'false') {
      return false;
    }

    return true;
  }

  private isUserFacingRole(role: RoleCode): boolean {
    return role === RoleCode.GUEST || role === RoleCode.USER || role === RoleCode.MERCHANT;
  }

  private async resolveCurrentUser(authUser?: AuthUser): Promise<User> {
    if (!authUser || !this.isUserFacingRole(authUser.role)) {
      throw new UnauthorizedException('Message inbox requires a user session');
    }

    const existing = await this.prisma.user.findUnique({
      where: { openid: authUser.sub },
    });

    if (existing) {
      if (existing.status !== 1) {
        throw new ForbiddenException('User account is disabled');
      }

    return this.prisma.user.update({
      where: { id: existing.id },
        data: {
          lastLoginAt: new Date(),
        },
      });
    }

    return this.prisma.user.create({
      data: {
        openid: authUser.sub,
        nickname: authUser.role === RoleCode.GUEST ? '游客用户' : '微信用户',
        status: 1,
        lastLoginAt: new Date(),
      },
    });
  }

  private escapeSvgText(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildGeneratedImageSvg(params: {
    title: string;
    subtitle: string;
    accent: string;
    footer: string;
  }): string {
    const title = this.escapeSvgText(params.title);
    const subtitle = this.escapeSvgText(params.subtitle);
    const accent = params.accent;
    const footer = this.escapeSvgText(params.footer);

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f7f4ec" />
      <stop offset="100%" stop-color="#eef4ea" />
    </linearGradient>
  </defs>
  <rect width="900" height="540" rx="40" fill="url(#bg)" />
  <rect x="54" y="54" width="792" height="432" rx="30" fill="#ffffff" stroke="${accent}" stroke-width="6" />
  <rect x="110" y="104" width="680" height="132" rx="22" fill="${accent}" />
  <text x="450" y="158" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="42" font-weight="700" fill="#ffffff">${title}</text>
  <text x="450" y="198" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="24" fill="rgba(255,255,255,0.88)">${subtitle}</text>
  <rect x="160" y="286" width="580" height="120" rx="24" fill="#f7f4ec" stroke="#dde6d7" stroke-width="3" />
  <text x="450" y="350" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="28" font-weight="700" fill="${accent}">真实对象存储文件</text>
  <text x="450" y="418" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="22" fill="#6f7b72">${footer}</text>
</svg>
    `.trim();
  }

  private async uploadGeneratedMessageImage(fileName: string, params: {
    title: string;
    subtitle: string;
    accent: string;
    footer: string;
  }): Promise<string> {
    const cached = this.demoMessageImageCache.get(fileName);
    if (cached) {
      return cached;
    }

    const upload = (async () => {
      const svg = this.buildGeneratedImageSvg(params);
      const uploaded = await this.objectStorageService.uploadPublicObject({
        buffer: Buffer.from(svg, 'utf8'),
        fileName,
        mimeType: 'image/svg+xml',
        folder: 'demo-messages',
      });
      return uploaded.url;
    })();

    this.demoMessageImageCache.set(fileName, upload);
    return upload;
  }

  private buildContentPayload(input: SendMessageInput): MessageContentPayload {
    if (input.contentJson && typeof input.contentJson === 'object') {
      return input.contentJson as MessageContentPayload;
    }

    const blocks: MessageContentBlock[] = [
      {
        type: 'text' as const,
        value: input.summary?.trim() || input.title.trim(),
      },
    ];

    if (input.coverImageUrl) {
      blocks.push({
        type: 'image' as const,
        url: input.coverImageUrl,
        alt: input.title,
      });
    }

    return {
      blocks,
      preview: input.summary?.trim() || input.title.trim(),
    };
  }

  private deriveSummary(input: SendMessageInput, contentJson: MessageContentPayload): string {
    return (
      input.summary?.trim() ||
      contentJson.preview?.trim() ||
      resolveFirstTextBlock(contentJson) ||
      input.title.trim()
    );
  }

  private mapTypeLabel(type: string): string {
    const map: Record<string, string> = {
      SYSTEM: '系统',
      ORDER: '订单',
      ACTIVITY: '活动',
      NOTICE: '公告',
    };

    return map[type] || type;
  }

  private formatMessageItem(
    receipt: {
      id: bigint;
      isRead: boolean;
      readAt: Date | null;
      deliveredAt: Date | null;
      createdAt: Date;
      message: {
        id: bigint;
        type: string;
        title: string;
        summary: string | null;
        coverImageUrl: string | null;
        bizType: string | null;
        bizId: string | null;
        publishAt: Date;
      };
    },
  ): MessageListItem {
    const publishAt = receipt.message.publishAt || receipt.deliveredAt || receipt.createdAt;

    return {
      receiptId: toNumber(receipt.id),
      messageId: toNumber(receipt.message.id),
      type: receipt.message.type,
      typeLabel: this.mapTypeLabel(receipt.message.type),
      title: receipt.message.title,
      summary: receipt.message.summary || '',
      coverImageUrl: receipt.message.coverImageUrl || '',
      isRead: receipt.isRead,
      publishAt: toIso(publishAt),
      dateKey: toShanghaiDateKey(publishAt),
      readAt: toIso(receipt.readAt),
      bizType: receipt.message.bizType || '',
      bizId: receipt.message.bizId || '',
    };
  }

  private async seedDemoMessages(): Promise<void> {
    const messageCount = await this.prisma.systemMessage.count();
    if (messageCount > 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: {
        status: 1,
        deletedAt: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (users.length === 0) {
      return;
    }

    const now = new Date();
    const orderCoverImageUrl = await this.uploadGeneratedMessageImage('message-order.svg', {
      title: '订单通知',
      subtitle: '发货与物流提醒',
      accent: '#2C4A39',
      footer: '已上传到对象存储',
    });
    const activityCoverImageUrl = await this.uploadGeneratedMessageImage('message-activity.svg', {
      title: '活动推送',
      subtitle: '助农专题补贴',
      accent: '#4C7659',
      footer: '已上传到对象存储',
    });
    const demoMessages: SendMessageInput[] = [
      {
        type: 'ORDER',
        title: '您的订单已发货',
        summary: '顺丰已揽收，预计 2 天内送达。',
        coverImageUrl: orderCoverImageUrl,
        contentJson: {
          blocks: [
            { type: 'text', value: '您的订单已发货，快递员已完成揽收。' },
            { type: 'image', url: orderCoverImageUrl, alt: '订单通知' },
            { type: 'text', value: '物流单号：SF1234567890' },
          ],
          preview: '您的订单已发货，预计 2 天内送达。',
          link: {
            label: '查看订单',
            url: '/pages/profile/profile',
            type: 'order',
            id: 'NO202606070001',
          },
        },
        bizType: 'ORDER',
        bizId: 'NO202606070001',
        publishAt: now,
      },
      {
        type: 'ACTIVITY',
        title: '助农专题补贴已开始',
        summary: '限时补贴活动已上线，进入活动页即可查看。',
        coverImageUrl: activityCoverImageUrl,
        contentJson: {
          blocks: [
            { type: 'text', value: '助农专题补贴专场已正式开始。' },
            { type: 'image', url: activityCoverImageUrl, alt: '活动推送' },
            { type: 'text', value: '活动期间支持限时补贴与爆款秒杀。' },
          ],
          preview: '助农专题补贴专场已开始。',
          link: {
            label: '去看看',
            url: '/pages/marketing/marketing',
            type: 'activity',
            id: 'activity-1',
          },
        },
        bizType: 'ACTIVITY',
        bizId: 'activity-1',
        publishAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
      },
      {
        type: 'NOTICE',
        title: '系统公告',
        summary: '平台将在今晚进行短时维护。',
        contentJson: {
          blocks: [
            { type: 'text', value: '平台将于今晚 23:30 至 23:50 进行短时维护。' },
            { type: 'text', value: '维护期间部分接口可能短暂不可用，请提前安排操作。' },
          ],
          preview: '平台将在今晚进行短时维护。',
        },
        bizType: 'SYSTEM',
        bizId: 'notice-1',
        publishAt: new Date(now.getTime() - 1000 * 60 * 60 * 26),
      },
    ];

    for (const input of demoMessages) {
      await this.publishMessage({
        ...input,
        broadcast: true,
        targetUserIds: users.map((item) => item.id),
      });
    }
  }

  private async publishMessage(input: SendMessageInput) {
    const contentJson = this.buildContentPayload(input);
    const summary = this.deriveSummary(input, contentJson);
    const publishAt = input.publishAt ? new Date(input.publishAt) : new Date();
    const targetUserIds = normalizeMessageIdList(input.targetUserIds);

    const recipientIds = targetUserIds.length
      ? targetUserIds
      : input.targetRoleCode
        ? (
            await this.prisma.user.findMany({
              where: {
                status: 1,
                deletedAt: null,
                roles: {
                  some: {
                    role: {
                      code: input.targetRoleCode,
                    },
                  },
                },
              },
              select: {
                id: true,
              },
            })
          ).map((item) => item.id)
        : input.broadcast
          ? (
              await this.prisma.user.findMany({
                where: {
                  status: 1,
                  deletedAt: null,
                },
                select: {
                  id: true,
                },
              })
            ).map((item) => item.id)
          : [];

    if (recipientIds.length === 0) {
      throw new BadRequestException('Message recipients are required');
    }

    const message = await this.prisma.systemMessage.create({
      data: {
        type: input.type,
        title: input.title,
        summary,
        contentType: input.contentType || 'JSON',
        contentJson: contentJson as Prisma.InputJsonValue,
        coverImageUrl: input.coverImageUrl || resolveFirstImageUrl(contentJson) || null,
        senderType: input.senderType || 'SYSTEM',
        senderId: input.senderId != null ? BigInt(input.senderId) : null,
        bizType: input.bizType || (input.targetRoleCode ? `ROLE_${input.targetRoleCode}` : (input.broadcast ? 'ALL' : 'SPECIFIC')),
        bizId: input.bizId || null,
        publishAt,
        createdAt: publishAt,
        status: 'PUBLISHED',
      },
    });

    await this.prisma.userMessage.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        messageId: message.id,
        isRead: false,
        readAt: null,
        deliveredAt: publishAt,
        createdAt: publishAt,
      })),
      skipDuplicates: true,
    });

    return {
      messageId: toNumber(message.id),
      recipientCount: recipientIds.length,
      publishAt: publishAt.toISOString(),
    };
  }

  async listMessages(authUser: AuthUser | undefined, query: MessageListQuery = {}): Promise<ListResult> {
    const user = await this.resolveCurrentUser(authUser);

    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20) || 20, 20), 100);
    const messageType = String(query.type ?? '').trim();
    const isRead = typeof query.isRead === 'boolean' ? query.isRead : undefined;

    const baseWhere: Prisma.UserMessageWhereInput = {
      userId: user.id,
      deletedAt: null,
      ...(typeof isRead === 'boolean' ? { isRead } : {}),
      ...(messageType
        ? {
            message: {
              type: messageType,
            },
          }
        : {}),
    };

    const [total, unreadCount, receipts] = await Promise.all([
      this.prisma.userMessage.count({ where: baseWhere }),
      this.prisma.userMessage.count({
        where: {
          userId: user.id,
          deletedAt: null,
          isRead: false,
        },
      }),
      this.prisma.userMessage.findMany({
        where: baseWhere,
        include: {
          message: true,
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      unreadCount,
      items: receipts.map((receipt) => this.formatMessageItem(receipt)),
    };
  }

  async getUnreadCount(authUser: AuthUser | undefined): Promise<{ unreadCount: number }> {
    const user = await this.resolveCurrentUser(authUser);

    const unreadCount = await this.prisma.userMessage.count({
      where: {
        userId: user.id,
        deletedAt: null,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  async getMessageDetail(authUser: AuthUser | undefined, receiptId: number): Promise<MessageDetailItem> {
    const user = await this.resolveCurrentUser(authUser);

    const receipt = await this.prisma.userMessage.findFirst({
      where: {
        id: BigInt(receiptId),
        userId: user.id,
        deletedAt: null,
      },
      include: {
        message: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Message not found');
    }

    const contentJson = receipt.message.contentJson as MessageContentPayload | null | undefined;
    const formatted = this.formatMessageItem(receipt);
    const sender = await this.resolveSenderInfo(
      receipt.message.senderType,
      receipt.message.senderId,
    );

    return {
      ...formatted,
      contentType: receipt.message.contentType,
      contentJson: contentJson || null,
      senderType: receipt.message.senderType,
      senderId: receipt.message.senderId != null ? toNumber(receipt.message.senderId) : null,
      senderNickname: sender.nickname,
      senderAvatar: sender.avatar,
      deliveredAt: toIso(receipt.deliveredAt || receipt.createdAt),
    };
  }

  private async resolveSenderInfo(
    senderType: string,
    senderId: bigint | null,
  ): Promise<{ nickname: string | null; avatar: string | null }> {
    const normalized = (senderType || '').toUpperCase();

    if (senderId == null) {
      if (normalized === 'SYSTEM') {
        return { nickname: '系统公告', avatar: null };
      }
      return { nickname: null, avatar: null };
    }

    if (normalized === 'ADMIN') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: senderId },
        select: { nickname: true },
      });
      if (!admin) {
        return { nickname: null, avatar: null };
      }
      return { nickname: admin.nickname || null, avatar: null };
    }

    if (normalized === 'MERCHANT') {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: senderId },
        select: { storeName: true, storeLogo: true },
      });
      if (!merchant) {
        return { nickname: null, avatar: null };
      }
      return {
        nickname: merchant.storeName || null,
        avatar: merchant.storeLogo || null,
      };
    }

    if (normalized === 'PLATFORM') {
      return { nickname: '平台公告', avatar: null };
    }

    if (normalized === 'SYSTEM') {
      return { nickname: '系统公告', avatar: null };
    }

    return { nickname: null, avatar: null };
  }

  async markMessageRead(authUser: AuthUser | undefined, receiptId: number) {
    const user = await this.resolveCurrentUser(authUser);

    const now = new Date();
    const result = await this.prisma.userMessage.updateMany({
      where: {
        id: BigInt(receiptId),
        userId: user.id,
        deletedAt: null,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Message not found');
    }

    return {
      receiptId,
      isRead: true,
      readAt: now.toISOString(),
    };
  }

  async markMessagesRead(authUser: AuthUser | undefined, receiptIds: Array<number | bigint | string>) {
    const user = await this.resolveCurrentUser(authUser);
    const ids = normalizeMessageIdList(receiptIds);

    if (ids.length === 0) {
      throw new BadRequestException('Message ids are required');
    }

    const now = new Date();
    const result = await this.prisma.userMessage.updateMany({
      where: {
        id: {
          in: ids,
        },
        userId: user.id,
        deletedAt: null,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return {
      updatedCount: result.count,
      readAt: now.toISOString(),
    };
  }

  async markAllRead(authUser: AuthUser | undefined) {
    const user = await this.resolveCurrentUser(authUser);
    const now = new Date();

    const result = await this.prisma.userMessage.updateMany({
      where: {
        userId: user.id,
        deletedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return {
      updatedCount: result.count,
      readAt: now.toISOString(),
    };
  }

  async sendMessage(input: SendMessageInput) {
    return this.publishMessage(input);
  }

  async deleteMessage(authUser: AuthUser | undefined, receiptId: number) {
    const user = await this.resolveCurrentUser(authUser);
    const now = new Date();
    const result = await this.prisma.userMessage.updateMany({
      where: {
        id: BigInt(receiptId),
        userId: user.id,
        deletedAt: null,
      },
      data: {
        deletedAt: now,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Message not found');
    }

    return {
      receiptId,
      deleted: true,
    };
  }

  async listAdminMessages(query: any = {}) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20) || 20, 20), 100);
    const keyword = String(query.keyword ?? '').trim();

    const where: Prisma.SystemMessageWhereInput = {
      status: { not: 'DELETED' },
      ...(keyword ? {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { summary: { contains: keyword, mode: 'insensitive' } },
        ]
      } : {})
    };

    const [total, items] = await Promise.all([
      this.prisma.systemMessage.count({ where }),
      this.prisma.systemMessage.findMany({
        where,
        orderBy: { publishAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map(item => ({
        id: Number(item.id),
        type: item.type,
        title: item.title,
        summary: item.summary || '',
        publishAt: item.publishAt.toISOString(),
        status: item.status,
        targetType: item.bizType || 'ALL',
      }))
    };
  }

  async deleteAdminMessage(messageId: number) {
    const id = BigInt(messageId);

    const msg = await this.prisma.systemMessage.findUnique({
      where: { id },
    });

    if (!msg) {
      throw new NotFoundException('Message not found');
    }

    await this.prisma.systemMessage.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    await this.prisma.userMessage.updateMany({
      where: { messageId: id },
      data: { deletedAt: new Date() },
    });

    return {
      messageId,
      deleted: true,
    };
  }
}
