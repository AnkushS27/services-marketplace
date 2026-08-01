'use client';

import React, { useState, useEffect } from 'react';
import {
  getVendorBookings,
  confirmBooking,
  rejectBooking,
  completeBooking,
  noShowBooking,
  cancelBooking,
  BookingData,
  BookingStatus,
} from '@/lib/api/bookings';
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
  UserIcon,
  IndianRupeeIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  CreditCardIcon,
  WalletIcon,
  UserXIcon,
  CheckIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react';

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modal Action State
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    type: 'REJECT' | 'CANCEL';
  } | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam =
        selectedStatusFilter === 'ALL'
          ? undefined
          : (selectedStatusFilter as BookingStatus);
      const res = await getVendorBookings({ status: statusParam });
      if (res.success && res.data) {
        setBookings(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch vendor bookings');
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

  const handleConfirm = async (id: string) => {
    try {
      const res = await confirmBooking(id);
      if (res.success && res.data) {
        toast.add({
          title: 'Booking Confirmed!',
          description: 'Appointment confirmed successfully.',
          type: 'success',
        });
        fetchBookings();
      } else {
        toast.add({
          title: 'Confirmation Failed',
          description: res.error?.message || 'Could not confirm booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to confirm booking',
        type: 'error',
      });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await completeBooking(id);
      if (res.success && res.data) {
        toast.add({
          title: 'Booking Completed!',
          description: 'Service marked as completed.',
          type: 'success',
        });
        fetchBookings();
      } else {
        toast.add({
          title: 'Completion Failed',
          description: res.error?.message || 'Could not complete booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to complete booking',
        type: 'error',
      });
    }
  };

  const handleNoShow = async (id: string) => {
    try {
      const res = await noShowBooking(id);
      if (res.success && res.data) {
        toast.add({
          title: 'Marked as No-Show',
          description: 'Customer marked as no-show.',
          type: 'info',
        });
        fetchBookings();
      } else {
        toast.add({
          title: 'Action Failed',
          description: res.error?.message || 'Could not mark no-show.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to mark no-show',
        type: 'error',
      });
    }
  };

  const handleActionModalSubmit = async () => {
    if (!actionTarget) return;

    setIsSubmittingAction(true);
    try {
      let res;
      if (actionTarget.type === 'REJECT') {
        res = await rejectBooking(actionTarget.id, reasonInput);
      } else {
        res = await cancelBooking(actionTarget.id, reasonInput);
      }

      if (res.success) {
        toast.add({
          title: actionTarget.type === 'REJECT' ? 'Booking Rejected' : 'Booking Cancelled',
          description: 'Status updated successfully.',
          type: 'success',
        });
        setActionTarget(null);
        setReasonInput('');
        fetchBookings();
      } else {
        toast.add({
          title: 'Operation Failed',
          description: res.error?.message || 'Action failed.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to execute action',
        type: 'error',
      });
    } finally {
      setIsSubmittingAction(false);
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
              <CalendarIcon className="w-6 h-6" />
            </div>
            <span>Vendor Bookings Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, confirm, complete, or reject customer appointments against your services.
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

      {/* Main List */}
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
          <CardTitle className="text-lg font-bold text-foreground">No Bookings Found</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {selectedStatusFilter === 'ALL'
              ? "No customer bookings have been placed yet for your services."
              : `No bookings matching status '${selectedStatusFilter}'.`}
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const priceRupees = (booking.priceMinorUnits / 100).toLocaleString('en-IN');
            const slotStartDate = new Date(booking.slotStart);
            const slotEndDate = new Date(booking.slotEnd);

            return (
              <Card
                key={booking.id}
                className="p-6 border border-border bg-card shadow-xs rounded-2xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">{booking.service?.title}</h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-xs font-semibold text-primary">
                      Offering: {booking.offering?.name} ({booking.offering?.durationMinutes} mins)
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
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1.5">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-primary" />
                      Customer Info:
                    </span>
                    <p className="font-semibold text-foreground">{booking.customer?.name || 'Customer'}</p>
                    <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <MailIcon className="w-3 h-3" />
                      {booking.customer?.email}
                    </p>
                    {booking.customer?.phone && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <PhoneIcon className="w-3 h-3" />
                        {booking.customer.phone}
                      </p>
                    )}
                  </div>

                  {/* Appointment Slot Info */}
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1.5">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      Slot Schedule:
                    </span>
                    <p className="font-semibold text-foreground">
                      {slotStartDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <ClockIcon className="w-3 h-3 text-primary" />
                      {slotStartDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {slotEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* State Machine Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  {booking.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        onClick={() => handleConfirm(booking.id)}
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Confirm Booking</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 font-bold text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                        onClick={() => setActionTarget({ id: booking.id, type: 'REJECT' })}
                      >
                        <XCircleIcon className="w-3.5 h-3.5 text-destructive" />
                        <span>Reject Booking</span>
                      </Button>
                    </>
                  )}

                  {booking.status === 'CONFIRMED' && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        onClick={() => handleComplete(booking.id)}
                      >
                        <CheckCircle2Icon className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 font-bold text-purple-600 border-purple-300 hover:bg-purple-50 text-xs"
                        onClick={() => handleNoShow(booking.id)}
                      >
                        <UserXIcon className="w-3.5 h-3.5 text-purple-600" />
                        <span>Mark No-Show</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 font-bold text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                        onClick={() => setActionTarget({ id: booking.id, type: 'CANCEL' })}
                      >
                        <XCircleIcon className="w-3.5 h-3.5 text-destructive" />
                        <span>Cancel Booking</span>
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Dialog (Reject / Cancel) */}
      <Dialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <XCircleIcon className="w-5 h-5" />
              <span>{actionTarget?.type === 'REJECT' ? 'Reject Booking' : 'Cancel Booking'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionTarget?.type === 'REJECT'
                ? 'Are you sure you want to reject this booking application?'
                : 'Are you sure you want to cancel this confirmed booking?'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason (Optional)</Label>
              <Input
                placeholder="e.g. Schedule clash or emergency"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionTarget(null)}
                disabled={isSubmittingAction}
              >
                Dismiss
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 font-bold"
                onClick={handleActionModalSubmit}
                disabled={isSubmittingAction}
              >
                {isSubmittingAction ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Action</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
