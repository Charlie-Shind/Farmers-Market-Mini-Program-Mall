import { Prisma } from '@prisma/client';

export type MessageContentBlock =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'image';
      url: string;
      alt?: string;
    };

export type MessageContentPayload = {
  blocks: MessageContentBlock[];
  preview?: string;
  link?: {
    label?: string;
    url?: string;
    type?: string;
    id?: string;
  };
};

export type SendMessageInput = {
  type: string;
  title: string;
  summary?: string;
  contentType?: string;
  contentJson?: Prisma.InputJsonValue;
  coverImageUrl?: string;
  senderType?: string;
  senderId?: number | bigint;
  bizType?: string;
  bizId?: string;
  publishAt?: string | Date;
  targetUserIds?: Array<number | bigint>;
  broadcast?: boolean;
  targetRoleCode?: string;
};

export type MessageListQuery = {
  page?: number;
  pageSize?: number;
  type?: string;
  isRead?: boolean;
};

export type MessageListItem = {
  receiptId: number;
  messageId: number;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  coverImageUrl: string;
  isRead: boolean;
  publishAt: string;
  dateKey: string;
  readAt: string;
  bizType: string;
  bizId: string;
};

export type MessageDetailItem = MessageListItem & {
  contentType: string;
  contentJson: MessageContentPayload | null;
  senderType: string;
  senderId: number | null;
  senderNickname: string | null;
  senderAvatar: string | null;
  deliveredAt: string;
};

