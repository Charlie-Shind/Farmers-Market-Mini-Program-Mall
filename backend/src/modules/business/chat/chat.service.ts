import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import {
  ChatConversationItem,
  ChatMessageContentType,
  ChatMessageItem,
  ChatSupportTarget,
  OpenChatInput,
  SendChatMessageInput,
} from './chat.types';

function toNumber(value: bigint | number | null | undefined): number {
  return Number(value ?? 0);
}

function toIso(value: Date | null | undefined): string {
  return value ? value.toISOString() : '';
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeOptionalText(value: string | null | undefined): string {
  return value ? normalizeText(value) : '';
}

function normalizeSceneType(value: unknown): 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL' {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'PRODUCT' || normalized === 'ORDER' || normalized === 'OFFICIAL') {
    return normalized;
  }
  return 'GENERAL';
}

function resolveSceneLabel(
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL',
  sceneLabel?: string,
): string {
  const label = normalizeOptionalText(sceneLabel);
  if (label) {
    return label;
  }

  if (sceneType === 'PRODUCT') {
    return '来自商品详情';
  }

  if (sceneType === 'ORDER') {
    return '来自订单';
  }

  if (sceneType === 'OFFICIAL') {
    return '小程序官方客服';
  }

  return '在线客服';
}

function resolveSceneSource(
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL',
  sceneSource?: string,
  productTitle?: string,
  orderNo?: string,
): string {
  const source = normalizeOptionalText(sceneSource);
  if (source) {
    return source;
  }

  if (sceneType === 'PRODUCT') {
    return normalizeOptionalText(productTitle);
  }

  if (sceneType === 'ORDER') {
    return normalizeOptionalText(orderNo);
  }

  if (sceneType === 'OFFICIAL') {
    return '客服入口';
  }

  return '';
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformDataService: PlatformDataService,
  ) {}

  private mapConversationRow(row: any) {
    if (!row) {
      return null;
    }

    const lastMessage = row.lastMessageId
      ? {
          id: row.lastMessageId,
          senderId: row.lastMessageSenderId,
          receiverId: row.lastMessageReceiverId,
          senderRole: row.lastMessageSenderRole,
          contentType: row.lastMessageContentType,
          content: row.lastMessageContent,
          createdAt: row.lastMessageCreatedAt,
          readAt: row.lastMessageReadAt,
        }
      : null;

    return {
      id: row.id,
      conversationKey: row.conversationKey,
      buyerId: row.buyerId,
      merchantId: row.merchantId,
      productId: row.productId,
      orderNo: row.orderNo,
      title: row.title,
      sceneType: row.sceneType,
      sceneLabel: row.sceneLabel,
      sceneSource: row.sceneSource,
      lastMessageId: row.lastMessageId,
      lastMessageAt: row.lastMessageAt,
      buyer: {
        id: row.buyerId,
        nickname: row.buyerNickname,
        avatarUrl: row.buyerAvatarUrl,
      },
      merchant: {
        id: row.merchantId,
        nickname: row.merchantNickname,
        avatarUrl: row.merchantAvatarUrl,
      },
      product: row.productTitle ? { title: row.productTitle } : null,
      lastMessage,
    };
  }

  private mapMessageRow(row: any) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      receiverId: row.receiverId,
      senderRole: row.senderRole,
      contentType: row.contentType,
      content: row.content,
      attachments: row.attachments,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  private async queryConversationById(conversationId: number) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id AS id,
        c.conversation_key AS "conversationKey",
        c.buyer_id AS "buyerId",
        c.merchant_id AS "merchantId",
        c.product_id AS "productId",
        c.order_no AS "orderNo",
        c.title AS title,
        c.scene_type AS "sceneType",
        c.scene_label AS "sceneLabel",
        c.scene_source AS "sceneSource",
        c.last_message_id AS "lastMessageId",
        c.last_message_at AS "lastMessageAt",
        buyer.nickname AS "buyerNickname",
        buyer.avatar_url AS "buyerAvatarUrl",
        merchant.nickname AS "merchantNickname",
        merchant.avatar_url AS "merchantAvatarUrl",
        p.title AS "productTitle",
        lm.id AS "lastMessageIdRef",
        lm.sender_id AS "lastMessageSenderId",
        lm.receiver_id AS "lastMessageReceiverId",
        lm.sender_role AS "lastMessageSenderRole",
        lm.content_type AS "lastMessageContentType",
        lm.content AS "lastMessageContent",
        lm.created_at AS "lastMessageCreatedAt",
        lm.read_at AS "lastMessageReadAt"
      FROM chat_conversation c
      JOIN "user" buyer ON buyer.id = c.buyer_id AND buyer.deleted_at IS NULL
      JOIN "user" merchant ON merchant.id = c.merchant_id AND merchant.deleted_at IS NULL
      LEFT JOIN product p ON p.id = c.product_id AND p.deleted_at IS NULL
      LEFT JOIN chat_message lm ON lm.id = c.last_message_id AND lm.deleted_at IS NULL
      WHERE c.id = ${BigInt(conversationId)} AND c.deleted_at IS NULL
      LIMIT 1
    `);

    return this.mapConversationRow(rows[0] ?? null);
  }

  private async queryConversationByKey(conversationKey: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id AS id,
        c.conversation_key AS "conversationKey",
        c.buyer_id AS "buyerId",
        c.merchant_id AS "merchantId",
        c.product_id AS "productId",
        c.order_no AS "orderNo",
        c.title AS title,
        c.scene_type AS "sceneType",
        c.scene_label AS "sceneLabel",
        c.scene_source AS "sceneSource",
        c.last_message_id AS "lastMessageId",
        c.last_message_at AS "lastMessageAt",
        buyer.nickname AS "buyerNickname",
        buyer.avatar_url AS "buyerAvatarUrl",
        merchant.nickname AS "merchantNickname",
        merchant.avatar_url AS "merchantAvatarUrl",
        p.title AS "productTitle",
        lm.id AS "lastMessageIdRef",
        lm.sender_id AS "lastMessageSenderId",
        lm.receiver_id AS "lastMessageReceiverId",
        lm.sender_role AS "lastMessageSenderRole",
        lm.content_type AS "lastMessageContentType",
        lm.content AS "lastMessageContent",
        lm.created_at AS "lastMessageCreatedAt",
        lm.read_at AS "lastMessageReadAt"
      FROM chat_conversation c
      JOIN "user" buyer ON buyer.id = c.buyer_id AND buyer.deleted_at IS NULL
      JOIN "user" merchant ON merchant.id = c.merchant_id AND merchant.deleted_at IS NULL
      LEFT JOIN product p ON p.id = c.product_id AND p.deleted_at IS NULL
      LEFT JOIN chat_message lm ON lm.id = c.last_message_id AND lm.deleted_at IS NULL
      WHERE c.conversation_key = ${conversationKey} AND c.deleted_at IS NULL
      LIMIT 1
    `);

    return this.mapConversationRow(rows[0] ?? null);
  }

  private async queryConversationRows(whereSql: Prisma.Sql) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id AS id,
        c.conversation_key AS "conversationKey",
        c.buyer_id AS "buyerId",
        c.merchant_id AS "merchantId",
        c.product_id AS "productId",
        c.order_no AS "orderNo",
        c.title AS title,
        c.scene_type AS "sceneType",
        c.scene_label AS "sceneLabel",
        c.scene_source AS "sceneSource",
        c.last_message_id AS "lastMessageId",
        c.last_message_at AS "lastMessageAt",
        buyer.nickname AS "buyerNickname",
        buyer.avatar_url AS "buyerAvatarUrl",
        merchant.nickname AS "merchantNickname",
        merchant.avatar_url AS "merchantAvatarUrl",
        p.title AS "productTitle",
        lm.id AS "lastMessageIdRef",
        lm.sender_id AS "lastMessageSenderId",
        lm.receiver_id AS "lastMessageReceiverId",
        lm.sender_role AS "lastMessageSenderRole",
        lm.content_type AS "lastMessageContentType",
        lm.content AS "lastMessageContent",
        lm.created_at AS "lastMessageCreatedAt",
        lm.read_at AS "lastMessageReadAt"
      FROM chat_conversation c
      JOIN "user" buyer ON buyer.id = c.buyer_id AND buyer.deleted_at IS NULL
      JOIN "user" merchant ON merchant.id = c.merchant_id AND merchant.deleted_at IS NULL
      LEFT JOIN product p ON p.id = c.product_id AND p.deleted_at IS NULL
      LEFT JOIN chat_message lm ON lm.id = c.last_message_id AND lm.deleted_at IS NULL
      WHERE c.deleted_at IS NULL AND ${whereSql}
      ORDER BY c.last_message_at DESC, c.id DESC
    `);

    return rows.map((row) => this.mapConversationRow(row));
  }

  private async queryConversationRowsForBuyer(userId: bigint) {
    return this.queryConversationRows(Prisma.sql`c.buyer_id = ${userId}`);
  }

  private async queryConversationRowsForMerchant(userId: bigint) {
    return this.queryConversationRows(Prisma.sql`c.merchant_id = ${userId}`);
  }

  private buildConversationSearchWhereSql(query: Record<string, string>) {
    const conditions: Prisma.Sql[] = [Prisma.sql`c.deleted_at IS NULL`];
    const keyword = normalizeOptionalText(query.keyword);
    const sceneType = normalizeOptionalText(query.sceneType).toUpperCase();
    const merchantId = Number(query.merchantId ?? 0);

    if (keyword) {
      const like = `%${keyword}%`;
      conditions.push(Prisma.sql`
        (
          c.conversation_key ILIKE ${like}
          OR c.title ILIKE ${like}
          OR c.scene_label ILIKE ${like}
          OR c.scene_source ILIKE ${like}
          OR buyer.nickname ILIKE ${like}
          OR merchant.nickname ILIKE ${like}
          OR p.title ILIKE ${like}
          OR c.order_no ILIKE ${like}
        )
      `);
    }

    if (sceneType && ['GENERAL', 'PRODUCT', 'ORDER', 'OFFICIAL'].includes(sceneType)) {
      conditions.push(Prisma.sql`c.scene_type = ${sceneType}`);
    }

    if (Number.isFinite(merchantId) && merchantId > 0) {
      conditions.push(Prisma.sql`c.merchant_id = ${BigInt(merchantId)}`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  async listAdminConversations(query: Record<string, string>) {
    const page = Math.max(Number(query.page ?? 1) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const whereSql = this.buildConversationSearchWhereSql(query);

    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM chat_conversation c
      JOIN "user" buyer ON buyer.id = c.buyer_id AND buyer.deleted_at IS NULL
      JOIN "user" merchant ON merchant.id = c.merchant_id AND merchant.deleted_at IS NULL
      LEFT JOIN product p ON p.id = c.product_id AND p.deleted_at IS NULL
      WHERE ${whereSql}
    `);

    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id AS id,
        c.conversation_key AS "conversationKey",
        c.buyer_id AS "buyerId",
        c.merchant_id AS "merchantId",
        c.product_id AS "productId",
        c.order_no AS "orderNo",
        c.title AS title,
        c.scene_type AS "sceneType",
        c.scene_label AS "sceneLabel",
        c.scene_source AS "sceneSource",
        c.last_message_id AS "lastMessageId",
        c.last_message_at AS "lastMessageAt",
        buyer.nickname AS "buyerNickname",
        buyer.avatar_url AS "buyerAvatarUrl",
        merchant.nickname AS "merchantNickname",
        merchant.avatar_url AS "merchantAvatarUrl",
        p.title AS "productTitle",
        lm.id AS "lastMessageIdRef",
        lm.sender_id AS "lastMessageSenderId",
        lm.receiver_id AS "lastMessageReceiverId",
        lm.sender_role AS "lastMessageSenderRole",
        lm.content_type AS "lastMessageContentType",
        lm.content AS "lastMessageContent",
        lm.created_at AS "lastMessageCreatedAt",
        lm.read_at AS "lastMessageReadAt"
      FROM chat_conversation c
      JOIN "user" buyer ON buyer.id = c.buyer_id AND buyer.deleted_at IS NULL
      JOIN "user" merchant ON merchant.id = c.merchant_id AND merchant.deleted_at IS NULL
      LEFT JOIN product p ON p.id = c.product_id AND p.deleted_at IS NULL
      LEFT JOIN chat_message lm ON lm.id = c.last_message_id AND lm.deleted_at IS NULL
      WHERE ${whereSql}
      ORDER BY c.last_message_at DESC, c.id DESC
      OFFSET ${offset} LIMIT ${pageSize}
    `);

    const items = rows.map((row) => this.mapConversationRow(row)).filter(Boolean) as any[];
    if (!items.length) {
      return {
        page,
        pageSize,
        total: Number(countRows[0]?.count ?? 0),
        items: [],
      };
    }

    const unreadCounts = await this.chatPrisma.chatMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: {
          in: items.map((item) => BigInt(item.id)),
        },
        readAt: null,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    });
    const unreadMap = new Map<string, number>();
    unreadCounts.forEach((item: { conversationId: bigint; _count: { _all: number | bigint } }) => {
      unreadMap.set(item.conversationId.toString(), Number(item._count._all ?? 0));
    });

    return {
      page,
      pageSize,
      total: Number(countRows[0]?.count ?? 0),
      items: items.map((conversation) =>
        this.formatConversationItem({
          conversation: {
            id: BigInt(conversation.id),
            conversationKey: conversation.conversationKey,
            buyerId: BigInt(conversation.buyerId),
            merchantId: BigInt(conversation.merchantId),
            productId: conversation.productId != null ? BigInt(conversation.productId) : null,
            orderNo: conversation.orderNo || null,
            title: conversation.title || null,
            sceneType: conversation.sceneType,
            sceneLabel: conversation.sceneLabel,
            sceneSource: conversation.sceneSource,
            lastMessageId: conversation.lastMessageId != null ? BigInt(conversation.lastMessageId) : null,
            lastMessageAt: new Date(conversation.lastMessageAt),
            buyer: {
              id: BigInt(conversation.buyerId),
              nickname: conversation.buyerName,
              avatarUrl: conversation.buyerAvatar,
            },
            merchant: {
              id: BigInt(conversation.merchantId),
              nickname: conversation.merchantName,
              avatarUrl: conversation.merchantLogo,
            },
            product: conversation.productTitle ? { title: conversation.productTitle } : null,
            lastMessage: null,
          },
          unreadCount: unreadMap.get(String(conversation.conversationId)) ?? 0,
          currentUserId: 0n,
        }),
      ),
    };
  }

  async getAdminConversation(conversationId: number) {
    const conversation = await this.resolveConversationOrThrow(conversationId);
    return this.formatConversationItem({
      conversation,
      unreadCount: 0,
      currentUserId: 0n,
    });
  }

  async listAdminMessages(conversationId: number, page = 1, pageSize = 20) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 20), 100);
    const skip = (safePage - 1) * safePageSize;
    const [total, messages] = await Promise.all([
      this.chatPrisma.chatMessage.count({
        where: {
          conversationId: BigInt(conversationId),
          deletedAt: null,
        },
      }),
      this.chatPrisma.chatMessage.findMany({
        where: {
          conversationId: BigInt(conversationId),
          deletedAt: null,
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip,
        take: safePageSize,
      }),
    ]);

    return {
      conversationId,
      page: safePage,
      pageSize: safePageSize,
      total,
      items: [...messages].reverse().filter(Boolean).map((message) => this.formatMessageItem(message as any, 0n)),
    };
  }

  private async queryMessages(conversationId: number, skip: number, take: number) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        conversation_id AS "conversationId",
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        sender_role AS "senderRole",
        content_type AS "contentType",
        content,
        attachments,
        read_at AS "readAt",
        created_at AS "createdAt"
      FROM chat_message
      WHERE conversation_id = ${BigInt(conversationId)} AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      OFFSET ${skip} LIMIT ${take}
    `);

    return rows.map((row) => this.mapMessageRow(row));
  }

  private async queryConversationMessageCount(conversationId: number) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM chat_message
      WHERE conversation_id = ${BigInt(conversationId)} AND deleted_at IS NULL
    `);

    return Number(rows[0]?.count ?? 0);
  }

  private async queryUnreadMessageCount(receiverId: bigint) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM chat_message
      WHERE receiver_id = ${receiverId} AND read_at IS NULL AND deleted_at IS NULL
    `);

    return Number(rows[0]?.count ?? 0);
  }

  private async queryUnreadCounts(conversationIds: bigint[], receiverId: bigint) {
    if (!conversationIds.length) {
      return [];
    }

    const rows = await this.prisma.$queryRaw<Array<{ conversationId: bigint; count: bigint }>>(Prisma.sql`
      SELECT
        conversation_id AS "conversationId",
        COUNT(*)::bigint AS count
      FROM chat_message
      WHERE conversation_id IN (${Prisma.join(conversationIds)})
        AND receiver_id = ${receiverId}
        AND read_at IS NULL
        AND deleted_at IS NULL
      GROUP BY conversation_id
    `);

    return rows;
  }

  private async createMessageRecord(data: {
    conversationId: bigint;
    senderId: bigint;
    receiverId: bigint;
    senderRole: string;
    contentType: string;
    content: string;
    attachments: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO chat_message (
        conversation_id,
        sender_id,
        receiver_id,
        sender_role,
        content_type,
        content,
        attachments,
        created_at,
        updated_at
      ) VALUES (
        ${data.conversationId},
        ${data.senderId},
        ${data.receiverId},
        ${data.senderRole},
        ${data.contentType},
        ${data.content},
        ${data.attachments},
        ${data.createdAt},
        ${data.createdAt}
      )
      RETURNING
        id,
        conversation_id AS "conversationId",
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        sender_role AS "senderRole",
        content_type AS "contentType",
        content,
        attachments,
        read_at AS "readAt",
        created_at AS "createdAt"
    `);

    const created = this.mapMessageRow(rows[0] ?? null);
    if (!created) {
      throw new Error('Failed to create chat message');
    }

    return created;
  }

  private async insertConversationMessage(
    tx: Prisma.TransactionClient,
    data: {
      conversationId: bigint;
      senderId: bigint;
      receiverId: bigint;
      senderRole: string;
      contentType: string;
      content: string;
      attachments: Prisma.InputJsonValue | Prisma.JsonValue | null;
      createdAt: Date;
    },
  ) {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO chat_message (
        conversation_id,
        sender_id,
        receiver_id,
        sender_role,
        content_type,
        content,
        attachments,
        created_at,
        updated_at
      ) VALUES (
        ${data.conversationId},
        ${data.senderId},
        ${data.receiverId},
        ${data.senderRole},
        ${data.contentType},
        ${data.content},
        ${data.attachments},
        ${data.createdAt},
        ${data.createdAt}
      )
      RETURNING
        id,
        conversation_id AS "conversationId",
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        sender_role AS "senderRole",
        content_type AS "contentType",
        content,
        attachments,
        read_at AS "readAt",
        created_at AS "createdAt"
    `);

    const created = this.mapMessageRow(rows[0] ?? null);
    if (!created) {
      throw new Error('Failed to create chat message');
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE chat_conversation
      SET last_message_id = ${created.id},
          last_message_at = ${data.createdAt},
          updated_at = ${data.createdAt}
      WHERE id = ${data.conversationId}
    `);

    return created;
  }

  private async updateConversationLastMessage(conversationId: bigint, lastMessageId: bigint, lastMessageAt: Date) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE chat_conversation
      SET last_message_id = ${lastMessageId},
          last_message_at = ${lastMessageAt},
          updated_at = ${lastMessageAt}
      WHERE id = ${conversationId}
    `);
  }

  private async markConversationMessagesRead(conversationId: bigint, receiverId: bigint, now: Date) {
    const result = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE chat_message
      SET read_at = ${now}
      WHERE conversation_id = ${conversationId}
        AND receiver_id = ${receiverId}
        AND read_at IS NULL
        AND deleted_at IS NULL
    `);

    return Number(result ?? 0);
  }

  private get chatPrisma() {
    return {
      chatConversation: {
        findUnique: async (args: any) => this.queryConversationById(Number(args.where.id)),
        upsert: async ({ where, create, update }: any) => {
          await this.prisma.$executeRaw(Prisma.sql`
            INSERT INTO chat_conversation (
              conversation_key,
              buyer_id,
              merchant_id,
              product_id,
              order_no,
              title,
              scene_type,
              scene_label,
              scene_source,
              last_message_at,
              status,
              created_at,
              updated_at
            ) VALUES (
              ${create.conversationKey},
              ${create.buyerId},
              ${create.merchantId},
              ${create.productId},
              ${create.orderNo},
              ${update.title ?? create.title},
              ${create.sceneType ?? 'GENERAL'},
              ${create.sceneLabel ?? ''},
              ${create.sceneSource ?? ''},
              ${create.lastMessageAt},
              'ACTIVE',
              ${create.lastMessageAt},
              ${create.lastMessageAt}
            )
            ON CONFLICT (conversation_key) DO UPDATE SET
              title = EXCLUDED.title,
              scene_type = CASE
                WHEN EXCLUDED.scene_type <> '' THEN EXCLUDED.scene_type
                ELSE chat_conversation.scene_type
              END,
              scene_label = CASE
                WHEN EXCLUDED.scene_label <> '' THEN EXCLUDED.scene_label
                ELSE chat_conversation.scene_label
              END,
              scene_source = CASE
                WHEN EXCLUDED.scene_source <> '' THEN EXCLUDED.scene_source
                ELSE chat_conversation.scene_source
              END,
              product_id = COALESCE(EXCLUDED.product_id, chat_conversation.product_id),
              order_no = COALESCE(EXCLUDED.order_no, chat_conversation.order_no),
              updated_at = EXCLUDED.updated_at
          `);

          const conversation = await this.queryConversationByKey(where.conversationKey);
          if (!conversation) {
            throw new NotFoundException('Conversation not found');
          }
          return conversation;
        },
        findMany: async ({ where }: any) => {
          if (where.buyerId) {
            return this.queryConversationRowsForBuyer(where.buyerId);
          }

          if (where.merchantId) {
            return this.queryConversationRowsForMerchant(where.merchantId);
          }

          return [];
        },
        update: async ({ where, data }: any) => {
          if (data.lastMessageId && data.lastMessageAt) {
            await this.updateConversationLastMessage(where.id, data.lastMessageId, data.lastMessageAt);
          }
          return this.queryConversationById(Number(where.id));
        },
      },
      chatMessage: {
        groupBy: async ({ where }: any) => {
          const ids = where.conversationId?.in ?? [];
          const rows = await this.queryUnreadCounts(ids, where.receiverId as bigint);
          return rows.map((item) => ({
            conversationId: item.conversationId,
            _count: {
              _all: item.count,
            },
          }));
        },
        count: async ({ where }: any) => {
          if (where.conversationId) {
            return this.queryConversationMessageCount(Number(where.conversationId));
          }

          if (where.receiverId) {
            return this.queryUnreadMessageCount(where.receiverId);
          }

          return 0;
        },
        findMany: async ({ where, skip, take }: any) => {
          if (!where.conversationId) {
            return [];
          }

          return this.queryMessages(Number(where.conversationId), skip ?? 0, take ?? 30);
        },
        create: async ({ data }: any) => this.createMessageRecord(data),
        updateMany: async ({ where, data }: any) => {
          const count = await this.markConversationMessagesRead(where.conversationId, where.receiverId, data.readAt);
          return { count };
        },
      },
    };
  }

  private async resolveCurrentUser(authUser: AuthUser | undefined): Promise<User> {
    if (!authUser || ![RoleCode.GUEST, RoleCode.USER, RoleCode.MERCHANT, RoleCode.LEADER].includes(authUser.role)) {
      throw new UnauthorizedException('Chat requires a user session');
    }

    const user = await this.prisma.user.findUnique({
      where: { openid: authUser.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Chat requires a bound user account');
    }

    if (user.status !== 1) {
      throw new ForbiddenException('User account is disabled');
    }

    return user;
  }

  private async resolveMerchantUser(authUser: AuthUser | undefined): Promise<User> {
    const user = await this.resolveCurrentUser(authUser);

    if (authUser?.role !== RoleCode.MERCHANT) {
      throw new ForbiddenException('Merchant session is required');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!merchant) {
      throw new ForbiddenException('Merchant profile is required');
    }

    return user;
  }

  private buildConversationKey(params: {
    buyerId: bigint;
    merchantId: bigint;
  }): string {
    return [`buyer:${params.buyerId.toString()}`, `merchant:${params.merchantId.toString()}`].join('|');
  }

  private async resolveMerchantUserById(merchantId: number): Promise<User> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: BigInt(merchantId) },
      include: {
        user: true,
      },
    });

    if (!merchant || merchant.deletedAt) {
      throw new NotFoundException('Merchant not found');
    }

    if (merchant.user.status !== 1) {
      throw new ForbiddenException('Merchant account is disabled');
    }

    return merchant.user;
  }

  async getSupportTarget(): Promise<ChatSupportTarget> {
    const target = await this.platformDataService.getChatSupportTarget();
    return {
      merchantId: target.merchantId,
      merchantName: target.merchantName,
      merchantLogo: target.merchantLogo,
      hotline: target.hotline,
      source: target.source,
      sceneType: target.sceneType,
      sceneLabel: target.sceneLabel,
      sceneSource: target.sceneSource,
    };
  }

  private async resolveProductTitle(productId?: number): Promise<string> {
    if (!productId) {
      return '';
    }

    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      select: { title: true },
    });

    return product?.title ?? '';
  }

  private async resolveConversationOrThrow(conversationId: number): Promise<{
    id: bigint;
    conversationKey: string;
    buyerId: bigint;
    merchantId: bigint;
    productId: bigint | null;
    orderNo: string | null;
    sceneType: string;
    sceneLabel: string;
    sceneSource: string;
    lastMessageId: bigint | null;
    lastMessageAt: Date;
    title: string | null;
    buyer: { id: bigint; nickname: string | null; avatarUrl: string | null };
    merchant: { id: bigint; nickname: string | null; avatarUrl: string | null };
    product: { title: string } | null;
    lastMessage: {
      id: bigint;
      senderId: bigint;
      receiverId: bigint;
      senderRole: string;
      contentType: string;
      content: string;
      createdAt: Date;
      readAt: Date | null;
    } | null;
  }> {
    const conversation = await this.chatPrisma.chatConversation.findUnique({
      where: { id: BigInt(conversationId) },
      include: {
        buyer: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        merchant: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        product: {
          select: {
            title: true,
          },
        },
        lastMessage: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private formatConversationItem(params: {
    conversation: {
      id: bigint;
      conversationKey: string;
      buyerId: bigint;
      merchantId: bigint;
      productId: bigint | null;
      orderNo: string | null;
      title: string | null;
      sceneType: string;
      sceneLabel: string;
      sceneSource: string;
      lastMessageId: bigint | null;
      lastMessageAt: Date;
      buyer: { id: bigint; nickname: string | null; avatarUrl: string | null };
      merchant: { id: bigint; nickname: string | null; avatarUrl: string | null };
      product: { title: string } | null;
      lastMessage: {
        id: bigint;
        senderId: bigint;
        receiverId: bigint;
        senderRole: string;
        contentType: string;
        content: string;
        createdAt: Date;
        readAt: Date | null;
      } | null;
    };
    unreadCount: number;
    currentUserId: bigint;
  }): ChatConversationItem {
    const { conversation, unreadCount, currentUserId } = params;
    const merchantName = normalizeOptionalText(conversation.merchant.nickname) || '商家客服';
    const buyerName = normalizeOptionalText(conversation.buyer.nickname) || '买家';
    const merchantLogo = normalizeOptionalText(conversation.merchant.avatarUrl);
    const buyerAvatar = normalizeOptionalText(conversation.buyer.avatarUrl);
    const lastMessage = conversation.lastMessage;

    return {
      conversationId: toNumber(conversation.id),
      conversationKey: conversation.conversationKey,
      merchantId: toNumber(conversation.merchantId),
      merchantName,
      merchantLogo,
      buyerId: toNumber(conversation.buyerId),
      buyerName,
      buyerAvatar,
      orderNo: conversation.orderNo ?? '',
      productId: conversation.productId ? toNumber(conversation.productId) : null,
      productTitle: conversation.product?.title ?? conversation.title ?? '',
      sceneType: normalizeSceneType(conversation.sceneType),
      sceneLabel: resolveSceneLabel(normalizeSceneType(conversation.sceneType), conversation.sceneLabel),
      sceneSource: normalizeOptionalText(conversation.sceneSource),
      lastMessageId: lastMessage ? toNumber(lastMessage.id) : null,
      lastMessageContent: lastMessage?.content ?? '',
      lastMessageType: (lastMessage?.contentType as ChatMessageContentType) ?? 'TEXT',
      lastMessageAt: toIso(conversation.lastMessageAt),
      unreadCount,
      isMine: toNumber(conversation.buyerId) === toNumber(currentUserId) || toNumber(conversation.merchantId) === toNumber(currentUserId),
    };
  }

  private formatMessageItem(message: {
    id: bigint;
    conversationId: bigint;
    senderId: bigint;
    receiverId: bigint;
    senderRole: string;
    contentType: string;
    content: string;
    attachments: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }, currentUserId: bigint): ChatMessageItem {
    return {
      messageId: toNumber(message.id),
      conversationId: toNumber(message.conversationId),
      senderId: toNumber(message.senderId),
      receiverId: toNumber(message.receiverId),
      senderRole: message.senderRole,
      contentType: message.contentType as ChatMessageItem['contentType'],
      content: message.content,
      attachments: message.attachments,
      readAt: toIso(message.readAt),
      createdAt: toIso(message.createdAt),
      isMine: toNumber(message.senderId) === toNumber(currentUserId),
    };
  }

  async openConversation(authUser: AuthUser | undefined, input: OpenChatInput) {
    const buyer = await this.resolveCurrentUser(authUser);
    const productId = input.productId ? BigInt(input.productId) : null;
    const orderNo = normalizeOptionalText(input.orderNo) || null;
    const productTitle = await this.resolveProductTitle(input.productId);
    const explicitSceneType = input.sceneType ? normalizeSceneType(input.sceneType) : undefined;
    const supportTarget = await this.platformDataService.getChatSupportTarget().catch(() => null);
    const resolvedMerchantId = explicitSceneType === 'OFFICIAL' ? supportTarget?.merchantId ?? input.merchantId : input.merchantId;

    if (!resolvedMerchantId || Number.isNaN(Number(resolvedMerchantId))) {
      throw new BadRequestException('Merchant ID is required');
    }

    const merchantUser = await this.resolveMerchantUserById(resolvedMerchantId);
    const isPlatformSupport = supportTarget ? supportTarget.merchantId === resolvedMerchantId : false;
    const sceneType = normalizeSceneType(
      explicitSceneType ??
        (orderNo ? 'ORDER' : productId ? 'PRODUCT' : isPlatformSupport ? 'OFFICIAL' : 'GENERAL'),
    );
    const sceneLabel = resolveSceneLabel(sceneType, input.sceneLabel);
    const sceneSource = resolveSceneSource(sceneType, input.sceneSource, productTitle, orderNo ?? undefined);
    const conversationKey = this.buildConversationKey({
      buyerId: buyer.id,
      merchantId: merchantUser.id,
    });

    const conversation = await this.chatPrisma.chatConversation.upsert({
      where: { conversationKey },
      create: {
        conversationKey,
        buyerId: buyer.id,
        merchantId: merchantUser.id,
        productId,
        orderNo,
        title: productTitle || merchantUser.nickname || '客服会话',
        sceneType,
        sceneLabel,
        sceneSource,
        lastMessageAt: new Date(),
      },
      update: {
        title: productTitle || merchantUser.nickname || '客服会话',
        sceneType,
        sceneLabel,
        sceneSource,
        ...(productId ? { productId } : {}),
        ...(orderNo ? { orderNo } : {}),
      },
      include: {
        buyer: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        merchant: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        product: {
          select: {
            title: true,
          },
        },
        lastMessage: true,
      },
    });

    return {
      ...this.formatConversationItem({
        conversation,
        unreadCount: 0,
        currentUserId: buyer.id,
      }),
      opened: true,
    };
  }

  async listBuyerConversations(authUser: AuthUser | undefined) {
    const user = await this.resolveCurrentUser(authUser);

    const conversations = await this.chatPrisma.chatConversation.findMany({
      where: {
        buyerId: user.id,
        deletedAt: null,
      },
      include: {
        buyer: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        merchant: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        product: {
          select: {
            title: true,
          },
        },
        lastMessage: true,
      },
      orderBy: [
        {
          lastMessageAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });

    const unreadCounts = await this.chatPrisma.chatMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: {
          in: conversations.map((item: any) => item.id),
        },
        receiverId: user.id,
        readAt: null,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    });
    const unreadMap = new Map<string, number>();
    unreadCounts.forEach((item: { conversationId: bigint; _count: { _all: number | bigint } }) => {
      unreadMap.set(item.conversationId.toString(), Number(item._count._all ?? 0));
    });

    return conversations.map((conversation: any) =>
      this.formatConversationItem({
        conversation,
        unreadCount: unreadMap.get(conversation.id.toString()) ?? 0,
        currentUserId: user.id,
      }),
    );
  }

  async listMerchantConversations(authUser: AuthUser | undefined) {
    const user = await this.resolveMerchantUser(authUser);

    const conversations = await this.chatPrisma.chatConversation.findMany({
      where: {
        merchantId: user.id,
        deletedAt: null,
      },
      include: {
        buyer: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        merchant: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        product: {
          select: {
            title: true,
          },
        },
        lastMessage: true,
      },
      orderBy: [
        {
          lastMessageAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });

    const unreadCounts = await this.chatPrisma.chatMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: {
          in: conversations.map((item: any) => item.id),
        },
        receiverId: user.id,
        readAt: null,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    });
    const unreadMap = new Map<string, number>();
    unreadCounts.forEach((item: { conversationId: bigint; _count: { _all: number | bigint } }) => {
      unreadMap.set(item.conversationId.toString(), Number(item._count._all ?? 0));
    });

    return conversations.map((conversation: any) =>
      this.formatConversationItem({
        conversation,
        unreadCount: unreadMap.get(conversation.id.toString()) ?? 0,
        currentUserId: user.id,
      }),
    );
  }

  async listMessages(authUser: AuthUser | undefined, conversationId: number, page = 1, pageSize = 20) {
    const user = authUser?.role === RoleCode.MERCHANT ? await this.resolveMerchantUser(authUser) : await this.resolveCurrentUser(authUser);
    const conversation = await this.resolveConversationOrThrow(conversationId);
    const conversationUserId = conversation.buyerId.toString() === user.id.toString() || conversation.merchantId.toString() === user.id.toString();

    if (!conversationUserId) {
      throw new ForbiddenException('Conversation access denied');
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 20), 100);
    const skip = (safePage - 1) * safePageSize;

    const [total, messages] = await Promise.all([
      this.chatPrisma.chatMessage.count({
        where: {
          conversationId: BigInt(conversationId),
          deletedAt: null,
        },
      }),
      this.chatPrisma.chatMessage.findMany({
        where: {
          conversationId: BigInt(conversationId),
          deletedAt: null,
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip,
        take: safePageSize,
      }),
    ]);

    const reversed = [...messages].reverse();

    return {
      conversationId,
      page: safePage,
      pageSize: safePageSize,
      total,
       items: reversed.filter(Boolean).map((message) => this.formatMessageItem(message as any, user.id)),
    };
  }

  async sendMessage(authUser: AuthUser | undefined, input: SendChatMessageInput) {
    const user = authUser?.role === RoleCode.MERCHANT ? await this.resolveMerchantUser(authUser) : await this.resolveCurrentUser(authUser);
    const conversation = await this.resolveConversationOrThrow(input.conversationId);

    const isBuyer = conversation.buyerId.toString() === user.id.toString();
    const isMerchant = conversation.merchantId.toString() === user.id.toString();
    if (!isBuyer && !isMerchant) {
      throw new ForbiddenException('Conversation access denied');
    }

    const receiverId = isBuyer ? conversation.merchantId : conversation.buyerId;
    const content = normalizeText(input.content);

    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    const createdAt = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      return this.insertConversationMessage(tx, {
        conversationId: BigInt(input.conversationId),
        senderId: user.id,
        receiverId,
        senderRole: authUser?.role === RoleCode.GUEST ? RoleCode.GUEST : isMerchant ? RoleCode.MERCHANT : RoleCode.USER,
        contentType: input.contentType ?? 'TEXT',
        content,
        attachments: input.attachments ?? null,
        createdAt,
      });
    });

    return this.formatMessageItem(message, user.id);
  }

  async sendAdminMessage(_authUser: AuthUser | undefined, input: SendChatMessageInput) {
    const conversation = await this.resolveConversationOrThrow(input.conversationId);
    const supportTarget = await this.platformDataService.getChatSupportTarget();
    const supportMerchantUser = await this.resolveMerchantUserById(supportTarget.merchantId);

    if (conversation.merchantId.toString() !== supportMerchantUser.id.toString()) {
      throw new ForbiddenException('Only platform support conversations can be replied to');
    }

    const content = normalizeText(input.content);
    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    const createdAt = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      return this.insertConversationMessage(tx, {
        conversationId: BigInt(input.conversationId),
        senderId: supportMerchantUser.id,
        receiverId: conversation.buyerId,
        senderRole: RoleCode.MERCHANT,
        contentType: input.contentType ?? 'TEXT',
        content,
        attachments: input.attachments ?? null,
        createdAt,
      });
    });

    return this.formatMessageItem(message, supportMerchantUser.id);
  }

  async markConversationRead(authUser: AuthUser | undefined, conversationId: number) {
    const user = authUser?.role === RoleCode.MERCHANT ? await this.resolveMerchantUser(authUser) : await this.resolveCurrentUser(authUser);
    const conversation = await this.resolveConversationOrThrow(conversationId);

    if (conversation.buyerId.toString() !== user.id.toString() && conversation.merchantId.toString() !== user.id.toString()) {
      throw new ForbiddenException('Conversation access denied');
    }

    const now = new Date();
    const result = await this.chatPrisma.chatMessage.updateMany({
      where: {
        conversationId: BigInt(conversationId),
        receiverId: user.id,
        readAt: null,
        deletedAt: null,
      },
      data: {
        readAt: now,
      },
    });

    return {
      conversationId,
      updatedCount: result.count,
      readAt: now.toISOString(),
    };
  }

  async getBuyerUnreadCount(authUser: AuthUser | undefined) {
    const user = await this.resolveCurrentUser(authUser);
    const count = await this.chatPrisma.chatMessage.count({
      where: {
        receiverId: user.id,
        readAt: null,
        deletedAt: null,
      },
    });

    return { unreadCount: count };
  }

  async getMerchantUnreadCount(authUser: AuthUser | undefined) {
    const user = await this.resolveMerchantUser(authUser);
    const count = await this.chatPrisma.chatMessage.count({
      where: {
        receiverId: user.id,
        readAt: null,
        deletedAt: null,
      },
    });

    return { unreadCount: count };
  }
}
