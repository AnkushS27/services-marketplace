'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface VendorDocument {
  id: string;
  filename: string;
  originalName: string;
  createdAt: string;
}

interface VendorUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

interface VendorItem {
  id: string;
  userId: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  timezone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  user: VendorUser;
  documents: VendorDocument[];
}

interface MetaPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminVendorsPage() {
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth();

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [meta, setMeta] = useState<MetaPagination>({ total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Action states
  const [rejectingVendor, setRejectingVendor] = useState<VendorItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingDocsVendor, setViewingDocsVendor] = useState<VendorItem | null>(null);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        queryParams.append('status', statusFilter);
      }
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', '10');

      const res = await apiFetch<VendorItem[]>(`/admin/vendors?${queryParams.toString()}`);
      if (res.success && res.data) {
        setVendors(res.data);
        if (res.meta) {
          setMeta(res.meta as MetaPagination);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendor applications');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchVendors();
    }
  }, [isAuthLoading, user, fetchVendors]);

  const handleApprove = async (vendor: VendorItem) => {
    if (!confirm(`Are you sure you want to APPROVE vendor "${vendor.businessName}"?`)) return;

    try {
      await apiFetch(`/admin/vendors/${vendor.id}/approve`, { method: 'PATCH' });
      fetchVendors();
    } catch (err: any) {
      alert(err.message || 'Failed to approve vendor');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingVendor || !rejectionReason.trim()) return;

    setIsSubmitting(true);
    try {
      await apiFetch(`/admin/vendors/${rejectingVendor.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      setRejectingVendor(null);
      setRejectionReason('');
      fetchVendors();
    } catch (err: any) {
      alert(err.message || 'Failed to reject vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || (isLoading && vendors.length === 0)) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-12 w-full animate-pulse rounded bg-muted/30" />
        <div className="h-96 w-full animate-pulse rounded-xl border bg-muted/20" />
      </div>
    );
  }

  const canApprove = hasPermission('vendor.approve');

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Vendor Application Queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review vendor onboarding profiles, inspect verification documents, and approve or reject vendor accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className="text-xs font-semibold"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Vendor Queue Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Applications ({meta.total})</CardTitle>
            <CardDescription className="text-xs">
              Showing page {meta.page} of {meta.totalPages || 1}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <p className="text-base font-medium">No vendor profiles found.</p>
              <p className="text-xs">Try selecting a different status filter above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business & Contact</TableHead>
                  <TableHead>Account Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="font-semibold text-sm">{vendor.businessName}</div>
                      <div className="text-xs text-muted-foreground">
                        {vendor.contactName} ({vendor.contactPhone})
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">{vendor.address}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{vendor.user?.name}</div>
                      <div className="text-xs text-muted-foreground">{vendor.user?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vendor.status === 'APPROVED'
                            ? 'default'
                            : vendor.status === 'REJECTED'
                            ? 'destructive'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {vendor.status}
                      </Badge>
                      {vendor.status === 'REJECTED' && vendor.rejectionReason && (
                        <div className="text-[11px] text-destructive mt-1 max-w-xs truncate" title={vendor.rejectionReason}>
                          Reason: {vendor.rejectionReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs underline text-primary"
                        onClick={() => setViewingDocsVendor(vendor)}
                      >
                        {vendor.documents.length} File(s)
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {canApprove && (
                        <div className="flex items-center justify-end gap-2">
                          {vendor.status !== 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
                              onClick={() => handleApprove(vendor)}
                            >
                              Approve
                            </Button>
                          )}
                          {vendor.status !== 'REJECTED' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-8"
                              onClick={() => {
                                setRejectingVendor(vendor);
                                setRejectionReason('');
                              }}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {rejectingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-destructive">Reject Vendor Application</h3>
              <button onClick={() => setRejectingVendor(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Please provide a clear reason for rejecting <strong>{rejectingVendor.businessName}</strong>. The vendor will see this reason on their portal.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Input
                  id="rejectionReason"
                  placeholder="e.g. Incomplete business license or invalid contact address"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setRejectingVendor(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting || !rejectionReason.trim()}>
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {viewingDocsVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold">Attached Documents</h3>
                <p className="text-xs text-muted-foreground">{viewingDocsVendor.businessName}</p>
              </div>
              <button onClick={() => setViewingDocsVendor(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {viewingDocsVendor.documents.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No verification documents attached by vendor yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Reference Filename</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingDocsVendor.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-xs font-medium">{doc.originalName}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{doc.filename}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewingDocsVendor(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
