import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app')
export class QrCodeController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('qr-codes/wxacode')
  createWxacode(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createWxacode(user, body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('qr-codes/share-card')
  createShareCard(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createShareCard(user, body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('qr-codes/scan')
  scanQrCode(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.scanQrCode(user, body);
  }

  @Public()
  @Get('qr-codes/redirect')
  qrRedirect(@Query() query: Record<string, string>) {
    return this.platformDataService.resolveQrRedirect(query);
  }
}
