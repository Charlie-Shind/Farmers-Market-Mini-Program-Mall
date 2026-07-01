import { Body, Controller, Post } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app/refunds')
export class RefundController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createRefundApply(user, body);
  }
}
