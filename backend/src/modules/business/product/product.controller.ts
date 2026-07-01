import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Controller('app')
export class ProductController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Public()
  @Get('categories')
  async getCategories() {
    return this.platformDataService.getCatalogCategories();
  }

  @Public()
  @Get('category-tags')
  async getCategoryTags() {
    return this.platformDataService.getCategoryTags();
  }

  @Public()
  @Get('categories/:categoryId/recommendations')
  async getCategoryRecommendations(
    @Param('categoryId') categoryId: string,
    @Query() query: Record<string, string>,
  ) {
    const period = String(query.period ?? 'day');
    const limit = Number(query.limit ?? 20);
    const page = Number(query.page ?? 1);
    return this.platformDataService.getCategoryRecommendations(Number(categoryId), period, limit, page);
  }

  @Public()
  @Get('search/hot-keywords')
  async getHotKeywords() {
    return this.platformDataService.getHotKeywords();
  }

  @Public()
  @Get('products')
  async listProducts(@CurrentUser() user: AuthUser | undefined, @Query() query: Record<string, string>) {
    return this.platformDataService.listProducts(query, user);
  }

  @Public()
  @Get('products/:productId')
  async getProductDetail(@CurrentUser() user: AuthUser | undefined, @Param('productId') productId: string) {
    return this.platformDataService.getProductDetail(Number(productId), user);
  }

  @Public()
  @Get('traces/:traceCode')
  async getTraceDetail(@Param('traceCode') traceCode: string) {
    return this.platformDataService.getTraceDetail(traceCode);
  }

  @Public()
  @Get('products/:productId/related')
  async getRelatedProducts(
    @Param('productId') productId: string,
    @Query() query: Record<string, string>,
  ) {
    const limit = Number(query.limit ?? 6);
    return this.platformDataService.getRelatedProducts(Number(productId), limit);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Get('favorites')
  listFavorites(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listFavorites(user, query);
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Post('products/:productId/favorite')
  addFavorite(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.platformDataService.addFavorite(user, Number(productId));
  }

  @Roles(RoleCode.USER, RoleCode.GUEST, RoleCode.MERCHANT)
  @Delete('products/:productId/favorite')
  removeFavorite(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.platformDataService.removeFavorite(user, Number(productId));
  }
}
