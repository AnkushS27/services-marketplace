'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';

const vendorSignupSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  contactPhone: z.string().min(5, 'Contact phone is required'),
  address: z.string().min(5, 'Business address is required'),
  timezone: z.string().default('Asia/Kolkata'),
});

type VendorSignupFormValues = z.infer<typeof vendorSignupSchema>;

export default function VendorSignupPage() {
  const router = useRouter();
  const { signupVendor } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorSignupFormValues>({
    resolver: zodResolver(vendorSignupSchema),
    defaultValues: {
      timezone: 'Asia/Kolkata',
    },
  });

  const onSubmit = async (data: VendorSignupFormValues) => {
    try {
      setError(null);
      await signupVendor(data);
      router.push('/vendor/dashboard');
    } catch (err: any) {
      setError(err.error?.message || err.message || 'Failed to submit vendor application. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Become a Vendor</h1>
          <p className="text-sm text-muted-foreground">
            Apply for a vendor account to start listing your services on the marketplace
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="name">
                Owner Account Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Smith"
                {...register('name')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.name && (
                <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Account Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="john@vendor.com"
                {...register('email')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.password && (
                <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="phone">
                Personal Phone (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 555-0100"
                {...register('phone')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Business Details</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="businessName">
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                placeholder="Apex Salon & Spa"
                {...register('businessName')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.businessName && (
                <p className="text-xs font-medium text-destructive">{errors.businessName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="contactName">
                  Contact Person Name
                </label>
                <input
                  id="contactName"
                  type="text"
                  placeholder="John Smith"
                  {...register('contactName')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {errors.contactName && (
                  <p className="text-xs font-medium text-destructive">{errors.contactName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="contactPhone">
                  Business Contact Phone
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1 555-0199"
                  {...register('contactPhone')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {errors.contactPhone && (
                  <p className="text-xs font-medium text-destructive">{errors.contactPhone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="address">
                Business Address
              </label>
              <textarea
                id="address"
                rows={2}
                placeholder="123 Main Street, Suite 400, City"
                {...register('address')}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.address && (
                <p className="text-xs font-medium text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="timezone">
                Timezone (IANA)
              </label>
              <input
                id="timezone"
                type="text"
                placeholder="Asia/Kolkata"
                {...register('timezone')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.timezone && (
                <p className="text-xs font-medium text-destructive">{errors.timezone.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting Application...' : 'Apply for Vendor Account'}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground pt-2 border-t">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
