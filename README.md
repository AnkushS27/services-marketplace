# Services Marketplace

A production-ready, three-sided services marketplace built with NestJS, Next.js (App Router), Prisma, and PostgreSQL.

---

## 🌐 Live URLs

- **Frontend Application:** [https://services-marketplace-sigma.vercel.app](https://services-marketplace-sigma.vercel.app)
- **API Server:** [https://services-marketplace-3k8x.onrender.com](https://services-marketplace-3k8x.onrender.com)

---

## 🔑 Seeded Demo Credentials

All seeded accounts use the default password: **`Password123!`**

| Role | Email | Privileges / Notes |
|---|---|---|
| **Super Admin** | `superadmin@marketplace.test` | Full system access (`bypassChecks: true`), access to roles & system metrics |
| **Catalogue Moderator** | `moderator@marketplace.test` | Custom sub-admin role with category management & service suspension privileges |
| **Approved Vendor** | `vendor.approved@marketplace.test` | Active vendor profile ("Elite Home & Beauty Services") with services, offerings, and bookings |
| **Pending Vendor** | `vendor.pending@marketplace.test` | Applied vendor profile ("Pending Services Co") awaiting admin review |
| **Customer 1** | `customer1@marketplace.test` | Active customer with bookings across various lifecycle states |
| **Customer 2** | `customer2@marketplace.test` | Active customer with bookings & outstanding pay-after balances |

---

## 💳 Mock Payment Trigger Tokens

When testing `PAY_NOW` booking payments (via `POST /payments/:id/confirm`), you can pass a `token` in the request body to simulate payment provider behaviors:

- **`tok_success`** *(default)*: Immediately completes payment (`SUCCESS`) and sets booking status to `PENDING` awaiting vendor confirmation.
- **`tok_fail`**: Fails payment (`FAILED`) and automatically transitions the booking to `CANCELLED` (releasing slot capacity).
- **`tok_delay`**: Leaves payment in `INITIATED` state until resolved manually via webhook (`POST /payments/webhook`).

---

## 🚀 Cold-Clone Setup Guide

The repository is structured as two independent Node projects (`apps/api` and `apps/web`), each with its own `package.json` and configuration.

### Prerequisites
- **Node.js**: v18+ 
- **PostgreSQL**: Neon DB connection string or local PostgreSQL instance.

---

### 1. API Backend Setup (`apps/api`)

```bash
# Navigate to API app directory
cd apps/api

# Install dependencies
pnpm install

# Configure Environment Variables
cp .env.example .env
# Edit .env with your PostgreSQL pooled (DATABASE_URL) & direct (DIRECT_URL) strings

# Run database migrations
npx prisma migrate dev --name init

# Seed database with demo accounts, services & bookings
pnpm run seed

# Run backend development server (starts on http://localhost:4000)
pnpm run start:dev
```

---

### 2. Frontend App Setup (`apps/web`)

```bash
# Navigate to Web app directory (in a separate terminal)
cd apps/web

# Install dependencies
pnpm install

# Configure Environment Variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL="http://localhost:4000"

# Run frontend development server (starts on http://localhost:3000)
pnpm run dev
```

---

## 🧪 Running Tests

To execute backend unit and integration test suites:

```bash
cd apps/api
pnpm run test
```

To run the M6 concurrency load test:

```bash
cd apps/api
npx ts-node scripts/load-test-booking.ts
```

---

## 📄 Documentation

- **Architecture Decisions:** [`DECISIONS.md`]
- **API Reference (OpenAPI Spec):** [`docs/openapi.yaml`]
- **Full Specification:** [`IMPLEMENTATION_PLAN.md`]
