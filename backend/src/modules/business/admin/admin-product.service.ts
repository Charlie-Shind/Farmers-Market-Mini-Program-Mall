import { Injectable } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminProductService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  auditProduct(user: AuthUser, productId: number, body: Record<string, unknown>) {
    return this.platformDataService.auditProduct(productId, body, user);
  }

  listProducts(query: Record<string, string>) {
    return this.platformDataService.listAdminProducts(query);
  }

  createProduct(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createAdminProduct(body, user);
  }

  getProductDetail(productId: number) {
    return this.platformDataService.getAdminProductDetail(productId);
  }

  updateProduct(user: AuthUser, productId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminProduct(productId, body, user);
  }

  deleteProduct(user: AuthUser, productId: number) {
    return this.platformDataService.deleteAdminProduct(productId, user);
  }

  takedownProduct(user: AuthUser, productId: number) {
    return this.platformDataService.takedownAdminProduct(productId, user);
  }

  restoreProduct(user: AuthUser, productId: number) {
    return this.platformDataService.restoreAdminProduct(productId, user);
  }
}
