'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  FileTextIcon,
  StoreIcon,
  Loader2Icon,
  UserCheckIcon,
} from 'lucide-react';

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
  const [actionLoading, setActionLoading] = useState(false);

  // Modal / Action states
  const [rejectingVendor, setRejectingVendor] = useState<VendorItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingDocsVendor, setViewingDocsVendor] = useState<VendorItem | null>(null);

  // Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
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
      } else {
        toast.add({
          title: 'Error loading vendors',
          description: res.error?.message || 'Failed to fetch vendor list',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to fetch vendor applications',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchVendors();
    }
  }, [isAuthLoading, user, fetchVendors]);

  const promptApproveVendor = (vendor: VendorItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Vendor Account',
      description: `Are you sure you want to APPROVE vendor "${vendor.businessName}"? This will allow them to publish services to the public catalogue immediately.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await apiFetch(`/admin/vendors/${vendor.id}/approve`, { method: 'PATCH' });
          if (res.success) {
            toast.add({
              title: 'Vendor Approved!',
              description: `"${vendor.businessName}" status is now APPROVED.`,
              type: 'success',
            });
            fetchVendors();
          } else {
            toast.add({
              title: 'Approval Failed',
              description: res.error?.message || 'Failed to approve vendor',
              type: 'error',
            });
          }
        } catch (err: any) {
          toast.add({
            title: 'Error',
            description: err.message || 'Failed to approve vendor',
            type: 'error',
          });
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingVendor || !rejectionReason.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/admin/vendors/${rejectingVendor.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });

      if (res.success) {
        toast.add({
          title: 'Vendor Application Rejected',
          description: `"${rejectingVendor.businessName}" profile rejected.`,
          type: 'info',
        });
        setRejectingVendor(null);
        setRejectionReason('');
        fetchVendors();
      } else {
        toast.add({
          title: 'Rejection Failed',
          description: res.error?.message || 'Failed to reject vendor',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to reject vendor',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || (isLoading && vendors.length === 0)) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-12 w-full animate-pulse rounded bg-muted/30" />
        <div className="h-96 w-full animate-pulse rounded-2xl border bg-card/60" />
      </div>
    );
  }

  const canApprove = hasPermission('vendor.approve');

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <UserCheckIcon className="w-6 h-6 text-primary" />
            <span>Vendor Application Queue</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review vendor onboarding profiles, inspect verification documents, and approve or reject vendor accounts.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`text-xs font-bold ${
                statusFilter === st ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Vendor Queue Table */}
      <Card className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-border/80 bg-secondary/20">
          <div>
            <CardTitle className="text-lg font-bold">Applications Queue ({meta.total})</CardTitle>
            <CardDescription className="text-xs">
              Showing page {meta.page} of {meta.totalPages || 1}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {vendors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <p className="text-base font-bold">No vendor profiles found.</p>
              <p className="text-xs">Try selecting a different status filter above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Business & Contact</TableHead>
                  <TableHead className="font-bold">Account Owner</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Documents</TableHead>
                  <TableHead className="font-bold">Applied Date</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="font-bold text-sm text-foreground">{vendor.businessName}</div>
                      <div className="text-xs text-muted-foreground">
                        {vendor.contactName} ({vendor.contactPhone})
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">{vendor.address}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-foreground">{vendor.user?.name}</div>
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
                        className="text-xs gap-1 font-bold"
                      >
                        {vendor.status === 'APPROVED' && <CheckCircle2Icon className="w-3 h-3" />}
                        {vendor.status === 'PENDING' && <ClockIcon className="w-3 h-3" />}
                        {vendor.status === 'REJECTED' && <XCircleIcon className="w-3 h-3" />}
                        <span>{vendor.status}</span>
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
                        className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                        onClick={() => setViewingDocsVendor(vendor)}
                      >
                        <FileTextIcon className="w-3.5 h-3.5" />
                        <span>{vendor.documents.length} File(s)</span>
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
                              disabled={actionLoading}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 font-semibold gap-1"
                              onClick={() => promptApproveVendor(vendor)}
                            >
                              <CheckCircle2Icon className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </Button>
                          )}
                          {vendor.status !== 'REJECTED' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading}
                              className="text-xs h-8 font-semibold gap-1"
                              onClick={() => {
                                setRejectingVendor(vendor);
                                setRejectionReason('');
                              }}
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              <span>Reject</span>
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
            <div className="flex items-center justify-between pt-6 border-t border-border mt-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                <XCircleIcon className="w-5 h-5" />
                <span>Reject Vendor Application</span>
              </h3>
              <button onClick={() => setRejectingVendor(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Please provide a clear reason for rejecting <strong>{rejectingVendor.businessName}</strong>. The vendor will see this explanation on their portal.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rejectionReason" className="text-xs font-semibold">Rejection Reason</Label>
                <Input
                  id="rejectionReason"
                  placeholder="e.g. Incomplete business license or invalid contact address"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setRejectingVendor(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting || !rejectionReason.trim()} className="gap-1.5">
                  {isSubmitting && <Loader2Icon className="w-4 h-4 animate-spin" />}
                  <span>Confirm Rejection</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {viewingDocsVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in-0">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5 text-primary" />
                  <span>Verification Documents</span>
                </h3>
                <p className="text-xs text-muted-foreground">{viewingDocsVendor.businessName}</p>
              </div>
              <button onClick={() => setViewingDocsVendor(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {viewingDocsVendor.documents.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                No verification documents attached by vendor yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold">Title / Type</TableHead>
                    <TableHead className="text-xs font-bold">Reference Filename</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingDocsVendor.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-xs font-semibold text-foreground">{doc.originalName}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{doc.filename}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setViewingDocsVendor(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        isLoading={actionLoading}
      />
    </div>
  );
}
