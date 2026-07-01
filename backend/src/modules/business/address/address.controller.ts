import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app/addresses')
export class AddressController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.platformDataService.listUserAddresses(user);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createUserAddress(user, body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Patch(':addressId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('addressId') addressId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateUserAddress(user, Number(addressId), body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Delete(':addressId')
  remove(@CurrentUser() user: AuthUser, @Param('addressId') addressId: string) {
    return this.platformDataService.deleteUserAddress(user, Number(addressId));
  }
}
