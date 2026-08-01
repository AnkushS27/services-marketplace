'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  BookingData,
  BookingStatus,
} from '@/lib/api/bookings';
import { SlotPicker } from '@/components/shared/slot-picker';
import { DerivedSlotData } from '@/lib/api/availability';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  Building2Icon,
  IndianRupeeIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  RotateCcwIcon,
  HistoryIcon,
  UserIcon,
  CreditCardIcon,
  WalletIcon,
  Loader2Icon,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { confirmPayment, adminRefundPayment } from '@/lib/api/payments';

export default function CustomerBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { user, hasPermission } = useAuth();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel Dialog
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule Dialog
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newSelectedSlot, setNewSelectedSlot] = useState<DerivedSlotData | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Payment Dialog
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentToken, setPaymentToken] = useState<'tok_success' | 'tok_fail' | 'tok_delay'>('tok_success');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Admin Refund Dialog
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const fetchBooking = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getBookingById(bookingId);
      if (res.success && res.data) {
        setBooking(res.data);
      } else {
        setError(res.error?.message || 'Booking not found');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handleCancelSubmit = async () => {
    setIsCancelling(true);
    try {
      const res = await cancelBooking(bookingId, cancelReason);
      if (res.success && res.data) {
        toast.add({
          title: 'Booking Cancelled',
          description: 'Your booking has been cancelled.',
          type: 'success',
        });
        setIsCancelModalOpen(false);
        setBooking(res.data);
      } else {
        toast.add({
          title: 'Cancellation Failed',
          description: res.error?.message || 'Could not cancel booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to cancel booking',
        type: 'error',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!newSelectedSlot) return;

    setIsRescheduling(true);
    try {
      const res = await rescheduleBooking(bookingId, newSelectedSlot.slotStart);
      if (res.success && res.data) {
        toast.add({
          title: 'Booking Rescheduled!',
          description: 'Your appointment has been updated to the new time slot.',
          type: 'success',
        });
        setIsRescheduleModalOpen(false);
        setBooking(res.data);
      } else {
        toast.add({
          title: 'Reschedule Failed',
          description: res.error?.message || 'Could not reschedule booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to reschedule booking',
        type: 'error',
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handlePaymentSubmit = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await confirmPayment(bookingId, paymentToken);
      if (res.success && res.data) {
        toast.add({
          title: res.data.status === 'SUCCESS' ? 'Payment Successful!' : `Payment Status: ${res.data.status}`,
          description: res.data.status === 'SUCCESS'
            ? 'Your payment was processed successfully.'
            : res.data.status === 'FAILED'
            ? 'Payment failed. The booking slot has been released.'
            : 'Payment is pending async resolution.',
          type: res.data.status === 'SUCCESS' ? 'success' : res.data.status === 'FAILED' ? 'error' : 'info',
        });
        setIsPayModalOpen(false);
        fetchBooking();
      } else {
        toast.add({
          title: 'Payment Error',
          description: res.error?.message || 'Failed to process payment.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Payment processing failed',
        type: 'error',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundReason.trim()) return;
    setIsRefunding(true);
    try {
      const res = await adminRefundPayment(bookingId, refundReason);
      if (res.success) {
        toast.add({
          title: 'Payment Refunded',
          description: 'Payment status updated to REFUNDED.',
          type: 'success',
        });
        setIsRefundModalOpen(false);
        setRefundReason('');
        fetchBooking();
      } else {
        toast.add({
          title: 'Refund Failed',
          description: res.error?.message || 'Could not process refund.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Refund processing failed',
        type: 'error',
      });
    } finally {
      setIsRefunding(false);
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-48 w-full bg-card border border-border animate-pulse rounded-2xl" />
        <div className="h-64 w-full bg-card border border-border animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto p-6 max-w-2xl text-center py-16">
        <Card className="p-12 space-y-4 border-dashed border-2 border-border bg-card">
          <AlertCircleIcon className="w-10 h-10 text-destructive mx-auto" />
          <CardTitle className="text-xl font-bold text-destructive">Booking Not Found</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {error || 'The requested booking details could not be retrieved.'}
          </CardDescription>
          <Link href="/account/bookings">
            <Button variant="outline" className="gap-2">
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back to My Bookings</span>
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isModifyAllowed =
    booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const priceRupees = (booking.priceMinorUnits / 100).toLocaleString('en-IN');
  const slotStartDate = new Date(booking.slotStart);
  const slotEndDate = new Date(booking.slotEnd);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Top Back Link */}
      <div>
        <Link
          href="/account/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to My Bookings</span>
        </Link>
      </div>

      {/* Main Header & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-border bg-card shadow-xs rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Booking ID: #{booking.id.slice(0, 8)}
                </span>
                <h1 className="text-2xl font-extrabold text-foreground">{booking.service?.title}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2Icon className="w-3.5 h-3.5 text-primary" />
                  <span>{booking.service?.vendorProfile?.businessName || 'Vendor'}</span>
                </p>
              </div>

              <div>{getStatusBadge(booking.status)}</div>
            </div>

            {/* Appointment Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-muted-foreground font-medium block">Package Offering</span>
                <p className="font-bold text-foreground text-sm">{booking.offering?.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Duration: {booking.offering?.durationMinutes} mins
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-muted-foreground font-medium block">Appointment Time</span>
                <p className="font-bold text-foreground text-sm flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  {slotStartDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5 text-primary" />
                  {slotStartDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {slotEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-muted-foreground font-medium block">Price Amount</span>
                <p className="font-extrabold text-foreground text-base flex items-center">
                  <IndianRupeeIcon className="w-4 h-4 text-primary" />
                  {priceRupees}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-muted-foreground font-medium block">Payment Option</span>
                <p className="font-bold text-foreground text-xs flex items-center gap-1">
                  {booking.paymentMode === 'PAY_NOW' ? (
                    <>
                      <CreditCardIcon className="w-3.5 h-3.5 text-primary" />
                      Pay Online ({booking.payment?.status || 'INITIATED'})
                    </>
                  ) : (
                    <>
                      <WalletIcon className="w-3.5 h-3.5 text-amber-600" />
                      Pay After Service
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Cancellation Reason if cancelled */}
            {booking.cancellationReason && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <AlertCircleIcon className="w-3.5 h-3.5" />
                  Cancellation Reason:
                </span>
                <p>{booking.cancellationReason}</p>
              </div>
            )}
          </Card>

          {/* Timeline Audit History Card */}
          <Card className="p-6 border border-border bg-card shadow-xs rounded-2xl space-y-4">
            <CardHeader className="px-0 pt-0 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-primary" />
                <span>Booking Status Timeline</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Audit trail of state transitions for this booking.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0 space-y-4">
              {booking.history && booking.history.length > 0 ? (
                <div className="relative border-l-2 border-primary/30 pl-4 space-y-6 my-2">
                  {booking.history.map((item, idx) => (
                    <div key={item.id || idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {item.fromStatus ? `${item.fromStatus} → ` : ''}
                          {item.toStatus}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {item.actor && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-primary" />
                          <span>By {item.actor.name} ({item.actor.email})</span>
                        </p>
                      )}

                      {item.reason && (
                        <p className="text-xs text-foreground bg-secondary/50 p-2 rounded-lg italic">
                          "{item.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No history entries logged.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions Column */}
        <div className="space-y-6">
          <Card className="p-6 border-2 border-primary/30 bg-card shadow-xs rounded-2xl space-y-4">
            <CardHeader className="px-0 pt-0 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-primary" />
                <span>Manage Appointment</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="px-0 space-y-3">
              {booking.paymentMode === 'PAY_NOW' && booking.payment?.status !== 'SUCCESS' && booking.status === 'PENDING' && (
                <Button
                  className="w-full justify-start gap-2 font-bold text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setIsPayModalOpen(true)}
                >
                  <CreditCardIcon className="w-4 h-4" />
                  <span>Complete Online Payment</span>
                </Button>
              )}

              {isModifyAllowed ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 font-semibold text-xs h-10 border-border hover:bg-secondary"
                    onClick={() => setIsRescheduleModalOpen(true)}
                  >
                    <RotateCcwIcon className="w-4 h-4 text-primary" />
                    <span>Reschedule Appointment Slot</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 font-semibold text-xs h-10 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    <XCircleIcon className="w-4 h-4 text-destructive" />
                    <span>Cancel Booking</span>
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  This booking is in state <strong>{booking.status}</strong> and can no longer be modified or cancelled.
                </p>
              )}

              {hasPermission('payment.refund') && booking.payment?.status === 'SUCCESS' && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 font-bold text-xs h-10 text-purple-600 border-purple-300 hover:bg-purple-50"
                  onClick={() => setIsRefundModalOpen(true)}
                >
                  <RotateCcwIcon className="w-4 h-4 text-purple-600" />
                  <span>Admin Manual Refund</span>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <XCircleIcon className="w-5 h-5" />
              <span>Cancel Booking</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel this booking? Free cancellation is subject to vendor policy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Cancellation (Optional)</Label>
              <Input
                placeholder="e.g. Schedule conflict"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 font-bold"
                onClick={handleCancelSubmit}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <RotateCcwIcon className="w-5 h-5 text-primary" />
              <span>Reschedule Appointment</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a new available slot for this service offering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <SlotPicker
              serviceId={booking.serviceId}
              offeringId={booking.offeringId}
              selectedSlot={newSelectedSlot}
              onSelectSlot={(slot) => setNewSelectedSlot(slot)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRescheduleModalOpen(false)}
                disabled={isRescheduling}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                className="gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!newSelectedSlot || isRescheduling}
                onClick={handleRescheduleSubmit}
              >
                {isRescheduling ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <span>Confirm Reschedule</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Online Payment Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-emerald-600" />
              <span>Mock Payment Gateway</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulate an online payment transaction for this appointment booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-secondary/50 rounded-xl border border-border flex justify-between items-center">
              <span className="font-semibold text-muted-foreground">Total Payable Amount</span>
              <span className="font-extrabold text-base text-foreground flex items-center">
                <IndianRupeeIcon className="w-4 h-4 text-primary" />
                {(booking.priceMinorUnits / 100).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Simulated Gateway Outcome Token</Label>
              <select
                className="w-full h-10 px-3 py-2 text-xs rounded-xl border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                value={paymentToken}
                onChange={(e: any) => setPaymentToken(e.target.value)}
              >
                <option value="tok_success">tok_success (Simulate Payment SUCCESS)</option>
                <option value="tok_fail">tok_fail (Simulate Payment FAILED & auto-cancel)</option>
                <option value="tok_delay">tok_delay (Simulate INITIATED pending Webhook)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Select outcome token as specified in Phase 8 testing documentation.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPayModalOpen(false)}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handlePaymentSubmit}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <span>Pay Now</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Manual Refund Modal */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-purple-600 flex items-center gap-2">
              <RotateCcwIcon className="w-5 h-5" />
              <span>Admin Manual Refund</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Issue a manual refund for this payment transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mandatory Refund Reason</Label>
              <Input
                placeholder="e.g. Customer dispute settlement"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(false)}
                disabled={isRefunding}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                className="gap-1.5 font-bold bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleRefundSubmit}
                disabled={!refundReason.trim() || isRefunding}
              >
                {isRefunding ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Refunding...</span>
                  </>
                ) : (
                  <span>Issue Refund</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
