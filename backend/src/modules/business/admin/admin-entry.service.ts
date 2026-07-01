import { Injectable } from '@nestjs/common';

import { PlatformDataService } from '../../../common/services/platform-data.service';
import { ChatSupportService } from '../chat/chat-support.service';

@Injectable()
export class AdminEntryService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly chatSupportService: ChatSupportService,
  ) {}

  login(body: Record<string, unknown>) {
    return this.platformDataService.adminLogin(body);
  }

  getChatSupportTarget() {
    return this.chatSupportService.getSupportTarget();
  }
}
