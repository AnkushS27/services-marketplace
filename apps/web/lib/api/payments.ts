import { apiFetch } from '../api-client';
import { PaymentData, BookingData } from './bookings';

export async function confirmPayment(
  id: string,
  token?: string,
  idempotencyKey?: string,
) {
  const key = idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return apiFetch<PaymentData>(`/payments/${id}/confirm`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': key,
    },
    body: JSON.stringify({ token: token || 'tok_success' }),
  });
}

export async function markCashCollected(bookingId: string) {
  return apiFetch<BookingData>(`/bookings/${bookingId}/mark-collected`, {
    method: 'PATCH',
  });
}

export async function adminRefundPayment(paymentId: string, reason: string) {
  return apiFetch<PaymentData>(`/admin/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function triggerPaymentWebhook(
  providerRef: string,
  outcome: 'SUCCESS' | 'FAILED',
  secret?: string,
) {
  return apiFetch<{ message: string; status: string }>(`/payments/webhook`, {
    method: 'POST',
    headers: {
      'X-Webhook-Secret': secret || 'replace-me',
    },
    body: JSON.stringify({ providerRef, outcome }),
  });
}
