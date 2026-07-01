import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { ChatService } from './chat.service';
import { ChatSceneType } from './chat.types';

function parseOptionalPositiveNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

@Controller('app/chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('open')
  async openConversation(@CurrentUser() user: AuthUser | undefined, @Body() body: Record<string, unknown>) {
    return this.chatService.openConversation(user, {
      merchantId: parseOptionalPositiveNumber(body.merchantId),
      productId: parseOptionalPositiveNumber(body.productId),
      orderNo: typeof body.orderNo === 'string' ? body.orderNo : undefined,
      sceneType: typeof body.sceneType === 'string' ? (body.sceneType.toUpperCase() as ChatSceneType) : undefined,
      sceneLabel: typeof body.sceneLabel === 'string' ? body.sceneLabel : undefined,
      sceneSource: typeof body.sceneSource === 'string' ? body.sceneSource : undefined,
    });
  }

  @Get('support-target')
  async supportTarget() {
    return this.chatService.getSupportTarget();
  }

  @Get()
  async listConversations(@CurrentUser() user: AuthUser | undefined) {
    return this.chatService.listBuyerConversations(user);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser | undefined) {
    return this.chatService.getBuyerUnreadCount(user);
  }

  @Get(':conversationId/messages')
  async listMessages(
    @CurrentUser() user: AuthUser | undefined,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() query: Record<string, string>,
  ) {
    return this.chatService.listMessages(user, conversationId, Number(query.page ?? 1), Number(query.pageSize ?? 20));
  }

  @Post(':conversationId/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser | undefined,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.chatService.sendMessage(user, {
      conversationId,
      content: typeof body.content === 'string' ? body.content : '',
      contentType: typeof body.contentType === 'string' ? (body.contentType as 'TEXT' | 'IMAGE') : 'TEXT',
      attachments: body.attachments as any,
    });
  }

  @Post(':conversationId/read')
  async markRead(@CurrentUser() user: AuthUser | undefined, @Param('conversationId', ParseIntPipe) conversationId: number) {
    return this.chatService.markConversationRead(user, conversationId);
  }
}

@Controller('merchant/chats')
@Roles(RoleCode.MERCHANT)
export class MerchantChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async listConversations(@CurrentUser() user: AuthUser | undefined) {
    return this.chatService.listMerchantConversations(user);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser | undefined) {
    return this.chatService.getMerchantUnreadCount(user);
  }

  @Get(':conversationId/messages')
  async listMessages(
    @CurrentUser() user: AuthUser | undefined,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() query: Record<string, string>,
  ) {
    return this.chatService.listMessages(user, conversationId, Number(query.page ?? 1), Number(query.pageSize ?? 20));
  }

  @Post(':conversationId/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser | undefined,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.chatService.sendMessage(user, {
      conversationId,
      content: typeof body.content === 'string' ? body.content : '',
      contentType: typeof body.contentType === 'string' ? (body.contentType as 'TEXT' | 'IMAGE') : 'TEXT',
      attachments: body.attachments as any,
    });
  }

  @Post(':conversationId/read')
  async markRead(@CurrentUser() user: AuthUser | undefined, @Param('conversationId', ParseIntPipe) conversationId: number) {
    return this.chatService.markConversationRead(user, conversationId);
  }
}
