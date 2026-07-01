import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { LeaderService } from '../../../common/services/leader.service';

const APP_LEADER_ROLES = [
  RoleCode.USER,
  RoleCode.GUEST,
  RoleCode.MERCHANT,
  RoleCode.LEADER,
];

@Controller('app/leaders')
export class AppLeaderController {
  constructor(private readonly leaderService: LeaderService) {}

  @Roles(...APP_LEADER_ROLES)
  @Get('application')
  getApplication(@CurrentUser() user: AuthUser) {
    return this.leaderService.getApplication(user);
  }

  @Roles(...APP_LEADER_ROLES)
  @Put('application')
  updateApplication(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.leaderService.updateApplication(user, body);
  }

  @Roles(...APP_LEADER_ROLES)
  @Post('apply')
  applyLeader(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.leaderService.applyLeader(user, body);
  }

  @Public()
  @Get('pickup-points')
  listPickupPoints(@Query() query: Record<string, string>) {
    return this.leaderService.listAppPickupPoints(query);
  }

  @Public()
  @Get('pickup-points/:pickupPointId')
  getPickupPointDetail(@Param('pickupPointId') pickupPointId: string) {
    return this.leaderService.getAppPickupPointDetail(Number(pickupPointId));
  }

  @Roles(...APP_LEADER_ROLES)
  @Get('my-pickup-point')
  getMyPickupPoint(@CurrentUser() user: AuthUser) {
    return this.leaderService.getMyPickupPoint(user);
  }

  @Roles(...APP_LEADER_ROLES)
  @Put('my-pickup-point')
  upsertMyPickupPoint(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.leaderService.upsertMyPickupPoint(user, body);
  }

  @Roles(...APP_LEADER_ROLES)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.leaderService.getDashboard(user);
  }

  @Roles(...APP_LEADER_ROLES)
  @Get('orders')
  listOrders(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.leaderService.listLeaderOrders(user, query);
  }

  @Roles(...APP_LEADER_ROLES)
  @Post('orders/:orderNo/pickup')
  confirmPickup(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.leaderService.confirmOrderPickup(user, orderNo);
  }

  @Roles(...APP_LEADER_ROLES)
  @Get('commissions')
  listCommissions(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.leaderService.listAppCommissions(user, query);
  }

  @Roles(...APP_LEADER_ROLES)
  @Post(':leaderId/bind')
  bindLeader(@CurrentUser() user: AuthUser, @Param('leaderId') leaderId: string) {
    return this.leaderService.bindLeader(user, Number(leaderId));
  }
}
