import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class PreviewOrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId?: number;
}

export class OrderReviewItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderItemId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class SubmitOrderReviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderReviewItemDto)
  reviews!: OrderReviewItemDto[];
}

export class CreateOrderDto {
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  cartIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  deliveryType?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  flashSaleItemId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  groupBuyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  skuId?: number;

  @IsOptional()
  @IsBoolean()
  usePoints?: boolean;
}
