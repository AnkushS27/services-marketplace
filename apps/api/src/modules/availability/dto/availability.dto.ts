import {
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number; // 0 = Sunday .. 6 = Saturday

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number; // minutes from midnight (0 .. 1439)

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number; // minutes from midnight (1 .. 1440)

  @IsInt()
  @Min(1)
  capacity: number;
}

export class CreateAvailabilityExceptionDto {
  @IsNotEmpty()
  @IsDateString()
  date: string; // YYYY-MM-DD or ISO string

  @IsBoolean()
  isClosed: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class QuerySlotsDto {
  @IsNotEmpty()
  @IsUUID()
  offeringId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
