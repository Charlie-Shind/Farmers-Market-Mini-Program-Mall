import { Module } from '@nestjs/common';

import { RefundController } from './refund.controller';

@Module({
  controllers: [RefundController],
})
export class RefundModule {}
