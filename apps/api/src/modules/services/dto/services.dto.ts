import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  freeCancellationHours?: number;
}

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  freeCancellationHours?: number;
}

export class SuspendServiceDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateOfferingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationMinutes: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceMinorUnits: number;
}

export class UpdateOfferingDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  durationMinutes?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  priceMinorUnits?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class QueryServicesDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
