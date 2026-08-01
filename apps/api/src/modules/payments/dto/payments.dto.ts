import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum WebhookOutcome {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  token?: string;
}

export class WebhookPaymentDto {
  @IsString()
  @IsNotEmpty()
  providerRef: string;

  @IsEnum(WebhookOutcome)
  @IsNotEmpty()
  outcome: WebhookOutcome;
}

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
