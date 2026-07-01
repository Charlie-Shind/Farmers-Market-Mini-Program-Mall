import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWechatPaymentDto {
  @IsString()
  orderNo!: string;
}

export class WechatCallbackDto {
  @IsOptional()
  @IsString()
  orderNo?: string;

  @IsOptional()
  @IsString()
  out_trade_no?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_fee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transaction_amount?: number;
}
