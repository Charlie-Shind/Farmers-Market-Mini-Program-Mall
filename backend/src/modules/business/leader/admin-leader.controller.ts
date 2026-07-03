import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators';
import { AuthUser } from '../../../common/types';
import { AuditLeaderDto, UpdateLeaderDto, UpdateLeaderStatusDto } from './dto/audit-leader.dto';
import { BatchSettleCommissionsDto, QueryCommissionDto } from './dto/commission.dto';
import { CreatePickupPointDto, QueryPickupPointDto, UpdatePickupPointDto, UpdatePickupPointStatusDto } from './dto/pickup-point.dto';
import { QueryLeaderDto } from './dto/query-leader.dto';
import { LeaderApplicationService } from './services/leader-application.service';
import { LeaderCommissionService } from './services/leader-commission.service';
import { LeaderQueryService } from './services/leader-query.service';
import { PickupPointService } from './services/pickup-point.service';

@Controller('admin/leaders')
export class AdminLeaderController {
  constructor(
    private readonly leaderApplicationService: LeaderApplicationService,
    private readonly leaderQueryService: LeaderQueryService,
  ) {}

  @Get()
  listLeaders(@Query() query: QueryLeaderDto) {
    return this.leaderQueryService.findAll(query);
  }

  @Get(':id')
  getLeader(@Param('id') id: string) {
    return this.leaderQueryService.findById(BigInt(id));
  }

  @Post(':id/audit')
  auditLeader(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: AuditLeaderDto,
  ) {
    const adminUserId = BigInt(admin.sub.replace(/^admin_/, ''));
    return this.leaderApplicationService.audit(BigInt(id), adminUserId, dto);
  }

  @Put(':id')
  updateLeader(@Param('id') id: string, @Body() dto: UpdateLeaderDto) {
    return this.leaderApplicationService.updateLeader(BigInt(id), dto);
  }

  @Patch(':id/status')
  updateLeaderStatus(@Param('id') id: string, @Body() dto: UpdateLeaderStatusDto) {
    return this.leaderApplicationService.updateStatus(BigInt(id), dto);
  }

  @Delete(':id')
  deleteLeader(@Param('id') id: string) {
    return this.leaderApplicationService.deleteLeader(BigInt(id));
  }
}

@Controller('admin/pickup-points')
export class AdminPickupPointController {
  constructor(private readonly pickupPointService: PickupPointService) {}

  @Get()
  listPickupPoints(@Query() query: QueryPickupPointDto) {
    return this.pickupPointService.findAll(query);
  }

  @Post()
  createPickupPoint(@Body() dto: CreatePickupPointDto) {
    return this.pickupPointService.create(dto);
  }

  @Put(':id')
  updatePickupPoint(@Param('id') id: string, @Body() dto: UpdatePickupPointDto) {
    return this.pickupPointService.update(BigInt(id), dto);
  }

  @Delete(':id')
  deletePickupPoint(@Param('id') id: string) {
    return this.pickupPointService.delete(BigInt(id));
  }

  @Patch(':id/status')
  updatePickupPointStatus(@Param('id') id: string, @Body() dto: UpdatePickupPointStatusDto) {
    return this.pickupPointService.updateStatus(BigInt(id), dto);
  }
}

@Controller('admin/leader-commissions')
export class AdminLeaderCommissionController {
  constructor(private readonly leaderCommissionService: LeaderCommissionService) {}

  @Get()
  listCommissions(@Query() query: QueryCommissionDto) {
    return this.leaderCommissionService.findAll({
      ...query,
      leaderId: query.leaderId != null ? BigInt(query.leaderId) : undefined,
    });
  }

  @Post(':id/settle')
  settleCommission(@Param('id') id: string) {
    return this.leaderCommissionService.settle([BigInt(id)]);
  }

  @Post('batch-settle')
  batchSettleCommission(@Body() dto: BatchSettleCommissionsDto) {
    return this.leaderCommissionService.settle(dto.ids.map((id) => BigInt(id)));
  }
}
