import { Module } from '@nestjs/common';

import { OrderController } from './order.controller';
import { OrderExpireService } from './order-expire.service';

@Module({
  controllers: [OrderController],
  providers: [OrderExpireService],
})
export class OrderModule {}
