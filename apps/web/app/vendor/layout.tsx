'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface VendorProfileData {
  id: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  timezone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  approvedAt?: string | null;
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<VendorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVendorProfile() {
      if (user && user.role.type === 'VENDOR') {
        try {
          const res = await apiFetch<VendorProfileData>('/vendors/me');
          if (res.success && res.data) {
            setProfile(res.data);
          }
        } catch {
          // Profile might not exist yet or failed to fetch
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      loadVendorProfile();
    }
  }, [user, isAuthLoading]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-64 w-full animate-pulse rounded-xl border bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Global Vendor Status Banner */}
      {profile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vendor Portal</h1>
              <p className="text-sm text-muted-foreground">
                Manage your profile, services, availability, and bookings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  profile.status === 'APPROVED'
                    ? 'default'
                    : profile.status === 'REJECTED'
                    ? 'destructive'
                    : 'outline'
                }
                className="px-3 py-1 text-sm font-semibold"
              >
                Status: {profile.status}
              </Badge>
              <Link
                href="/vendor/onboarding"
                className="text-xs font-medium text-primary hover:underline"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {profile.status === 'PENDING' && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTitle className="font-semibold flex items-center gap-2">
                <span>⏳ Account Under Review</span>
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs md:text-sm">
                Your vendor profile application is currently PENDING review by an admin. You can complete and update your business details and upload documents below. Publishing services is disabled until your account is approved.
              </AlertDescription>
            </Alert>
          )}

          {profile.status === 'REJECTED' && (
            <Alert variant="destructive">
              <AlertTitle className="font-semibold flex items-center gap-2">
                <span>❌ Application Rejected</span>
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs md:text-sm">
                Reason for rejection: <strong>{profile.rejectionReason || 'No reason provided'}</strong>. Please update your business details and documents, then contact administration to request re-review.
              </AlertDescription>
            </Alert>
          )}

          {profile.status === 'APPROVED' && (
            <Alert variant="default" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
              <AlertTitle className="font-semibold flex items-center gap-2">
                <span>✅ Vendor Account Active & Approved</span>
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs md:text-sm">
                Your vendor account is fully approved. You can create and publish service offerings for customers to book.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
}
