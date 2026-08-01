'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCustomerBookings, BookingData, BookingStatus } from '@/lib/api/bookings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import {
  CalendarIcon,
  ClockIcon,
  Building2Icon,
  IndianRupeeIcon,
  ChevronRightIcon,
  FilterIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  CreditCardIcon,
  WalletIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from 'lucide-react';

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = selectedStatusFilter === 'ALL' ? undefined : (selectedStatusFilter as BookingStatus);
      const res = await getCustomerBookings({ status: statusParam });
      if (res.success && res.data) {
        setBookings(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch bookings');
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
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <span>My Bookings</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your service appointments and booking history.
          </p>
        </div>

        <Link href="/services">
          <Button className="font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <span>Browse Services</span>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={selectedStatusFilter} onValueChange={setSelectedStatusFilter} className="w-full">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full max-w-2xl">
            <TabsTrigger value="ALL" className="text-xs font-semibold">All</TabsTrigger>
            <TabsTrigger value="PENDING" className="text-xs font-semibold">Pending</TabsTrigger>
            <TabsTrigger value="CONFIRMED" className="text-xs font-semibold">Confirmed</TabsTrigger>
            <TabsTrigger value="COMPLETED" className="text-xs font-semibold">Completed</TabsTrigger>
            <TabsTrigger value="CANCELLED" className="text-xs font-semibold">Cancelled</TabsTrigger>
            <TabsTrigger value="REJECTED" className="text-xs font-semibold">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-foreground">No Bookings Found</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {selectedStatusFilter === 'ALL'
                ? "You haven't made any bookings yet."
                : `No bookings with status '${selectedStatusFilter}' found.`}
            </CardDescription>
          </div>
          <Link href="/services">
            <Button variant="outline" className="gap-2 mt-2 font-semibold">
              <span>Explore Available Services</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const priceRupees = (booking.priceMinorUnits / 100).toLocaleString('en-IN');
            const slotStartDate = new Date(booking.slotStart);

            return (
              <Card
                key={booking.id}
                className="p-6 border border-border bg-card hover:border-primary/40 transition-all rounded-2xl shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">{booking.service?.title}</h3>
                      {getStatusBadge(booking.status)}
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2Icon className="w-3.5 h-3.5 text-primary" />
                      <span>{booking.service?.vendorProfile?.businessName || 'Vendor'}</span>
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <span className="font-semibold text-foreground bg-secondary/60 px-2.5 py-1 rounded-md">
                      Package: {booking.offering?.name}
                    </span>

                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      {slotStartDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <ClockIcon className="w-3.5 h-3.5 text-primary" />
                      {slotStartDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <Link href={`/account/bookings/${booking.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-xs border-border hover:bg-secondary">
                      <span>View Details & Timeline</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
