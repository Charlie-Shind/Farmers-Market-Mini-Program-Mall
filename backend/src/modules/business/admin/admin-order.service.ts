import { Injectable } from '@nestjs/common';

import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminOrderService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  listOrders(query: Record<string, string>) {
    return this.platformDataService.listAdminOrders(query);
  }

  getOrder(orderNo: string) {
    return this.platformDataService.getAdminOrderDetail(orderNo);
  }
}
