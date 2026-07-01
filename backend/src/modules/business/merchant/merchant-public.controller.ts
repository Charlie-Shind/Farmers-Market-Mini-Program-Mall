import { Controller, Get, Param, Query } from '@nestjs/common';

import { CurrentUser, Public } from '../../../common/decorators';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app/merchants')
export class MerchantPublicController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Public()
  @Get()
  list(@Query() query: Record<string, string>) {
    return this.platformDataService.listPublicMerchants(query);
  }

  @Public()
  @Get(':merchantId')
  detail(@Param('merchantId') merchantId: string) {
    return this.platformDataService.getPublicMerchantDetail(Number(merchantId));
  }

  @Public()
  @Get(':merchantId/products')
  products(
    @CurrentUser() user: AuthUser | undefined,
    @Param('merchantId') merchantId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.platformDataService.listMerchantPublicProducts(Number(merchantId), query, user);
  }

  @Get(':merchantId/coupons')
  coupons(
    @CurrentUser() user: AuthUser | undefined,
    @Param('merchantId') merchantId: string,
  ) {
    return this.platformDataService.getCoupons(user, Number(merchantId));
  }
}
