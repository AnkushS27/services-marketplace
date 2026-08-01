'use client';

import React, { useState, useEffect } from 'react';
import {
  getAuditLogs,
  AuditLogData,
} from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  HistoryIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
} from 'lucide-react';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs({
        page,
        pageSize: 15,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        targetType: targetTypeFilter === 'ALL' ? undefined : targetTypeFilter,
      });

      if (res.success && res.data) {
        setLogs(res.data);
        if (res.meta) {
          setTotal(res.meta.total);
          setTotalPages(res.meta.totalPages || 1);
        }
      } else {
        setError(res.error?.message || 'Failed to fetch audit logs');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, actionFilter, targetTypeFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('cancel')) {
      return <Badge variant="destructive" className="font-mono text-[10px] uppercase">{action}</Badge>;
    }
    if (action.includes('approve')) {
      return <Badge className="bg-emerald-600 text-white font-mono text-[10px] uppercase">{action}</Badge>;
    }
    if (action.includes('reject') || action.includes('suspend')) {
      return <Badge className="bg-amber-600 text-white font-mono text-[10px] uppercase">{action}</Badge>;
    }
    return <Badge variant="secondary" className="font-mono text-[10px] uppercase">{action}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <span>System Audit Trail</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable administrative logs capturing force-cancellations, vendor approvals, role assignments, and platform interventions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="gap-2 border-border self-start sm:self-auto"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase">Filter Action:</span>
          <Select
            value={actionFilter}
            onValueChange={(val) => {
              if (val !== null) {
                setActionFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px] text-xs">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="booking.force_cancel">booking.force_cancel</SelectItem>
              <SelectItem value="vendor.approve">vendor.approve</SelectItem>
              <SelectItem value="vendor.reject">vendor.reject</SelectItem>
              <SelectItem value="service.suspend">service.suspend</SelectItem>
              <SelectItem value="role.create">role.create</SelectItem>
              <SelectItem value="role.update">role.update</SelectItem>
              <SelectItem value="role.assign">role.assign</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase">Target Entity:</span>
          <Select
            value={targetTypeFilter}
            onValueChange={(val) => {
              if (val !== null) {
                setTargetTypeFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] text-xs">
              <SelectValue placeholder="All Target Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Entities</SelectItem>
              <SelectItem value="Booking">Booking</SelectItem>
              <SelectItem value="VendorProfile">Vendor Profile</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="Role">Role</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Log Table Content */}
      {isLoading ? (
        <Card className="p-6 space-y-4 animate-pulse bg-card border-border">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-40 w-full bg-muted rounded" />
        </Card>
      ) : error ? (
        <Card className="p-8 border-destructive/30 bg-destructive/5 text-center space-y-4">
          <AlertCircleIcon className="w-8 h-8 text-destructive mx-auto" />
          <CardTitle className="text-lg font-bold text-destructive">Failed to Load Audit Trail</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{error}</CardDescription>
          <Button variant="outline" onClick={fetchAuditLogs} className="gap-2 mx-auto">
            <RefreshCwIcon className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-2 border-border bg-card">
          <FileTextIcon className="w-12 h-12 text-muted-foreground/60 mx-auto" />
          <CardTitle className="text-lg font-bold text-foreground">No Audit Records Found</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            No system audit entries matching selected filters. Admin actions like force-cancellations or vendor approvals will automatically log events here.
          </CardDescription>
        </Card>
      ) : (
        <Card className="border border-border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase">Timestamp (UTC)</TableHead>
                <TableHead className="text-xs font-bold uppercase">Action</TableHead>
                <TableHead className="text-xs font-bold uppercase">Admin Actor</TableHead>
                <TableHead className="text-xs font-bold uppercase">Target Entity</TableHead>
                <TableHead className="text-xs font-bold uppercase">Metadata / Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const dateStr = new Date(log.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <TableRow key={log.id} className="hover:bg-secondary/30 transition-colors text-xs">
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {dateStr}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-primary" />
                            {log.actor.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[10px]">System / Automated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground">{log.targetType || 'N/A'}</span>
                      {log.targetId && (
                        <span className="font-mono text-[10px] text-muted-foreground block">
                          #{log.targetId.slice(0, 8)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {log.metadata ? (
                        <pre className="text-[10px] font-mono bg-secondary/80 p-1.5 rounded border border-border overflow-x-auto text-foreground">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/20">
              <span className="text-xs text-muted-foreground">
                Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({total} total logs)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="gap-1 text-xs"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="gap-1 text-xs"
                >
                  Next
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
