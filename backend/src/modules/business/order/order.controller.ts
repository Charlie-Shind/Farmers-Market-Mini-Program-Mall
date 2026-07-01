import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app/orders')
export class OrderController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('preview')
  preview(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string>,
  ) {
    return this.platformDataService.previewOrder(user, {
      ...body,
      ...(query.couponId ? { couponId: Number(query.couponId) } : {}),
    });
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createOrder(user, body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listOrders(user, query);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get(':orderNo')
  detail(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.getOrderDetail(user, orderNo);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get(':orderNo/logistics')
  logistics(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.getOrderLogisticsDetail(user, orderNo);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post(':orderNo/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.cancelOrder(user, orderNo);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post(':orderNo/confirm')
  confirm(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.confirmOrder(user, orderNo);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post(':orderNo/reviews')
  submitReview(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.submitOrderReview(user, orderNo, body);
  }
}
