'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  SparklesIcon,
  StoreIcon,
  ShieldCheckIcon,
  UserIcon,
  LogOutIcon,
  SearchIcon,
  LogInIcon,
  UserPlusIcon,
} from 'lucide-react';

export function Navbar() {
  const { user, isLoading, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role.type) {
      case 'ADMIN':
        return '/admin/vendors';
      case 'VENDOR':
        return '/vendor/services';
      case 'CUSTOMER':
      default:
        return '/account/bookings';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2.5 font-extrabold text-xl tracking-tight text-primary hover:opacity-90 transition-opacity">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-foreground">Services<span className="text-primary">Hub</span></span>
          </Link>

          <nav className="hidden md:flex items-center space-x-2 text-sm font-medium">
            <Link
              href="/services"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
            >
              <SearchIcon className="w-4 h-4" />
              <span>Browse Services</span>
            </Link>

            {user?.role.type === 'ADMIN' && (
              <>
                <Link
                  href="/admin/categories"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Categories</span>
                </Link>
                <Link
                  href="/admin/roles"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Roles & Permissions</span>
                </Link>
                <Link
                  href="/admin/vendors"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>Vendor Approvals</span>
                </Link>
              </>
            )}

            {user?.role.type === 'VENDOR' && (
              <>
                <Link
                  href="/vendor/services"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>Service Catalogue</span>
                </Link>
                <Link
                  href="/vendor/onboarding"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Vendor Profile</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href={getDashboardLink()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold leading-none text-foreground">{user.name}</p>
                  <p className="text-[10px] font-semibold text-primary capitalize leading-tight">{user.role.name}</p>
                </div>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="gap-1.5 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <LogOutIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <LogInIcon className="w-3.5 h-3.5" />
                  <span>Log in</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  <span>Sign up</span>
                </Button>
              </Link>
              <Link href="/vendor/signup" className="hidden sm:inline-block">
                <Button variant="secondary" size="sm" className="gap-1.5 border border-primary/20 text-primary">
                  <StoreIcon className="w-3.5 h-3.5" />
                  <span>Become a Vendor</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
