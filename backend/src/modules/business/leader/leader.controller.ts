import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { ApplyLeaderDto, UpdateLeaderApplicationDto } from './dto/apply-leader.dto';
import { NearbyPickupPointDto } from './dto/pickup-point.dto';
import { LeaderApplicationService } from './services/leader-application.service';
import { LeaderCommissionService } from './services/leader-commission.service';
import { LeaderOrderService } from './services/leader-order.service';
import { PickupPointService } from './services/pickup-point.service';

@Controller('app/leaders')
export class LeaderController {
  constructor(
    private readonly leaderApplicationService: LeaderApplicationService,
    private readonly pickupPointService: PickupPointService,
    private readonly leaderOrderService: LeaderOrderService,
    private readonly leaderCommissionService: LeaderCommissionService,
  ) {}

  @Roles(RoleCode.USER, RoleCode.LEADER, RoleCode.MERCHANT)
  @Post('apply')
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyLeaderDto) {
    return this.leaderApplicationService.apply(user, dto);
  }

  @Roles(RoleCode.USER, RoleCode.LEADER, RoleCode.MERCHANT)
  @Get('application')
  getMyApplication(@CurrentUser() user: AuthUser) {
    return this.leaderApplicationService.getMyApplication(user);
  }

  @Roles(RoleCode.USER, RoleCode.LEADER, RoleCode.MERCHANT)
  @Put('application')
  updateApplication(@CurrentUser() user: AuthUser, @Body() dto: UpdateLeaderApplicationDto) {
    return this.leaderApplicationService.updateApplication(user, dto);
  }

  @Roles(RoleCode.USER, RoleCode.LEADER, RoleCode.MERCHANT, RoleCode.GUEST)
  @Get('pickup-points')
  listPickupPoints(@Query() query: NearbyPickupPointDto) {
    return this.pickupPointService.findNearby(query);
  }

  @Roles(RoleCode.USER, RoleCode.LEADER, RoleCode.MERCHANT, RoleCode.GUEST)
  @Get('pickup-points/:id')
  getPickupPoint(@Param('id') id: string) {
    return this.pickupPointService.findById(BigInt(id));
  }

  @Roles(RoleCode.LEADER)
  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    const orders = await this.leaderOrderService.listOrders(user, { page: 1, pageSize: 1000 });
    const commissions = await this.leaderCommissionService.findByAuthUser(user);
    return {
      orderCount: orders.total,
      commissionTotal: commissions.reduce((sum, item) => sum + item.commissionAmount, 0),
      pendingSettlement: commissions
        .filter((item) => item.status === 'PENDING_SETTLEMENT')
        .reduce((sum, item) => sum + item.commissionAmount, 0),
    };
  }

  @Roles(RoleCode.LEADER)
  @Get('orders')
  listOrders(@CurrentUser() user: AuthUser, @Query() query: { status?: string; page?: number; pageSize?: number }) {
    return this.leaderOrderService.listOrders(user, query);
  }

  @Roles(RoleCode.LEADER)
  @Post('orders/:orderNo/pickup')
  confirmPickup(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.leaderOrderService.confirmPickup(user, orderNo);
  }

  @Roles(RoleCode.LEADER)
  @Get('commissions')
  listCommissions(@CurrentUser() user: AuthUser) {
    return this.leaderCommissionService.findByAuthUser(user);
  }
}
