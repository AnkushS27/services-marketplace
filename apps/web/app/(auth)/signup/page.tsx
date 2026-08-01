'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';

const customerSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

type CustomerSignupFormValues = z.infer<typeof customerSignupSchema>;

export default function CustomerSignupPage() {
  const router = useRouter();
  const { signupCustomer } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerSignupFormValues>({
    resolver: zodResolver(customerSignupSchema),
  });

  const onSubmit = async (data: CustomerSignupFormValues) => {
    try {
      setError(null);
      await signupCustomer(data);
      router.push('/account/bookings');
    } catch (err: any) {
      setError(err.error?.message || err.message || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create Customer Account</h1>
          <p className="text-sm text-muted-foreground">
            Sign up to browse services and book appointments
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Jane Doe"
              {...register('name')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.name && (
              <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="jane@example.com"
              {...register('email')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="phone">
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+1 555-0199"
              {...register('phone')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.phone && (
              <p className="text-xs font-medium text-destructive">{errors.phone.message}</p>
            )}
          </div>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Create Customer Account'}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground pt-2 border-t">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
