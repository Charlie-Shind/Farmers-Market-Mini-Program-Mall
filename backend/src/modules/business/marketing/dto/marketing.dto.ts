import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ExchangePointsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId!: number;
}
