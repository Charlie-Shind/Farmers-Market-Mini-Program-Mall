import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(1)
  receiverName!: string;

  @IsString()
  @MinLength(1)
  receiverMobile!: string;

  @IsString()
  @MinLength(1)
  province!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  district!: string;

  @IsString()
  @MinLength(1)
  detailAddress!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  receiverMobile?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  province?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  district?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  detailAddress?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
