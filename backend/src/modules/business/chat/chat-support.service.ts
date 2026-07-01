import { Injectable } from '@nestjs/common';

import { PlatformDataService } from '../../../common/services/platform-data.service';
import { ChatSupportTarget } from './chat.types';

@Injectable()
export class ChatSupportService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  async getSupportTarget(): Promise<ChatSupportTarget> {
    const target = await this.platformDataService.getChatSupportTarget();
    return {
      merchantId: target.merchantId,
      merchantName: target.merchantName,
      merchantLogo: target.merchantLogo,
      hotline: target.hotline,
      source: target.source,
      sceneType: target.sceneType,
      sceneLabel: target.sceneLabel,
      sceneSource: target.sceneSource,
    };
  }
}
