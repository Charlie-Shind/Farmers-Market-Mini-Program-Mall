import { Module } from '@nestjs/common';

import { QuickZoneController } from './quick.controller';
import { GroupBuyExpireService } from './group-buy-expire.service';

@Module({
  controllers: [QuickZoneController],
  providers: [GroupBuyExpireService],
})
export class QuickZoneModule {}
