import { apiFetch } from '../api-client';
import { CategoryData } from './categories';

export interface OfferingData {
  id: string;
  serviceId: string;
  name: string;
  durationMinutes: number;
  priceMinorUnits: number;
  isActive: boolean;
  createdAt: string;
}

export interface VendorProfileSummary {
  id: string;
  userId?: string;
  businessName: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  timezone?: string;
  status?: string;
}

export interface ServiceData {
  id: string;
  vendorProfileId: string;
  categoryId: string;
  title: string;
  description: string;
  images: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
  suspendedReason?: string | null;
  freeCancellationHours: number;
  category?: CategoryData;
  vendorProfile?: VendorProfileSummary;
  offerings?: OfferingData[];
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedServicesResponse {
  data: ServiceData[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function getVendorServices() {
  return apiFetch<ServiceData[]>('/vendors/me/services');
}

export async function createService(data: {
  title: string;
  description: string;
  categoryId: string;
  images?: string[];
  freeCancellationHours?: number;
}) {
  return apiFetch<ServiceData>('/vendors/me/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateService(
  id: string,
  data: {
    title?: string;
    description?: string;
    categoryId?: string;
    images?: string[];
    freeCancellationHours?: number;
  },
) {
  return apiFetch<ServiceData>(`/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteService(id: string) {
  return apiFetch<{ success: boolean }>(`/services/${id}`, {
    method: 'DELETE',
  });
}

export async function publishService(id: string) {
  return apiFetch<ServiceData>(`/services/${id}/publish`, {
    method: 'PATCH',
  });
}

export async function suspendService(id: string, reason: string) {
  return apiFetch<ServiceData>(`/services/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function addOffering(
  serviceId: string,
  data: { name: string; durationMinutes: number; priceMinorUnits: number },
) {
  return apiFetch<OfferingData>(`/services/${serviceId}/offerings`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOffering(
  offeringId: string,
  data: { name?: string; durationMinutes?: number; priceMinorUnits?: number; isActive?: boolean },
) {
  return apiFetch<OfferingData>(`/offerings/${offeringId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteOffering(offeringId: string) {
  return apiFetch<{ success: boolean }>(`/offerings/${offeringId}`, {
    method: 'DELETE',
  });
}

export async function getPublicServices(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params?.search) query.set('search', params.search);
  if (params?.categoryId) query.set('categoryId', params.categoryId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<ServiceData[]>(`/services${queryString}`);
}

export async function getPublicServiceDetail(id: string) {
  return apiFetch<ServiceData>(`/services/${id}`);
}
