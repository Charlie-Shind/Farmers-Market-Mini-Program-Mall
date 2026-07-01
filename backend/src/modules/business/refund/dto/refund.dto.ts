import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRefundApplyDto {
  @IsString()
  orderNo!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderItemId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  applyType?: number;

  @IsOptional()
  @IsString()
  applyReason?: string;

  @IsOptional()
  @IsArray()
  applyImages?: string[];

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  refundAmount?: number;
}
