import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { LeaderStatus } from '../types/leader.types';

export class QueryLeaderDto {
  @IsString()
  @IsOptional()
  keyword?: string;

  @IsEnum(LeaderStatus)
  @IsOptional()
  status?: LeaderStatus;

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
