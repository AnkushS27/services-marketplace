'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPublicServiceDetail, ServiceData } from '@/lib/api/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';

export default function PublicServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);

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

            <Button
              className="w-full font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11"
              size="lg"
              disabled={!selectedOfferingId}
              onClick={() => {
                toast.add({
                  title: 'Offering Selected',
                  description: 'Slot picker & booking creation engine will land in Phase 6 & Phase 7!',
                  type: 'info',
                });
              }}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Select Slot & Book</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
