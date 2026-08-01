'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user, isLoading, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role.type) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'VENDOR':
        return '/vendor/dashboard';
      case 'CUSTOMER':
      default:
        return '/account/bookings';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl tracking-tight text-primary">
            <span>Marketplace</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <Link
              href="/services"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse Services
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link
                href={getDashboardLink()}
                className="text-sm font-medium hover:underline flex items-center gap-2"
              >
                <span>{user.name}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  {user.role.name}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Sign up
              </Link>
              <Link
                href="/vendor/signup"
                className="hidden sm:inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/10"
              >
                Vendor Signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
