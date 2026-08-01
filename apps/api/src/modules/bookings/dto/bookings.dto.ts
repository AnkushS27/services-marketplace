import {
  IsString,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus, PaymentMode } from '@prisma/client';

export class CreateBookingDto {
  @IsString()
  serviceId: string;

  @IsString()
  offeringId: string;

  @IsISO8601()
  slotStart: string;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;
}

export class QueryBookingsDto {
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

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RescheduleBookingDto {
  @IsISO8601()
  newSlotStart: string;
}
