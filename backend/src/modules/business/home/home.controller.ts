import { Controller, Get } from '@nestjs/common';

import { Public } from '../../../common/decorators';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Public()
@Controller('app/home')
export class HomeController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Get('banners')
  getBanners() {
    return this.platformDataService.getHomeBanners();
  }

  @Get('quick-entries')
  getQuickEntries() {
    return this.platformDataService.getHomeQuickEntries();
  }

  @Get('hot-products')
  getHotProducts() {
    return this.platformDataService.getHomeHotProducts();
  }

  @Get('merchant-entry-status')
  getMerchantEntryStatus() {
    return this.platformDataService.getMerchantEntryStatus();
  }
}
