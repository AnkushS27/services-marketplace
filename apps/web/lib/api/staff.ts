import { apiFetch } from '@/lib/api-client';

export interface StaffData {
  id: string;
  vendorProfileId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getVendorStaff() {
  return apiFetch<StaffData[]>('/vendors/me/staff');
}

export async function createStaff(name: string, isActive: boolean = true) {
  return apiFetch<StaffData>('/vendors/me/staff', {
    method: 'POST',
    body: JSON.stringify({ name, isActive }),
  });
}

export async function updateStaff(id: string, name?: string, isActive?: boolean) {
  return apiFetch<StaffData>(`/vendors/me/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...(name !== undefined && { name }),
      ...(isActive !== undefined && { isActive }),
    }),
  });
}

export async function deleteStaff(id: string) {
  return apiFetch<{ success: boolean }>(`/vendors/me/staff/${id}`, {
    method: 'DELETE',
  });
}
