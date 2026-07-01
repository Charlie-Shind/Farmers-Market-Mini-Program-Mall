import { Module } from '@nestjs/common';

import { ChatController, MerchantChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController, MerchantChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
