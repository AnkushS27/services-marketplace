'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  SearchIcon,
  SparklesIcon,
  ShieldCheckIcon,
  StoreIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  UserIcon,
  CreditCardIcon,
  LockIcon,
  ZapIcon,
  CheckIcon,
  CopyIcon,
  LogInIcon,
  Building2Icon,
  WrenchIcon,
  ScissorsIcon,
  SparkleIcon,
  CarIcon,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/services');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const categories = [
    { name: 'Home Cleaning', slug: 'home-cleaning', icon: SparkleIcon, count: '12+ Services' },
    { name: 'Plumbing & Repair', slug: 'plumbing', icon: WrenchIcon, count: '8+ Services' },
    { name: 'Salon & Beauty', slug: 'beauty-salon', icon: ScissorsIcon, count: '15+ Services' },
    { name: 'Electrical & AC', slug: 'electrical-ac', icon: ZapIcon, count: '10+ Services' },
    { name: 'Auto Detailing', slug: 'auto-detailing', icon: CarIcon, count: '6+ Services' },
    { name: 'Property Management', slug: 'property-services', icon: Building2Icon, count: '9+ Services' },
  ];

  const demoAccounts = [
    { role: 'Super Admin', email: 'superadmin@marketplace.test', badge: 'Full Privileges' },
    { role: 'Catalogue Moderator', email: 'moderator@marketplace.test', badge: 'Sub-Admin Role' },
    { role: 'Approved Vendor', email: 'vendor.approved@marketplace.test', badge: 'Active Catalogue' },
    { role: 'Pending Vendor', email: 'vendor.pending@marketplace.test', badge: 'Review Pipeline' },
    { role: 'Customer 1', email: 'customer1@marketplace.test', badge: 'Active Bookings' },
    { role: 'Customer 2', email: 'customer2@marketplace.test', badge: 'Pay-After Balance' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-card/60 border-b border-border/80 pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary border border-border text-foreground text-xs font-semibold shadow-xs">
            <SparklesIcon className="w-4 h-4 text-primary" />
            <span>Production-Ready Services Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Book Expert Local Services With <br className="hidden sm:inline" />
            <span className="text-primary">
              Real-Time Instant Scheduling
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Connecting Customers, Service Vendors, and Admins on a unified platform featuring minute-precise capacity checks, transactional concurrency protection, and flexible payment settlements.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mt-8 flex flex-col sm:flex-row gap-2.5 p-2 bg-card rounded-2xl border border-border shadow-md">
            <div className="relative flex-1 flex items-center">
              <SearchIcon className="absolute left-4 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search services (e.g. Deep Cleaning, AC Repair, Massage)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-3 h-12 text-base border-none shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground bg-transparent"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-7 bg-primary text-primary-foreground hover:opacity-90 font-semibold rounded-xl gap-2 shadow-xs transition-all">
              <span>Find Services</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-sm font-medium">
            <Link href="/services">
              <Button variant="outline" className="h-10 px-5 border-border bg-card hover:bg-secondary text-foreground gap-2 shadow-xs">
                <StoreIcon className="w-4 h-4 text-primary" />
                <span>Browse All Services</span>
              </Button>
            </Link>
            <Link href="/vendor/signup">
              <Button variant="secondary" className="h-10 px-5 border border-primary/20 text-primary gap-2 shadow-xs">
                <UserIcon className="w-4 h-4 text-primary" />
                <span>Become a Vendor</span>
              </Button>
            </Link>
            <a href="#seeded-accounts">
              <Button variant="ghost" className="h-10 px-4 text-muted-foreground hover:text-foreground gap-1.5">
                <LockIcon className="w-4 h-4 text-muted-foreground" />
                <span>Demo Credentials ↓</span>
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Explore Service Categories</h2>
            <p className="text-muted-foreground text-sm mt-1">Browse top categories offered by verified professionals</p>
          </div>
          <Link href="/services" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            <span>View all categories</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/services?category=${cat.slug}`}
                className="group p-5 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-md transition-all flex flex-col items-center text-center gap-3"
              >
                <div className="p-3 rounded-xl bg-secondary text-primary group-hover:scale-110 transition-transform">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{cat.count}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Multi-Sided Marketplace Value Pillars */}
      <section className="py-14 px-4 sm:px-6 bg-secondary/50 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="mb-2 border-primary/30 bg-secondary text-primary font-semibold">Architecture & Roles</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Built For Every Marketplace Actor</h2>
            <p className="text-muted-foreground text-base mt-2">
              A comprehensive three-sided workflow tailored for seamless customer scheduling, vendor shift control, and admin governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Customer Pillar */}
            <Card className="bg-card border-border shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border text-primary flex items-center justify-center font-bold">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Customer Workspace</h3>
                  <p className="text-sm text-muted-foreground mt-1">Effortless discovery and instant booking with transparent capacity</p>
                </div>
                <ul className="space-y-2 text-sm text-foreground/90 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Real-time availability slot picker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>PAY_NOW (Instant) & PAY_AFTER (On-Site)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Free cancellation window protection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Live status timeline tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Vendor Pillar */}
            <Card className="bg-card border-border shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border text-primary flex items-center justify-center font-bold">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Vendor Management</h3>
                  <p className="text-sm text-muted-foreground mt-1">Full control over service offerings, weekly shifts, and staff</p>
                </div>
                <ul className="space-y-2 text-sm text-foreground/90 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Catalog offerings (pricing & duration)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Weekly shift rules & date exception overrides</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Staff assignment & shift capacity limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Booking confirmation & status updates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Admin Pillar */}
            <Card className="bg-card border-border shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border text-primary flex items-center justify-center font-bold">
                  <ShieldCheckIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Admin Governance</h3>
                  <p className="text-sm text-muted-foreground mt-1">Dynamic DB permission engine and platform administration</p>
                </div>
                <ul className="space-y-2 text-sm text-foreground/90 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Real-time RBAC/ABAC guard engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Vendor document verification & approval</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>Sub-admin role delegation (Catalogue Mod)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>System dashboard & force-cancellation tools</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Seeded Demo Accounts Quick-Start Section */}
      <section id="seeded-accounts" className="py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-2">
                <LockIcon className="w-3.5 h-3.5 text-primary" />
                <span>Instant Evaluation Setup</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Seeded Demo Account Roster</h2>
              <p className="text-muted-foreground text-sm mt-1">
                All seeded accounts use the unified password: <code className="bg-secondary px-2 py-0.5 rounded font-mono font-bold text-primary">Password123!</code>
              </p>
            </div>
            <Link href="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:opacity-90 gap-2 font-semibold shadow-xs">
                <LogInIcon className="w-4 h-4" />
                <span>Go to Login Page</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoAccounts.map((acc) => (
              <div
                key={acc.email}
                className="p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-foreground">{acc.role}</span>
                    <Badge variant="secondary" className="text-[10px] bg-secondary text-secondary-foreground font-semibold border border-border">
                      {acc.badge}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate">{acc.email}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/80">
                  <span className="text-[11px] text-muted-foreground">Pass: Password123!</span>
                  <button
                    onClick={() => copyToClipboard(acc.email)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {copiedEmail === acc.email ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-primary font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Integrity Highlights */}
      <section className="py-12 px-4 sm:px-6 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="p-4 space-y-2">
            <ZapIcon className="w-8 h-8 text-primary" />
            <h4 className="font-bold text-lg text-foreground">Zero Overbooking</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Postgres Transaction Advisory Locks (<code className="text-primary font-mono">pg_advisory_xact_lock</code>) strictly serialize concurrent slot requests.
            </p>
          </div>
          <div className="p-4 space-y-2">
            <LockIcon className="w-8 h-8 text-primary" />
            <h4 className="font-bold text-lg text-foreground">Real-Time Permission Engine</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Permissions evaluated directly against PostgreSQL on every HTTP request. Instant revocation effect.
            </p>
          </div>
          <div className="p-4 space-y-2">
            <CreditCardIcon className="w-8 h-8 text-primary" />
            <h4 className="font-bold text-lg text-foreground">Idempotency & Webhooks</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforced <code className="text-primary font-mono">Idempotency-Key</code> headers prevent double charges and duplicate bookings.
            </p>
          </div>
          <div className="p-4 space-y-2">
            <ShieldCheckIcon className="w-8 h-8 text-primary" />
            <h4 className="font-bold text-lg text-foreground">Ownership Isolation</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Strict 404 resource hiding prevents user enumeration and cross-tenant unauthorized inspection.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4 sm:px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs">S</div>
            <span className="font-bold text-foreground">Services Marketplace</span>
            <span>&bull; Built with NestJS, Next.js 15, Prisma & PostgreSQL</span>
          </div>
          <p>© 2026 Services Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
