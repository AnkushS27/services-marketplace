import { PaymentStatus } from '@prisma/client';

export interface PaymentProviderResult {
  success: boolean;
  status: PaymentStatus;
  providerRef?: string;
  metadata?: Record<string, any>;
}

export interface PaymentProvider {
  confirmPayment(token?: string, existingProviderRef?: string): Promise<PaymentProviderResult>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
