'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getDashboardSummary,
  DashboardSummaryData,
} from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboardIcon,
  StoreIcon,
  CalendarIcon,
  IndianRupeeIcon,
  AlertOctagonIcon,
  ShieldCheckIcon,
  ListCheckIcon,
  HistoryIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDashboardSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setError(res.error?.message || 'Failed to load dashboard metrics');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while loading metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatCurrency = (minorUnits: number) => {
    const rupees = minorUnits / 100;
    return `₹${rupees.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <LayoutDashboardIcon className="w-6 h-6" />
            </div>
            <span>Admin Executive Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operational summary metrics, system integrity, and administrative oversight.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSummary}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto border-border"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* Main Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-6 space-y-3 animate-pulse bg-card border-border">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-36 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 border-destructive/30 bg-destructive/5 text-center space-y-4">
          <AlertCircleIcon className="w-8 h-8 text-destructive mx-auto" />
          <CardTitle className="text-lg font-bold text-destructive">Dashboard Metrics Unavailable</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{error}</CardDescription>
          <Button variant="outline" onClick={fetchSummary} className="gap-2 mx-auto">
            <RefreshCwIcon className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Pending Vendors */}
          <Card className="border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pending Vendors
              </CardTitle>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <StoreIcon className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="text-3xl font-black text-foreground">
                {summary?.pendingVendorApplications ?? 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {summary && summary.pendingVendorApplications > 0 ? (
                  <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40 text-[10px]">
                    Requires Action
                  </Badge>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2Icon className="w-3 h-3" /> Queue empty
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Bookings Today */}
          <Card className="border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bookings Today
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="text-3xl font-black text-foreground">
                {summary?.bookingsToday ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Platform reservations registered today
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Revenue Collected */}
          <Card className="border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Revenue Collected
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <IndianRupeeIcon className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary?.revenueCollectedMinorUnits ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total successfully settled payments
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Failed Payments */}
          <Card className="border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Failed Payments
              </CardTitle>
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertOctagonIcon className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="text-3xl font-black text-destructive">
                {summary?.paymentsFailedCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Payment transactions failed or rejected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Navigation Sections */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Admin Control Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Vendors Queue */}
          <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <StoreIcon className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">Vendor Approvals</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review pending vendor applications, verify documents, and approve or reject vendor onboarding requests.
              </CardDescription>
            </div>
            <Link href="/admin/vendors">
              <Button variant="outline" size="sm" className="w-full justify-between gap-2 border-border group">
                <span>Review Applications</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>

          {/* Card: Bookings Console */}
          <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">Bookings Console</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Monitor all platform bookings, filter across vendors and dates, and execute administrative force-cancellation overrides.
              </CardDescription>
            </div>
            <Link href="/admin/bookings">
              <Button variant="outline" size="sm" className="w-full justify-between gap-2 border-border group">
                <span>Manage Bookings</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>

          {/* Card: Category Catalogue */}
          <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ListCheckIcon className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">Category Catalogue</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Organize the marketplace service tree with 2-level nested parent and sub-categories.
              </CardDescription>
            </div>
            <Link href="/admin/categories">
              <Button variant="outline" size="sm" className="w-full justify-between gap-2 border-border group">
                <span>Manage Tree</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>

          {/* Card: Roles & Permissions */}
          <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">Roles & Permissions</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Define data-driven custom roles, assign permission slug bundles, and create restricted sub-admin accounts.
              </CardDescription>
            </div>
            <Link href="/admin/roles">
              <Button variant="outline" size="sm" className="w-full justify-between gap-2 border-border group">
                <span>Configure RBAC</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>

          {/* Card: System Audit Log */}
          <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <HistoryIcon className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold">System Audit Log</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Inspect immutable administrative audit records tracking force-cancellations, approvals, and role updates.
              </CardDescription>
            </div>
            <Link href="/admin/audit-log">
              <Button variant="outline" size="sm" className="w-full justify-between gap-2 border-border group">
                <span>View Audit Trail</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
