import { apiFetch } from '../api-client';
import { ServiceData, OfferingData } from './services';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentMode = 'PAY_NOW' | 'PAY_AFTER';

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface BookingHistoryData {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorUserId: string | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reason?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface PaymentData {
  id: string;
  bookingId: string;
  amountMinorUnits: number;
  currency: string;
  providerRef: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BookingData {
  id: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  serviceId: string;
  service?: ServiceData;
  offeringId: string;
  offering?: OfferingData;
  slotStart: string;
  slotEnd: string;
  status: BookingStatus;
  priceMinorUnits: number;
  currency: string;
  paymentMode: PaymentMode;
  cancellationReason?: string | null;
  payment?: PaymentData | null;
  history?: BookingHistoryData[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedBookingsResponse {
  data: BookingData[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface QueryBookingsParams {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
  serviceId?: string;
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function createBooking(data: {
  serviceId: string;
  offeringId: string;
  slotStart: string;
  paymentMode: PaymentMode;
}) {
  return apiFetch<BookingData>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBookingById(id: string) {
  return apiFetch<BookingData>(`/bookings/${id}`);
}

export async function getCustomerBookings(params?: QueryBookingsParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<BookingData[]>(`/bookings${queryString}`);
}

export async function getVendorBookings(params?: QueryBookingsParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.serviceId) query.set('serviceId', params.serviceId);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<BookingData[]>(`/vendor/bookings${queryString}`);
}

export async function getAdminBookings(params?: QueryBookingsParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.serviceId) query.set('serviceId', params.serviceId);
  if (params?.vendorId) query.set('vendorId', params.vendorId);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<BookingData[]>(`/admin/bookings${queryString}`);
}

export async function confirmBooking(id: string) {
  return apiFetch<BookingData>(`/bookings/${id}/confirm`, {
    method: 'PATCH',
  });
}

export async function rejectBooking(id: string, reason?: string) {
  return apiFetch<BookingData>(`/bookings/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function cancelBooking(id: string, reason?: string) {
  return apiFetch<BookingData>(`/bookings/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function completeBooking(id: string) {
  return apiFetch<BookingData>(`/bookings/${id}/complete`, {
    method: 'PATCH',
  });
}

export async function noShowBooking(id: string) {
  return apiFetch<BookingData>(`/bookings/${id}/no-show`, {
    method: 'PATCH',
  });
}

export async function rescheduleBooking(id: string, newSlotStart: string) {
  return apiFetch<BookingData>(`/bookings/${id}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify({ newSlotStart }),
  });
}
