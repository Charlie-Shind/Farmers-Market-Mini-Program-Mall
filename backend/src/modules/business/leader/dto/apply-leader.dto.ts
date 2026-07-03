import { IsMobilePhone, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class ApplyLeaderDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  realName!: string;

  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('zh-CN')
  mobile!: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  idCardNo?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  idCardFrontUrl?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  idCardBackUrl?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  businessCertUrl?: string;
}

export class UpdateLeaderApplicationDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  realName!: string;

  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('zh-CN')
  mobile!: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  idCardNo?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  idCardFrontUrl?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  idCardBackUrl?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  businessCertUrl?: string;
}
