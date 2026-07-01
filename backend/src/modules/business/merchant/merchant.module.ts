import { Module } from '@nestjs/common';

import { MerchantController } from './merchant.controller';
import { MerchantPublicController } from './merchant-public.controller';

@Module({
  controllers: [MerchantController, MerchantPublicController],
})
export class MerchantModule {}
