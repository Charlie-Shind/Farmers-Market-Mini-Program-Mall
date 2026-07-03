import { IsDecimal, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PickupPointStatus } from '../types/leader.types';

export class CreatePickupPointDto {
  @IsNumber()
  @IsOptional()
  leaderId?: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name!: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  contactName?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  contactMobile?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  province!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  city!: string;

  @IsString()
  @IsOptional()
  @Length(1, 64)
  district?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  detailAddress!: string;

  @IsDecimal({ decimal_digits: '0,7' }, { message: 'longitude must be a decimal with up to 7 decimal places' })
  @IsOptional()
  longitude?: string;

  @IsDecimal({ decimal_digits: '0,7' }, { message: 'latitude must be a decimal with up to 7 decimal places' })
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  businessHours?: string;
}

export class UpdatePickupPointDto {
  @IsNumber()
  @IsOptional()
  leaderId?: number;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  contactName?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  contactMobile?: string;

  @IsString()
  @IsOptional()
  @Length(1, 64)
  province?: string;

  @IsString()
  @IsOptional()
  @Length(1, 64)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(1, 64)
  district?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  detailAddress?: string;

  @IsDecimal({ decimal_digits: '0,7' }, { message: 'longitude must be a decimal with up to 7 decimal places' })
  @IsOptional()
  longitude?: string;

  @IsDecimal({ decimal_digits: '0,7' }, { message: 'latitude must be a decimal with up to 7 decimal places' })
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  businessHours?: string;
}

export class UpdatePickupPointStatusDto {
  @IsEnum(PickupPointStatus)
  @IsNotEmpty()
  status!: PickupPointStatus;
}

export class QueryPickupPointDto {
  @IsString()
  @IsOptional()
  keyword?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsEnum(PickupPointStatus)
  @IsOptional()
  status?: PickupPointStatus;

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

export class NearbyPickupPointDto {
  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsDecimal({ decimal_digits: '0,7' }, { message: 'longitude must be a decimal' })
  @IsOptional()
  longitude?: string;

  @IsDecimal({ decimal_digits: '0,7' }, { message: 'latitude must be a decimal' })
  @IsOptional()
  latitude?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
