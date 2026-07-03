import { Module } from '@nestjs/common';

import { LeaderController } from './leader.controller';
import { AdminLeaderCommissionController, AdminLeaderController, AdminPickupPointController } from './admin-leader.controller';
import { LeaderApplicationService } from './services/leader-application.service';
import { LeaderCommissionService } from './services/leader-commission.service';
import { LeaderCommissionSettlementService } from './services/leader-commission-settlement.service';
import { LeaderOrderService } from './services/leader-order.service';
import { LeaderQueryService } from './services/leader-query.service';
import { PickupPointService } from './services/pickup-point.service';

@Module({
  controllers: [LeaderController, AdminLeaderController, AdminPickupPointController, AdminLeaderCommissionController],
  providers: [
    LeaderApplicationService,
    LeaderQueryService,
    PickupPointService,
    LeaderCommissionService,
    LeaderOrderService,
    LeaderCommissionSettlementService,
  ],
  exports: [LeaderApplicationService, PickupPointService, LeaderCommissionService, LeaderOrderService],
})
export class LeaderModule {}
