import { Injectable } from '@nestjs/common';

import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

@Injectable()
export class QrCodeService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  createWxacode(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createWxacode(user, body);
  }

  createShareCard(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createShareCard(user, body);
  }

  scanQrCode(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.scanQrCode(user, body);
  }

  resolveQrRedirect(query: Record<string, string>) {
    return this.platformDataService.resolveQrRedirect(query);
  }
}
