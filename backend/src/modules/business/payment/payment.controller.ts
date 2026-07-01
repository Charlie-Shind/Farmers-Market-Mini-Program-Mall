import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app/payments')
export class PaymentController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('wechat')
  createWechatPayment(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createWechatPayment(user, body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get('wechat/status/:orderNo')
  getWechatPaymentStatus(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.getWechatPaymentStatus(user, orderNo);
  }
}

@Controller('payments')
export class PaymentCallbackController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Public()
  @Post('wechat/callback')
  handleWechatCallback(@Body() body: Record<string, unknown>) {
    return this.platformDataService.handleWechatCallback(body);
  }
}
