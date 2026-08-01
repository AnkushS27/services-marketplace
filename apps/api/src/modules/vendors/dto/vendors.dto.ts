import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VendorStatus } from '@prisma/client';

export class UpdateVendorProfileDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UploadVendorDocumentDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;
}

export class RejectVendorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Rejection reason must be at least 3 characters long' })
  reason: string;
}

export class QueryVendorsDto {
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
