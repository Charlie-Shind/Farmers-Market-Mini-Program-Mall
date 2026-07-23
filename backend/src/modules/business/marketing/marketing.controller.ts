import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app')
export class MarketingController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Public()
  @Get('activities')
  listActivities(@Query() query: Record<string, string>) {
    return this.platformDataService.getPublicActivities(query);
  }

  @Public()
  @Get('activities/:activityId')
  getActivityDetail(@Param('activityId') activityId: string) {
    return this.platformDataService.getPublicActivityDetail(Number(activityId));
  }

  @Public()
  @Get('activities/:activityId/products')
  getActivityProducts(
    @Param('activityId') activityId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.platformDataService.getPublicActivityProducts(Number(activityId), query);
  }

  @Public()
  @Get('coupons')
  listCoupons(@CurrentUser() user: AuthUser | undefined) {
    return this.platformDataService.getCoupons(user);
  }

  @Public()
  @Get('coupons/recommended')
  recommendedCoupons(
    @CurrentUser() user: AuthUser | undefined,
    @Query() query: Record<string, string>,
  ) {
    const scene = String(query.scene ?? 'home');
    const cartAmount = Number(query.cartAmount ?? 0);
    const merchantId = query.merchantId ? Number(query.merchantId) : undefined;
    const limit = Number(query.limit ?? 6);
    return this.platformDataService.getRecommendedCoupons(user, scene, cartAmount, merchantId, limit);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get('coupons/available')
  availableCoupons(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string>,
  ) {
    const cartAmount = Number(query.cartAmount ?? 0);
    const merchantId = query.merchantId ? Number(query.merchantId) : undefined;
    return this.platformDataService.getAvailableCoupons(user, cartAmount, merchantId);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get('user/coupons')
  myCoupons(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string>,
  ) {
    const status = query.status ? String(query.status) : undefined;
    return this.platformDataService.getUserCoupons(user, status);
  }

  @Roles(RoleCode.USER, RoleCode.MERCHANT)
  @Post('coupons/:couponId/receive')
  receiveCoupon(@CurrentUser() user: AuthUser, @Param('couponId') couponId: string) {
    return this.platformDataService.receiveCoupon(user, Number(couponId));
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get('points/logs')
  getPointsLogs(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getPointsLogs(user);
  }

  @Public()
  @Get('points/exchange-items')
  getPointsExchangeItems(@CurrentUser() user: AuthUser | undefined) {
    return this.platformDataService.getPointExchangeItems(user);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('points/exchange')
  exchangePoints(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.exchangePointsCoupon(user, Number(body.couponId));
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get('assets/summary')
  assetsSummary(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getAssetsSummary(user);
  }

  @Public()
  @Get('logistics/delivery-options')
  logisticsDeliveryOptions(@Query() query: Record<string, string>) {
    return this.platformDataService.listAppLogisticsDeliveryOptions({
      province: query.province ? String(query.province) : undefined,
    });
  }
}

@Controller('leader')
export class LeaderCommissionController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER)
  @Get('commissions')
  getCommissions(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getLeaderCommissions(user);
  }
}
