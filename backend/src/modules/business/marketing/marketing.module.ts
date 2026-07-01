import { Module } from '@nestjs/common';

import { AppLeaderController } from './app-leader.controller';
import { LeaderCommissionController, MarketingController } from './marketing.controller';

@Module({
  controllers: [MarketingController, LeaderCommissionController, AppLeaderController],
})
export class MarketingModule {}
