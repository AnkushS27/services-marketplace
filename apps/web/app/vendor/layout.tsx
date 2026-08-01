'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingIcon,
  UsersIcon,
} from 'lucide-react';

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
  const pathname = usePathname();

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
      <div className="container mx-auto p-6 space-y-4 max-w-7xl">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-16 w-full animate-pulse rounded-xl bg-card border border-border" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Global Vendor Header */}
      {profile && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-xs">
                <BuildingIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {profile.businessName || 'Vendor Portal'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Manage your business profile, service catalogue, and customer bookings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border">
                <Link
                  href="/vendor/onboarding"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname === '/vendor/onboarding'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Profile & Docs</span>
                </Link>
                <Link
                  href="/vendor/services"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname === '/vendor/services'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BriefcaseIcon className="w-3.5 h-3.5" />
                  <span>Services</span>
                </Link>
                <Link
                  href="/vendor/staff"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname === '/vendor/staff'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UsersIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Staff Roster</span>
                </Link>
                <Link
                  href="/vendor/bookings"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname === '/vendor/bookings'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ClockIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Bookings</span>
                </Link>
              </nav>

              <Badge
                variant={
                  profile.status === 'APPROVED'
                    ? 'default'
                    : profile.status === 'REJECTED'
                    ? 'destructive'
                    : 'outline'
                }
                className="px-3 py-1 text-xs font-bold gap-1.5"
              >
                {profile.status === 'APPROVED' && <CheckCircle2Icon className="w-3.5 h-3.5" />}
                {profile.status === 'PENDING' && <ClockIcon className="w-3.5 h-3.5" />}
                {profile.status === 'REJECTED' && <XCircleIcon className="w-3.5 h-3.5" />}
                <span>{profile.status}</span>
              </Badge>
            </div>
          </div>

          {profile.status === 'PENDING' && (
            <Alert variant="default" className="border-amber-600/40 bg-amber-500/15 text-amber-900">
              <ClockIcon className="w-5 h-5 text-amber-700" />
              <AlertTitle className="font-bold text-amber-900">Account Under Review</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-amber-800">
                Your vendor application is currently PENDING review by an admin. You can complete your profile and prepare services below. Publishing services will be enabled once your vendor account is approved.
              </AlertDescription>
            </Alert>
          )}

          {profile.status === 'REJECTED' && (
            <Alert variant="destructive">
              <XCircleIcon className="w-5 h-5" />
              <AlertTitle className="font-bold">Application Rejected</AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                Reason: <strong>{profile.rejectionReason || 'No reason provided'}</strong>. Please update your profile details and documents, then contact administration.
              </AlertDescription>
            </Alert>
          )}

          {profile.status === 'APPROVED' && (
            <Alert variant="default" className="border-primary/40 bg-primary/10 text-primary-foreground">
              <CheckCircle2Icon className="w-5 h-5 text-primary" />
              <AlertTitle className="font-bold text-foreground">Vendor Account Active & Approved</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-muted-foreground">
                Your vendor account is fully approved. You can create, edit, and publish service offerings for customers to browse and book.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
}
