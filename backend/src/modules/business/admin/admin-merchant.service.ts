import { Injectable } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminMerchantService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  auditMerchant(user: AuthUser, merchantId: number, body: Record<string, unknown>) {
    return this.platformDataService.auditMerchant(merchantId, body, user);
  }

  enableMerchant(user: AuthUser, merchantId: number) {
    return this.platformDataService.enableMerchant(merchantId, user);
  }

  disableMerchant(user: AuthUser, merchantId: number) {
    return this.platformDataService.disableMerchant(merchantId, user);
  }

  updateMerchantCommission(user: AuthUser, merchantId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateMerchantCommissionRule(merchantId, body, user);
  }

  listMerchants(query: Record<string, string>) {
    return this.platformDataService.listAdminMerchants(query);
  }

  getMerchantSummary(merchantId: number) {
    return this.platformDataService.getMerchantSummary(merchantId);
  }

  getAdminMerchantDetail(merchantId: number) {
    return this.platformDataService.getAdminMerchantDetail(merchantId);
  }

  updateAdminMerchant(user: AuthUser, merchantId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminMerchant(merchantId, body, user);
  }

  deleteAdminMerchant(user: AuthUser, merchantId: number) {
    return this.platformDataService.deleteAdminMerchant(merchantId, user);
  }
}
