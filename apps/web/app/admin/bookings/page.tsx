'use client';

import React, { useState, useEffect } from 'react';
import {
  getAdminBookings,
  BookingData,
  BookingStatus,
} from '@/lib/api/bookings';
import { forceCancelBooking } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import {
  CalendarIcon,
  ClockIcon,
  Building2Icon,
  UserIcon,
  IndianRupeeIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  CreditCardIcon,
  WalletIcon,
  ShieldAlertIcon,
  Loader2Icon,
} from 'lucide-react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Force Cancel Modal
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [forceCancelReason, setForceCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam =
        selectedStatusFilter === 'ALL'
          ? undefined
          : (selectedStatusFilter as BookingStatus);
      const res = await getAdminBookings({ status: statusParam });
      if (res.success && res.data) {
        setBookings(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch admin bookings');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedStatusFilter]);

  const handleForceCancelSubmit = async () => {
    if (!cancelBookingId) return;

    if (!forceCancelReason.trim()) {
      toast.add({
        title: 'Reason Required',
        description: 'Please provide a mandatory reason for admin force cancellation.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forceCancelBooking(cancelBookingId, forceCancelReason);
      if (res.success) {
        toast.add({
          title: 'Booking Force-Cancelled',
          description: 'Booking cancelled by admin override.',
          type: 'success',
        });
        setCancelBookingId(null);
        setForceCancelReason('');
        fetchBookings();
      } else {
        toast.add({
          title: 'Force Cancel Failed',
          description: res.error?.message || 'Failed to cancel booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to force cancel booking',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-500 text-white font-bold gap-1"><CheckCircle2Icon className="w-3 h-3" />CONFIRMED</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-600 text-white font-bold gap-1"><CheckCircle2Icon className="w-3 h-3" />COMPLETED</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950 font-bold gap-1"><ClockIcon className="w-3 h-3" />PENDING</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="font-bold gap-1"><XCircleIcon className="w-3 h-3" />CANCELLED</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="font-bold gap-1"><XCircleIcon className="w-3 h-3" />REJECTED</Badge>;
      case 'NO_SHOW':
        return <Badge variant="outline" className="text-purple-600 border-purple-400 bg-purple-50 font-bold gap-1">NO SHOW</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <ShieldAlertIcon className="w-6 h-6" />
            </div>
            <span>Admin Bookings Console</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide booking administration, status monitoring, and force-cancellation override.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={selectedStatusFilter} onValueChange={setSelectedStatusFilter} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full max-w-3xl">
          <TabsTrigger value="ALL" className="text-xs font-semibold">All</TabsTrigger>
          <TabsTrigger value="PENDING" className="text-xs font-semibold">Pending</TabsTrigger>
          <TabsTrigger value="CONFIRMED" className="text-xs font-semibold">Confirmed</TabsTrigger>
          <TabsTrigger value="COMPLETED" className="text-xs font-semibold">Completed</TabsTrigger>
          <TabsTrigger value="REJECTED" className="text-xs font-semibold">Rejected</TabsTrigger>
          <TabsTrigger value="CANCELLED" className="text-xs font-semibold">Cancelled</TabsTrigger>
          <TabsTrigger value="NO_SHOW" className="text-xs font-semibold">No Show</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-4 animate-pulse bg-card border-border">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 border-destructive/30 bg-destructive/5 text-center space-y-4">
          <AlertCircleIcon className="w-8 h-8 text-destructive mx-auto" />
          <CardTitle className="text-lg font-bold text-destructive">Failed to Load Bookings</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{error}</CardDescription>
          <Button variant="outline" onClick={fetchBookings} className="gap-2 mx-auto">
            <RefreshCwIcon className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-2 border-border bg-card">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/60 mx-auto" />
          <CardTitle className="text-lg font-bold text-foreground">No Platform Bookings Found</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            No bookings registered in the system matching status '{selectedStatusFilter}'.
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const priceRupees = (booking.priceMinorUnits / 100).toLocaleString('en-IN');
            const slotStartDate = new Date(booking.slotStart);
            const canForceCancel =
              booking.status === 'PENDING' || booking.status === 'CONFIRMED';

            return (
              <Card
                key={booking.id}
                className="p-6 border border-border bg-card shadow-xs rounded-2xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        #{booking.id.slice(0, 8)}
                      </span>
                      <h3 className="text-lg font-bold text-foreground">{booking.service?.title}</h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2Icon className="w-3.5 h-3.5 text-primary" />
                      <span>Vendor: <strong>{booking.service?.vendorProfile?.businessName || 'Vendor'}</strong></span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-extrabold text-foreground flex items-center sm:justify-end">
                      <IndianRupeeIcon className="w-4 h-4 text-primary" />
                      {priceRupees}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center sm:justify-end gap-1 mt-0.5">
                      {booking.paymentMode === 'PAY_NOW' ? (
                        <>
                          <CreditCardIcon className="w-3 h-3 text-primary" />
                          Pay Online ({booking.payment?.status || 'INITIATED'})
                        </>
                      ) : (
                        <>
                          <WalletIcon className="w-3 h-3 text-amber-600" />
                          Pay After Service
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-primary" />
                      Customer:
                    </span>
                    <p className="font-semibold text-foreground">{booking.customer?.name}</p>
                    <p className="text-muted-foreground text-[11px]">{booking.customer?.email}</p>
                  </div>

                  {/* Slot info */}
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      Appointment Time:
                    </span>
                    <p className="font-semibold text-foreground">
                      {slotStartDate.toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Offering: {booking.offering?.name} ({booking.offering?.durationMinutes} mins)
                    </p>
                  </div>
                </div>

                {/* Force Cancel Action */}
                {canForceCancel && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-bold text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                      onClick={() => setCancelBookingId(booking.id)}
                    >
                      <XCircleIcon className="w-3.5 h-3.5 text-destructive" />
                      <span>Admin Force Cancel</span>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Force Cancel Modal */}
      <Dialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <ShieldAlertIcon className="w-5 h-5" />
              <span>Admin Force Cancel Booking</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              As an admin, you can force-cancel any pending or confirmed booking regardless of cancellation window rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Mandatory Reason for Cancellation <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Policy violation or emergency platform intervention"
                value={forceCancelReason}
                onChange={(e) => setForceCancelReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelBookingId(null)}
                disabled={isSubmitting}
              >
                Dismiss
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 font-bold"
                onClick={handleForceCancelSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Execute Force Cancel</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
