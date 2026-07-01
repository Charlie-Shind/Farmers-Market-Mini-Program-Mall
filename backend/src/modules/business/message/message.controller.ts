import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { MessageService } from './message.service';

@Controller('app/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  async listMessages(
    @CurrentUser() user: AuthUser | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.messageService.listMessages(user, {
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 20),
      type: query.type,
      isRead:
        query.isRead != null
          ? query.isRead === 'true'
          : undefined,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthUser | undefined) {
    return this.messageService.getUnreadCount(user);
  }

  @Get(':receiptId')
  async getMessageDetail(
    @CurrentUser() user: AuthUser | undefined,
    @Param('receiptId', ParseIntPipe) receiptId: number,
  ) {
    return this.messageService.getMessageDetail(user, receiptId);
  }

  @Post(':receiptId/read')
  async markMessageRead(
    @CurrentUser() user: AuthUser | undefined,
    @Param('receiptId', ParseIntPipe) receiptId: number,
  ) {
    return this.messageService.markMessageRead(user, receiptId);
  }

  @Post('read-batch')
  async markMessagesRead(
    @CurrentUser() user: AuthUser | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const ids = Array.isArray(body.ids) ? body.ids : [];
    return this.messageService.markMessagesRead(user, ids as Array<number | bigint | string>);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: AuthUser | undefined) {
    return this.messageService.markAllRead(user);
  }

  @Post(':receiptId/delete')
  async deleteMessage(
    @CurrentUser() user: AuthUser | undefined,
    @Param('receiptId', ParseIntPipe) receiptId: number,
  ) {
    return this.messageService.deleteMessage(user, receiptId);
  }
}

@Controller('admin/messages')
@Roles(RoleCode.ADMIN)
export class MessageAdminController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  async listAdminMessages(@Query() query: Record<string, string>) {
    return this.messageService.listAdminMessages({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 20),
      keyword: query.keyword,
    });
  }

  @Post('send')
  async sendMessage(@Body() body: Record<string, unknown>) {
    return this.messageService.sendMessage({
      type: String(body.type ?? 'NOTICE'),
      title: String(body.title ?? '系统消息'),
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      contentType: typeof body.contentType === 'string' ? body.contentType : undefined,
      contentJson: body.contentJson as any,
      coverImageUrl: typeof body.coverImageUrl === 'string' ? body.coverImageUrl : undefined,
      senderType: typeof body.senderType === 'string' ? body.senderType : 'ADMIN',
      senderId: body.senderId != null ? Number(body.senderId) : undefined,
      bizType: typeof body.bizType === 'string' ? body.bizType : undefined,
      bizId: typeof body.bizId === 'string' ? body.bizId : undefined,
      publishAt: typeof body.publishAt === 'string' ? body.publishAt : undefined,
      targetUserIds: Array.isArray(body.targetUserIds)
        ? body.targetUserIds
        : undefined,
      broadcast: Boolean(body.broadcast),
      targetRoleCode: typeof body.targetRoleCode === 'string' ? body.targetRoleCode : undefined,
    });
  }

  @Post('broadcast')
  async broadcastMessage(@Body() body: Record<string, unknown>) {
    return this.messageService.sendMessage({
      type: String(body.type ?? 'NOTICE'),
      title: String(body.title ?? '系统公告'),
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      contentType: typeof body.contentType === 'string' ? body.contentType : undefined,
      contentJson: body.contentJson as any,
      coverImageUrl: typeof body.coverImageUrl === 'string' ? body.coverImageUrl : undefined,
      senderType: typeof body.senderType === 'string' ? body.senderType : 'ADMIN',
      senderId: body.senderId != null ? Number(body.senderId) : undefined,
      bizType: typeof body.bizType === 'string' ? body.bizType : undefined,
      bizId: typeof body.bizId === 'string' ? body.bizId : undefined,
      publishAt: typeof body.publishAt === 'string' ? body.publishAt : undefined,
      broadcast: true,
    });
  }

  @Post(':messageId/delete')
  async deleteAdminMessage(@Param('messageId', ParseIntPipe) messageId: number) {
    return this.messageService.deleteAdminMessage(messageId);
  }
}
