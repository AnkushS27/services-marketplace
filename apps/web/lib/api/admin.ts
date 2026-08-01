import { apiFetch } from '../api-client';
import { BookingData } from './bookings';

export interface DashboardSummaryData {
  pendingVendorApplications: number;
  bookingsToday: number;
  revenueCollectedMinorUnits: number;
  paymentsFailedCount: number;
}

export interface AuditLogData {
  id: string;
  actorUserId: string | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface QueryAuditLogsParams {
  page?: number;
  pageSize?: number;
  action?: string;
  actorUserId?: string;
  targetType?: string;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogData[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function getDashboardSummary() {
  return apiFetch<DashboardSummaryData>('/admin/dashboard/summary');
}

export async function forceCancelBooking(id: string, reason: string) {
  return apiFetch<BookingData>(`/admin/bookings/${id}/force-cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function getAuditLogs(params?: QueryAuditLogsParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params?.action) query.set('action', params.action);
  if (params?.actorUserId) query.set('actorUserId', params.actorUserId);
  if (params?.targetType) query.set('targetType', params.targetType);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<AuditLogData[]>(`/admin/audit-logs${queryString}`);
}
