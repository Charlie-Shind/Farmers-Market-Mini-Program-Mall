import { Module } from '@nestjs/common';

import { AddressModule } from './address/address.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';
import { ChatModule } from './chat/chat.module';
import { FileModule } from './file/file.module';
import { HomeModule } from './home/home.module';
import { MarketingModule } from './marketing/marketing.module';
import { MerchantModule } from './merchant/merchant.module';
import { MessageModule } from './message/message.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { ProductModule } from './product/product.module';
import { QrCodeModule } from './qrcode/qrcode.module';
import { QuickZoneModule } from './quick/quick.module';
import { RefundModule } from './refund/refund.module';

@Module({
  imports: [
    ProductModule,
    CartModule,
    OrderModule,
    PaymentModule,
    RefundModule,
    MarketingModule,
    FileModule,
    ChatModule,
    HomeModule,
    AddressModule,
    MerchantModule,
    MessageModule,
    AdminModule,
    QrCodeModule,
    QuickZoneModule,
  ],
})
export class BusinessModule {}
