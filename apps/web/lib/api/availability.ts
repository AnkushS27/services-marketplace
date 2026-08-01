import { apiFetch } from '../api-client';

export interface AvailabilityRuleData {
  id: string;
  serviceId: string;
  weekday: number; // 0 = Sunday .. 6 = Saturday
  startMinute: number;
  endMinute: number;
  capacity: number;
  createdAt?: string;
}

export interface AvailabilityExceptionData {
  id: string;
  serviceId: string;
  date: string;
  isClosed: boolean;
  startMinute?: number | null;
  endMinute?: number | null;
  capacity?: number | null;
  createdAt?: string;
}

export interface ServiceAvailabilityResponse {
  rules: AvailabilityRuleData[];
  exceptions: AvailabilityExceptionData[];
}

export interface DerivedSlotData {
  slotStart: string; // ISO String
  slotEnd: string; // ISO String
  remaining: number;
  capacity: number;
}

export async function getServiceAvailability(serviceId: string) {
  return apiFetch<ServiceAvailabilityResponse>(`/services/${serviceId}/availability`);
}

export async function createAvailabilityRule(
  serviceId: string,
  data: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    capacity: number;
  },
) {
  return apiFetch<AvailabilityRuleData>(`/services/${serviceId}/availability-rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAvailabilityRule(ruleId: string) {
  return apiFetch<{ success: boolean }>(`/availability-rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export async function createAvailabilityException(
  serviceId: string,
  data: {
    date: string;
    isClosed: boolean;
    startMinute?: number;
    endMinute?: number;
    capacity?: number;
  },
) {
  return apiFetch<AvailabilityExceptionData>(
    `/services/${serviceId}/availability-exceptions`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function deleteAvailabilityException(exceptionId: string) {
  return apiFetch<{ success: boolean }>(`/availability-exceptions/${exceptionId}`, {
    method: 'DELETE',
  });
}

export async function getServiceSlots(
  serviceId: string,
  offeringId: string,
  from?: string,
  to?: string,
) {
  const query = new URLSearchParams();
  query.set('offeringId', offeringId);
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  return apiFetch<DerivedSlotData[]>(`/services/${serviceId}/slots?${query.toString()}`);
}

export async function getNextAvailableSlot(serviceId: string, offeringId: string) {
  return apiFetch<DerivedSlotData | null>(
    `/services/${serviceId}/next-available?offeringId=${offeringId}`,
  );
}
