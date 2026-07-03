import { IsArray, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CommissionStatus } from '../types/leader.types';

export class QueryCommissionDto {
  @IsNumber()
  @IsOptional()
  leaderId?: number;

  @IsEnum(CommissionStatus)
  @IsOptional()
  status?: CommissionStatus;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class BatchSettleCommissionsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ids!: number[];
}
