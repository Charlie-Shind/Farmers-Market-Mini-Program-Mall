import { Module } from '@nestjs/common';

import { PaymentCallbackController, PaymentController } from './payment.controller';

@Module({
  controllers: [PaymentController, PaymentCallbackController],
})
export class PaymentModule {}
