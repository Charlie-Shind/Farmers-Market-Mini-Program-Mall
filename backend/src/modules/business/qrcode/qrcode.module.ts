import { Module } from '@nestjs/common';

import { QrCodeController } from './qrcode.controller';

@Module({
  controllers: [QrCodeController],
})
export class QrCodeModule {}
