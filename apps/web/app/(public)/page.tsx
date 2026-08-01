export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-between p-8 font-sans">
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">Services Marketplace</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs">
            Phase 0 Ready
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto text-center py-20 flex flex-col items-center gap-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Multi-Sided Services Marketplace
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl">
          A high-performance marketplace connecting Customers, Vendors, and Admins with real-time slot scheduling, automated state transitions, and custom permission engines.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-8 text-left">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-indigo-400 text-sm font-semibold mb-1">Customer</div>
            <p className="text-xs text-slate-400">Browse services, pick available slots, and manage bookings.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-emerald-400 text-sm font-semibold mb-1">Vendor</div>
            <p className="text-xs text-slate-400">Manage offerings, weekly availability rules, and booking confirmations.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-amber-400 text-sm font-semibold mb-1">Admin</div>
            <p className="text-xs text-slate-400">Granular permission bundles, vendor onboarding approval, and platform metrics.</p>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-center py-6 border-t border-slate-900 text-xs text-slate-500">
        Services Marketplace Skeleton &bull; Infrastructure Foundation &bull; Phase 0
      </footer>
    </div>
  );
}
