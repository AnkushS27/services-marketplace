import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import {
  PaymentProvider,
  PaymentProviderResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async confirmPayment(
    token?: string,
    existingProviderRef?: string,
  ): Promise<PaymentProviderResult> {
    const outcomeToken = token || 'tok_success';
    const providerRef =
      existingProviderRef ||
      `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    switch (outcomeToken) {
      case 'tok_fail':
        return {
          success: false,
          status: PaymentStatus.FAILED,
          providerRef,
          metadata: { token: outcomeToken, reason: 'Simulated payment failure' },
        };
      case 'tok_delay':
        return {
          success: false,
          status: PaymentStatus.INITIATED,
          providerRef,
          metadata: { token: outcomeToken, reason: 'Payment pending async resolution' },
        };
      case 'tok_success':
      default:
        return {
          success: true,
          status: PaymentStatus.SUCCESS,
          providerRef,
          metadata: { token: outcomeToken, method: 'mock_card' },
        };
    }
  }
}
