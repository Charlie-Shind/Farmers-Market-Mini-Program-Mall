import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app/cart')
export class CartController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('items')
  addItem(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.addCartItem(user, body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get()
  getCart(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getCart(user);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Patch('items/:cartId')
  updateItem(@CurrentUser() user: AuthUser, @Param('cartId') cartId: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.updateCartItem(user, Number(cartId), body);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Delete('items/:cartId')
  removeItem(@CurrentUser() user: AuthUser, @Param('cartId') cartId: string) {
    return this.platformDataService.removeCartItem(user, Number(cartId));
  }
}
