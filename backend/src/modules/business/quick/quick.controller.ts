import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Public()
@Controller('app/quick')
export class QuickZoneController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Get('flash-sale/active')
  flashSaleActive() {
    return this.platformDataService.getQuickFlashSaleActive();
  }

  @Get('flash-sale/windows')
  flashSaleWindows() {
    return this.platformDataService.getQuickFlashSaleWindows();
  }

  @Get('flash-sale/items')
  flashSaleItems(@Query() query: Record<string, string>) {
    return this.platformDataService.getQuickFlashSaleItems(query);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('flash-sale/claim')
  claimFlashSale(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.claimFlashSale(user, {
      itemId: Number(body.itemId),
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
    });
  }

  @Post('group-buy/nearby')
  groupBuyNearby(@Body() body: Record<string, unknown>) {
    return this.platformDataService.getQuickGroupBuyNearby({
      lat: body.lat != null ? Number(body.lat) : undefined,
      lng: body.lng != null ? Number(body.lng) : undefined,
      limit: body.limit != null ? Number(body.limit) : undefined,
      maxDistanceKm: body.maxDistanceKm != null ? Number(body.maxDistanceKm) : undefined,
      inviteCode: body.inviteCode ? String(body.inviteCode) : undefined,
    });
  }

  @Get('group-buy/products')
  groupBuyProducts(@Query() query: Record<string, string>) {
    return this.platformDataService.getQuickGroupBuyProducts(query);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('group-buy/join')
  joinGroupBuy(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.joinGroupBuy(user, {
      productId: Number(body.productId),
      skuId: body.skuId != null ? Number(body.skuId) : undefined,
      groupId: body.groupId != null ? Number(body.groupId) : undefined,
      lat: body.lat != null ? Number(body.lat) : undefined,
      lng: body.lng != null ? Number(body.lng) : undefined,
    });
  }

  @Get('gift-zone/items')
  giftZoneItems(@Query() query: Record<string, string>) {
    return this.platformDataService.getQuickGiftZoneItems({
      page: query.page != null ? Number(query.page) : undefined,
      pageSize: query.pageSize != null ? Number(query.pageSize) : undefined,
      sortBy: query.sortBy === 'price' ? 'price' : 'sales',
    });
  }

  @Get('origin-zone/items')
  originZoneItems(@Query() query: Record<string, string>) {
    return this.platformDataService.getQuickOriginZoneItems({
      page: query.page != null ? Number(query.page) : undefined,
      pageSize: query.pageSize != null ? Number(query.pageSize) : undefined,
      originPlace: query.originPlace || undefined,
      categoryId: query.categoryId != null ? Number(query.categoryId) : undefined,
    });
  }
}
