import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { LeaderStatus } from '../types/leader.types';

export class AuditLeaderDto {
  @IsEnum(LeaderStatus)
  @IsNotEmpty()
  status!: LeaderStatus.APPROVED | LeaderStatus.REJECTED;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  rejectReason?: string;
}

export class UpdateLeaderDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  realName?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  mobile?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @IsString()
  @IsOptional()
  @Length(1, 32)
  status?: LeaderStatus;
}

export class UpdateLeaderStatusDto {
  @IsEnum(LeaderStatus)
  @IsNotEmpty()
  status!: LeaderStatus;
}
