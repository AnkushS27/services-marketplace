'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      await login(data.email, data.password);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.error?.message || err.message || 'Failed to log in. Please check your credentials.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="user@example.com"
              {...register('email')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Password
              </label>
            </div>
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
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-2 pt-2 border-t">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up as Customer
            </Link>
          </p>
          <p>
            Want to list your services?{' '}
            <Link href="/vendor/signup" className="font-semibold text-primary hover:underline">
              Become a Vendor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
