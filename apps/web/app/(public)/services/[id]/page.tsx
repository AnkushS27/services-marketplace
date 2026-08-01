'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPublicServiceDetail, ServiceData } from '@/lib/api/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PublicServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadServiceDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getPublicServiceDetail(serviceId);
        if (res.success && res.data) {
          setService(res.data);
          if (res.data.offerings && res.data.offerings.length > 0) {
            setSelectedOfferingId(res.data.offerings[0].id);
          }
        } else {
          setError(res.error?.message || 'Service not found or unavailable');
        }
      } catch (err: any) {
        setError(err?.message || 'Service not found');
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
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container mx-auto p-6 max-w-3xl space-y-6 text-center py-16">
        <Card className="p-8 space-y-4">
          <CardTitle className="text-2xl font-bold text-destructive">
            Service Not Found
          </CardTitle>
          <CardDescription className="text-base">
            {error || 'This service is not available or has been removed.'}
          </CardDescription>
          <Button onClick={() => router.push('/services')}>Back to Service Catalogue</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      {/* Breadcrumb / Back link */}
      <div>
        <Link
          href="/services"
          className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Catalogue
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {service.category && (
                <Badge variant="secondary" className="text-xs">
                  {service.category.name}
                </Badge>
              )}
              <Badge
                variant={service.status === 'PUBLISHED' ? 'default' : 'outline'}
                className="text-xs"
              >
                {service.status}
              </Badge>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight">{service.title}</h1>

            {service.vendorProfile && (
              <p className="text-sm text-muted-foreground">
                Offered by{' '}
                <strong className="text-foreground font-semibold">
                  {service.vendorProfile.businessName}
                </strong>
              </p>
            )}
          </div>

          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg">About this Service</CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {service.description}
            </CardContent>
          </Card>

          {/* Cancellation Policy Banner */}
          <Alert variant="default" className="bg-muted/40">
            <AlertTitle className="font-semibold">Cancellation Policy</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              Free cancellation is available up to <strong>{service.freeCancellationHours} hours</strong> before the scheduled slot time.
            </AlertDescription>
          </Alert>

          {/* Offerings Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Available Offerings</h2>
            {service.offerings && service.offerings.length > 0 ? (
              <div className="space-y-3">
                {service.offerings.map((offering) => {
                  const isSelected = selectedOfferingId === offering.id;
                  const priceRupees = offering.priceMinorUnits / 100;

                  return (
                    <Card
                      key={offering.id}
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setSelectedOfferingId(offering.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-base">{offering.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Duration: <strong>{offering.durationMinutes} minutes</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-foreground">
                            ₹{priceRupees.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No active offerings listed for this service currently.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          {/* Vendor Details Card */}
          {service.vendorProfile && (
            <Card className="p-6 space-y-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base">Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Business:</span>
                  <p className="font-medium text-sm text-foreground">
                    {service.vendorProfile.businessName}
                  </p>
                </div>
                {service.vendorProfile.address && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium text-foreground">{service.vendorProfile.address}</p>
                  </div>
                )}
                {service.vendorProfile.timezone && (
                  <div>
                    <span className="text-muted-foreground">Timezone:</span>
                    <p className="font-medium text-foreground">{service.vendorProfile.timezone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Booking Action Card */}
          <Card className="p-6 space-y-4 border-2 border-primary/20 bg-card">
            <CardTitle className="text-lg">Book Service</CardTitle>
            <CardDescription className="text-xs">
              Select an offering to proceed to available appointment time slots.
            </CardDescription>

            <Button
              className="w-full"
              size="lg"
              disabled={!selectedOfferingId}
              onClick={() => {
                alert('Slot picker and booking creation will be enabled in Phase 6 & Phase 7!');
              }}
            >
              Select Slot & Book
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
