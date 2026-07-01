import { Prisma } from '@prisma/client';

export type ChatMessageContentType = 'TEXT' | 'IMAGE';

export type ChatSceneType = 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';

export type OpenChatInput = {
  merchantId?: number;
  productId?: number;
  orderNo?: string;
  sceneType?: ChatSceneType;
  sceneLabel?: string;
  sceneSource?: string;
};

export type ChatSupportTarget = {
  merchantId: number;
  merchantName: string;
  merchantLogo: string;
  hotline: string;
  source: 'CONFIGURED' | 'FALLBACK';
  sceneType: ChatSceneType;
  sceneLabel: string;
  sceneSource: string;
};

export type SendChatMessageInput = {
  conversationId: number;
  content: string;
  contentType?: ChatMessageContentType;
  attachments?: Prisma.InputJsonValue;
};

export type ChatConversationItem = {
  conversationId: number;
  conversationKey: string;
  merchantId: number;
  merchantName: string;
  merchantLogo: string;
  buyerId: number;
  buyerName: string;
  buyerAvatar: string;
  orderNo: string;
  productId: number | null;
  productTitle: string;
  sceneType: ChatSceneType;
  sceneLabel: string;
  sceneSource: string;
  lastMessageId: number | null;
  lastMessageContent: string;
  lastMessageType: ChatMessageContentType;
  lastMessageAt: string;
  unreadCount: number;
  isMine: boolean;
};

export type ChatMessageItem = {
  messageId: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  senderRole: string;
  contentType: ChatMessageContentType;
  content: string;
  attachments: Prisma.JsonValue | null;
  readAt: string;
  createdAt: string;
  isMine: boolean;
};
