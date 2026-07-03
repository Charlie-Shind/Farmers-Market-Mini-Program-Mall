import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../../common/decorators';
import { CategoryService, type ListCategoriesQuery } from './category.service';

@Controller('app')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get('categories')
  async listCategories(@Query() query: ListCategoriesQuery) {
    return this.categoryService.listCategories(query);
  }

  @Public()
  @Get('category-tags')
  async listCategoryTags() {
    return this.categoryService.listCategoryTags();
  }
}
