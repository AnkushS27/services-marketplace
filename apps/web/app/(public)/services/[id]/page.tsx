'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getPublicServiceDetail, ServiceData, OfferingData } from '@/lib/api/services';
import { createBooking, PaymentMode } from '@/lib/api/bookings';
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
import { toast } from '@/components/ui/toast';
import {
  ArrowLeftIcon,
  Building2Icon,
  ClockIcon,
  ShieldCheckIcon,
  TagIcon,
  CheckCircle2Icon,
  IndianRupeeIcon,
  CalendarIcon,
  LayersIcon,
  SparklesIcon,
  MapPinIcon,
  GlobeIcon,
  CreditCardIcon,
  WalletIcon,
  Loader2Icon,
} from 'lucide-react';

export default function PublicServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const { user } = useAuth();

  const [service, setService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DerivedSlotData | null>(null);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('PAY_NOW');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadServiceDetail() {
      setIsLoading(true);
      try {
        const res = await getPublicServiceDetail(serviceId);
        if (res.success && res.data) {
          setService(res.data);
          if (res.data.offerings && res.data.offerings.length > 0) {
            setSelectedOfferingId(res.data.offerings[0].id);
          }
        } else {
          toast.add({
            title: 'Service Not Found',
            description: res.error?.message || 'This service is unavailable or suspended.',
            type: 'error',
          });
        }
      } catch (err: any) {
        toast.add({
          title: 'Error',
          description: err?.message || 'Failed to load service details',
          type: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (serviceId) {
      loadServiceDetail();
    }
  }, [serviceId]);

  const selectedOffering: OfferingData | undefined = service?.offerings?.find(
    (o) => o.id === selectedOfferingId,
  );

  const handleProceedClick = () => {
    if (!user) {
      toast.add({
        title: 'Authentication Required',
        description: 'Please log in or sign up to book a service appointment.',
        type: 'error',
      });
      router.push(`/login?redirect=/services/${serviceId}`);
      return;
    }

    if (!selectedOfferingId || !selectedSlot) {
      toast.add({
        title: 'Selection Required',
        description: 'Please select an offering package and appointment slot.',
        type: 'error',
      });
      return;
    }

    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedOfferingId || !selectedSlot) return;

    setIsSubmitting(true);
    try {
      const res = await createBooking({
        serviceId,
        offeringId: selectedOfferingId,
        slotStart: selectedSlot.slotStart,
        paymentMode,
      });

      if (res.success && res.data) {
        toast.add({
          title: 'Booking Created Successfully!',
          description: 'Your appointment slot has been reserved.',
          type: 'success',
        });
        setIsBookingModalOpen(false);
        router.push(`/account/bookings/${res.data.id}`);
      } else {
        toast.add({
          title: 'Booking Failed',
          description: res.error?.message || 'Could not reserve slot.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Booking Error',
        description: err?.message || 'Failed to create booking',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-card border border-border" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto p-6 max-w-3xl text-center py-16">
        <Card className="p-12 space-y-4 border-dashed border-2 border-border bg-card">
          <CardTitle className="text-2xl font-bold text-destructive">
            Service Unavailable
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            The requested service could not be found or is not currently published.
          </CardDescription>
          <Button onClick={() => router.push('/services')} className="gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Catalogue</span>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to Catalogue</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3 bg-card p-6 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2">
              {service.category && (
                <Badge variant="secondary" className="text-xs font-semibold gap-1">
                  <TagIcon className="w-3 h-3 text-primary" />
                  <span>{service.category.name}</span>
                </Badge>
              )}
              <Badge
                variant={service.status === 'PUBLISHED' ? 'default' : 'outline'}
                className="text-xs font-bold gap-1"
              >
                <CheckCircle2Icon className="w-3 h-3" />
                <span>{service.status}</span>
              </Badge>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{service.title}</h1>

            {service.vendorProfile && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Building2Icon className="w-4 h-4 text-primary" />
                <span>Offered by <strong>{service.vendorProfile.businessName}</strong></span>
              </p>
            )}
          </div>

          {/* Description Card */}
          <Card className="p-6 border-border bg-card shadow-xs rounded-2xl">
            <CardHeader className="px-0 pt-0 pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-primary" />
                <span>About this Service</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {service.description}
            </CardContent>
          </Card>

          {/* Cancellation Policy Banner */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border flex items-start gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-foreground">Cancellation & Reschedule Policy</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Free cancellation is allowed up to <strong>{service.freeCancellationHours} hours</strong> before your appointment slot.
              </p>
            </div>
          </div>

          {/* Offerings Options Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <LayersIcon className="w-5 h-5 text-primary" />
              <span>Select Package Offering</span>
            </h2>

            {service.offerings && service.offerings.length > 0 ? (
              <div className="space-y-3">
                {service.offerings.map((offering) => {
                  const isSelected = selectedOfferingId === offering.id;
                  const priceRupees = offering.priceMinorUnits / 100;

                  return (
                    <Card
                      key={offering.id}
                      className={`p-5 cursor-pointer transition-all rounded-2xl border-2 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                      onClick={() => setSelectedOfferingId(offering.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">{offering.name}</span>
                            {isSelected && (
                              <Badge className="bg-primary text-primary-foreground text-[10px]">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>Duration: <strong>{offering.durationMinutes} minutes</strong></span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-foreground flex items-center justify-end gap-0.5">
                            <IndianRupeeIcon className="w-5 h-5 text-primary" />
                            {priceRupees.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No active offerings listed for this service currently.
              </p>
            )}

            {/* Interactive Slot Picker */}
            {selectedOfferingId && (
              <Card className="p-6 border-2 border-primary/30 bg-card shadow-xs rounded-2xl space-y-4 mt-6">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">
                    Available Appointment Slots
                  </h3>
                </div>
                <SlotPicker
                  serviceId={serviceId}
                  offeringId={selectedOfferingId}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(slot) => {
                    setSelectedSlot(slot);
                    toast.add({
                      title: 'Slot Selected!',
                      description: `Appointment selected for ${new Date(slot.slotStart).toLocaleDateString()} at ${new Date(slot.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                      type: 'success',
                    });
                  }}
                />
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Vendor Details Card */}
          {service.vendorProfile && (
            <Card className="p-6 space-y-4 border-border bg-card shadow-xs rounded-2xl">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2Icon className="w-4 h-4 text-primary" />
                  <span>Vendor Details</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="px-0 space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Business Name:</span>
                  <p className="font-bold text-sm text-foreground">
                    {service.vendorProfile.businessName}
                  </p>
                </div>

                {service.vendorProfile.address && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      Location:
                    </span>
                    <p className="font-medium text-foreground">{service.vendorProfile.address}</p>
                  </div>
                )}

                {service.vendorProfile.timezone && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <GlobeIcon className="w-3.5 h-3.5" />
                      Timezone:
                    </span>
                    <p className="font-medium text-foreground">{service.vendorProfile.timezone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Booking Action Card */}
          <Card className="p-6 space-y-4 border-2 border-primary/40 bg-card shadow-md rounded-2xl">
            <div className="space-y-1">
              <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <span>Ready to Book?</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select your package offering and choose an available appointment slot.
              </CardDescription>
            </div>

            {selectedSlot && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                <span className="font-bold text-foreground block">Selected Slot:</span>
                <p className="text-muted-foreground">
                  {new Date(selectedSlot.slotStart).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(selectedSlot.slotStart).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            <Button
              className="w-full font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11"
              size="lg"
              disabled={!selectedOfferingId || !selectedSlot}
              onClick={handleProceedClick}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>{selectedSlot ? 'Proceed to Book' : 'Select a Slot Above'}</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span>Confirm Appointment</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review your appointment summary and select your payment preference.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Booking Summary Box */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-bold text-foreground">{service.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Package:</span>
                <span className="font-bold text-foreground">{selectedOffering?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium text-foreground">{selectedOffering?.durationMinutes} mins</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="font-medium text-foreground">
                  {selectedSlot &&
                    new Date(selectedSlot.slotStart).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center text-sm">
                <span className="font-bold text-foreground">Total Price:</span>
                <span className="font-extrabold text-primary flex items-center">
                  <IndianRupeeIcon className="w-4 h-4" />
                  {selectedOffering ? (selectedOffering.priceMinorUnits / 100).toLocaleString('en-IN') : 0}
                </span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Payment Option
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2 text-xs ${
                    paymentMode === 'PAY_NOW'
                      ? 'border-primary bg-primary/10 font-bold'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                  onClick={() => setPaymentMode('PAY_NOW')}
                >
                  <CreditCardIcon className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold">Pay Online Now</p>
                    <p className="text-[10px] text-muted-foreground">Instant payment</p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2 text-xs ${
                    paymentMode === 'PAY_AFTER'
                      ? 'border-primary bg-primary/10 font-bold'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                  onClick={() => setPaymentMode('PAY_AFTER')}
                >
                  <WalletIcon className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold">Pay After Service</p>
                    <p className="text-[10px] text-muted-foreground">Cash / Direct</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              className="w-full font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 mt-4"
              disabled={isSubmitting}
              onClick={handleConfirmBooking}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  <span>Reserving Slot...</span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="w-4 h-4" />
                  <span>Confirm & Reserve Booking</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
