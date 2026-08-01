# Services Marketplace — Implementation Plan
### Single source of truth for building this system with Claude Code

---

## 0. Purpose & How To Use This Document

This document is the **complete, authoritative specification** for building the take-home assignment described in `Full_Stack_Developer_Task.md`. It exists so that an engineer (human or Claude Code) can implement the entire system without needing to re-read the original brief or make unrecorded judgment calls.

Rules for whoever implements this plan:

1. **Work phase by phase, in order.** Each phase in Section 12 is a self-contained, independently testable vertical slice (backend + frontend for that feature area). Do not start Phase *N+1* until Phase *N*'s "Definition of Done" is fully met.
2. **This document overrides improvisation.** Every genuinely ambiguous point in the original brief has already been resolved in Section 7 ("Key Design Decisions"). Follow those decisions exactly rather than re-deciding them.
3. **If something truly unforeseen comes up** that isn't covered here, resolve it by picking the simplest option consistent with Section 3 (Global Engineering Principles), keep moving, and write the choice down (this becomes an entry in `DECISIONS.md`). Do not stop and wait for clarification — there is no one to ask.
4. **Commit incrementally.** Each phase should produce multiple small, descriptive commits, not one giant commit at the end.
5. **Code should be extremely modular, scalable, and maintainable.** This is a hard requirement, not a suggestion — it governs every architectural choice in this document, from the monorepo layout to the permission engine to the slot-derivation algorithm.

---

## 1. Product Summary (condensed)

A three-sided services marketplace. **Vendors** list services (each with one or more "offerings" — a name, duration, price). Vendors declare weekly opening hours; the system derives bookable slots from them. **Customers** browse published services, book a slot, pay (mocked), and manage their bookings. **Vendors** confirm/reject/complete/no-show bookings they own. **Admins** approve vendors, manage the catalogue, hold the permission system, and can force-cancel any booking. Money is mocked (no real payment gateway) but the *state machine* around payment must be real: idempotent, webhook-driven, failure-safe.

| Actor | Can do | Must never be able to |
|---|---|---|
| Customer | Sign up, browse published services, view slots, book, pay, reschedule, cancel, view own bookings | See another customer's booking; access any vendor/admin screen |
| Vendor | Apply for an account, manage own services/offerings, set availability, confirm/reject/complete bookings, mark cash collected | Touch another vendor's data; publish before approval |
| Admin | Approve/reject vendors, manage categories, suspend services, view all bookings, force-cancel with reason, create sub-admins with custom permission bundles | Exceed the permissions actually granted to their role (except `SUPER_ADMIN`, which bypasses all checks) |

---

## 2. Global Engineering Principles

**Code should be extremely modular, scalable, and maintainable.** Concretely, this means:

- **One responsibility per module.** In NestJS, every domain (auth, roles, vendors, categories, services, availability, bookings, payments, admin) is its own module with its own controller/service/DTOs. No "god service." In Next.js, every feature area is its own route group with its own components, hooks, and API-client functions — no shared "utils.ts" dumping ground.
- **Server is the only source of truth for authorization.** The frontend hides UI a caller can't use; it never *decides* what's allowed. Every protected NestJS route is guarded, every guard hits the database for the caller's current permissions (never trusts a cached or token-embedded permission list — see Section 7.2).
- **Business rules live in services, not controllers.** Controllers parse/validate input and delegate. Services contain the actual logic (state machine, slot derivation, capacity reservation) and are unit-testable in isolation from HTTP.
- **Money is always an integer** (minor units — paise for INR). Never a float, anywhere, in either app.
- **All timestamps are stored and transmitted in UTC.** Any "local time" concept (vendor opening hours) is explicitly converted to/from the vendor's IANA timezone at the boundary — never implicitly.
- **Every request body is validated at the boundary** with `class-validator` DTOs (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`). Nothing from the client — a price, a role, an id — is ever trusted without re-derivation or re-validation server-side.
- **One error envelope, one success envelope**, used everywhere (Section 10.2). No endpoint invents its own response shape.
- **No secrets committed.** Every app ships a `.env.example` with every variable it needs and a one-line comment on what it's for.
- **Tests exist where they carry weight**: the booking state machine, the capacity race, and the permission guard are non-negotiable test targets (Section 13). Trivial getter/setter tests are not a good use of time.

---

## 3. Tech Stack (Final — do not substitute)

**Frontend:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, shadcn/ui, TanStack Query (server-state/caching), React Hook Form + Zod (form validation), Zustand or React Context for the small amount of client auth state (current user + permissions) — Context is sufficient here, prefer it over Zustand to avoid an extra dependency unless the auth state logic grows complex.

**Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL via **Neon** (serverless Postgres), `class-validator` / `class-transformer` for DTO validation, `@nestjs/jwt` + `passport-jwt` for auth, `bcrypt` for password hashing, `helmet` + `@nestjs/throttler` for baseline hardening.

**Repository layout:** one Git repository containing two **fully independent** Node projects, `apps/web` and `apps/api` — each with its own `package.json`, its own lockfile, and its own `node_modules`. No workspace tool, no build orchestrator, no shared package, and no cross-app import between them. This is deliberate: `apps/web` deploys to Vercel and `apps/api` deploys to Render as two unrelated projects, each pointed at its own subdirectory, each installed/built/run entirely on its own. You run each one manually (`cd apps/web && npm run dev` / `cd apps/api && npm run dev`) — there's nothing at the repo root that needs to run first.

**Deployment:** Frontend → Vercel. Backend → Render (Railway is an acceptable substitute if Render's free tier is unavailable). Database → Neon.

**Explicitly not used:** Turborepo, pnpm/npm workspaces, or any other monorepo build-orchestration tool (not needed — each app builds itself, independently, with its platform's default build command). Also not used: Redis or any other cache/queue (unnecessary at this scale — permission checks are a single indexed query), any real payment gateway, any object storage service (Section 7.6 explains why).

---

## 4. Repository & Folder Structure

```
services-marketplace/
├── apps/
│   ├── web/                         # Next.js app — standalone project, deployed to Vercel
│   │   ├── app/
│   │   │   ├── (public)/            # unauthenticated: browse, service detail, slot picker
│   │   │   ├── (auth)/              # login, customer signup, vendor signup
│   │   │   ├── (customer)/account/  # my bookings, booking detail
│   │   │   ├── (vendor)/vendor/     # dashboard, services, availability, bookings
│   │   │   └── (admin)/admin/       # dashboard, vendors, categories, roles, bookings
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn-generated primitives — do not hand-edit
│   │   │   └── shared/              # composed, reusable components
│   │   ├── lib/
│   │   │   ├── api-client.ts        # typed fetch wrapper, auto-refresh on 401
│   │   │   ├── auth-context.tsx     # current user + effective permissions
│   │   │   ├── constants.ts         # mirrors the backend's enums/permission slugs — see Section 7.11
│   │   │   └── query-client.ts
│   │   ├── hooks/
│   │   ├── package.json
│   │   └── .env.example
│   └── api/                         # NestJS app — standalone project, deployed to Render
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── roles/           # permissions + roles
│       │   │   ├── vendors/
│       │   │   ├── categories/
│       │   │   ├── services/        # services + offerings
│       │   │   ├── availability/
│       │   │   ├── bookings/
│       │   │   ├── payments/
│       │   │   └── admin/           # dashboard, force-cancel
│       │   ├── common/
│       │   │   ├── guards/          # JwtAuthGuard, PermissionsGuard
│       │   │   ├── decorators/      # @RequirePermissions(), @CurrentUser()
│       │   │   ├── constants/       # permission slugs, enums — source of truth for lib/constants.ts above
│       │   │   ├── filters/         # global exception filter → error envelope
│       │   │   ├── interceptors/    # success envelope, idempotency
│       │   │   └── pipes/
│       │   └── prisma/
│       │       ├── prisma.service.ts
│       │       └── prisma.module.ts
│       ├── prisma/
│       │   ├── schema.prisma        # THE canonical schema — see Section 8
│       │   └── seed.ts              # modular seed, extended phase by phase
│       ├── scripts/
│       │   └── load-test-booking.ts # M6 concurrency proof — Phase 7
│       ├── package.json
│       └── .env.example
├── docs/
│   └── openapi.yaml                 # or a Postman collection export
├── README.md
└── DECISIONS.md
```

Everything the API needs — schema, seed script, load-test script, source — lives inside `apps/api`. Everything the frontend needs lives inside `apps/web`. Neither folder reaches outside itself for anything at build or run time; the only things at the repo root are documentation files that neither platform's build process touches.

---

## 5. Environment Variables

**`apps/api/.env.example`**
```
# Database (Neon) — pooled connection for the running app, direct for migrations
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

# Auth
JWT_ACCESS_SECRET="replace-me"
JWT_ACCESS_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN_DAYS="30"

# CORS / cookies
FRONTEND_URL="https://your-app.vercel.app"
COOKIE_DOMAIN=""   # leave empty unless frontend/api share a parent domain

# Mock payments
WEBHOOK_SECRET="replace-me"

# Misc
PORT=4000
NODE_ENV="development"
```

**`apps/web/.env.example`**
```
NEXT_PUBLIC_API_URL="https://your-api.onrender.com"
```

Neon-specific note: Prisma needs two connection strings against Neon — a pooled one (`DATABASE_URL`, via PgBouncer, used at runtime) and a direct one (`DIRECT_URL`, used only for running migrations). Both go in `schema.prisma`'s `datasource` block (Section 8).


---

## 6. Non-Goals & Explicitly Out-of-Scope Items

**Infrastructure non-goals** (per the brief's own allowances):

- **No real payment gateway.** A hand-written mock provider behind an interface (Phase 8). Nothing in the codebase talks to Razorpay, Stripe, or any sandbox account.
- **No object storage.** Vendor documents and service images are recorded as filename metadata (Section 7.6). A real upload endpoint exists for local development convenience, but production correctness never depends on a file actually persisting on disk.
- **No Redis/queue/cache layer.** Not needed at this scale; would add infrastructure surface without improving the score.
- **No monorepo build tool** (Turborepo, pnpm/npm workspaces). `apps/web` and `apps/api` are built and run independently (Section 3, Section 4).

**The one stretch item that is genuinely out of scope: forgot-password.** The brief's M1 stretch goal (a single-use, expiring reset token, printed to the console) is not implemented, not reflected in the schema, and no phase leaves a hook for it. This is the only intentional omission from the brief's stretch list — everything else tagged `STRETCH` is still built, just later and lower-priority than every `MUST`/`SHOULD` phase:

- Admin "suspend a live service with a reason" workflow (M4 stretch) — built as part of Phase 5, since it falls out of work already being done there.
- Admin audit log (M8 stretch) — built as part of Phase 9.
- Staff assignment / per-staff capacity (M6 stretch) — built last, as Phase 12, only if time remains after Phase 11 is solid; see Section 7.4 for how the simpler capacity model the rest of the system uses compares to it.

Priority order still matters: do not let any of the three items above eat into time a `MUST`/`SHOULD` phase needs. If time is genuinely short, Phase 12 (staff assignment) is the one to drop first — it's the only one of the three that isn't folded into an existing phase's own work.

---

## 7. Key Design Decisions (Resolved Ambiguities)

The brief deliberately leaves some mechanics open ("either behaviour is acceptable; document the rule"). These are resolved here, once, so every later phase is consistent. Copy this section (or a summary of it) into `DECISIONS.md` at submission time.

### 7.1 Role model: data-driven permissions, structural role "type"
`Role` is a database row, not a code enum — any admin can create a new role, tick permission slugs, and assign it. However, every role also carries a structural `type` (`CUSTOMER` / `VENDOR` / `ADMIN`) used **only** for account-kind logic that isn't a permission question — e.g. "does this user go through vendor onboarding", "which dashboard shell do they land on". `type` never gates a specific action; permission slugs do. `SUPER_ADMIN` is not a special enum value — it's the seeded `Role` row with `bypassChecks = true`. Only an existing `bypassChecks` role can create another `bypassChecks` role (enforced in the roles service), so this privilege can't be self-granted by a regular admin.

### 7.2 Permissions are never embedded in the access token
The JWT access token carries only `{ sub: userId, roleId }`. `PermissionsGuard` re-reads the role's current permission slugs from the database **on every request**. This is what makes "revoking a permission changes behaviour on the very next request, no redeploy" true — if permissions were cached in the token, a change would only take effect after token expiry.

### 7.3 Ownership failures return 404, permission failures return 403
- Caller lacks the required permission slug entirely (e.g. a `CUSTOMER` token hitting an admin-only route) → **403**.
- Caller has the right *kind* of permission (e.g. `booking.read.own`) but the resource isn't theirs → **404** (don't confirm the resource exists to someone who has no claim on it).

This satisfies the brief's "403 or 404, never the record" requirement with one clean, consistent rule rather than picking case by case.

### 7.4 Slot identity & capacity model
A vendor sets weekly rules **per service** (not per offering) with a capacity — "how many bookings may share one slot." Offerings on the same service can have different durations. Rather than modelling true interval/resource overlap (which would require staff/resource assignment — the M6 stretch goal), **slot identity is `(serviceId, offeringId, slotStart)`**: each offering gets its own independent slot grid derived from the same weekly rules/exceptions, and capacity is enforced per exact `(serviceId, offeringId, slotStart)` tuple. This is simple, matches every "DONE WHEN" example in the brief (a single offering's slot going from `remaining: 1` to fully booked), and is honestly documented as a simplification: the system does not detect that two *different* offerings booked at overlapping times might both need the same vendor at once until Phase 12 (staff assignment) closes that gap.

### 7.5 Concurrency control for bookings (the capacity race)
No slot table is pre-populated ("slots must be derived, not stored by hand"), so there's no row to `SELECT ... FOR UPDATE` before the first booking against a given slot exists. The solution: on every booking create/reschedule, inside a single Prisma `$transaction`:
1. Acquire a **Postgres advisory transaction lock** keyed by a hash of `serviceId + offeringId + slotStart` (`pg_advisory_xact_lock(hashtext($key))`). This serializes all concurrent attempts at the *same* slot without locking unrelated slots.
2. Re-derive the slot's live capacity from `AvailabilityRule`/`AvailabilityException` (never a cached value).
3. Count existing bookings in states `PENDING`, `CONFIRMED`, `COMPLETED` for that exact tuple.
4. If `count < capacity`: insert the booking (and history row) and commit. Else: roll back and return `409`.

Reschedule reuses the same locking routine for the *new* slot, and — because occupancy is computed by counting rows rather than decrementing a stored counter — releasing the old slot needs no extra step: once the booking's own `slotStart` is updated, it no longer counts toward the old slot's occupancy. This function (`reserveSlot(tx, params)`) is written once and reused by both booking creation and reschedule — see Phase 7.

### 7.6 File storage: filenames only, no persisted binaries
The brief explicitly permits this ("a stored filename is fine; object storage is not required"). It's also the *correct* call given free-tier deployment: Render's free web services have an ephemeral filesystem, so anything actually written to local disk would vanish on the next restart/redeploy — a real functional bug for a reviewer opening the app days later. `VendorDocument` and `Service.images` therefore store filename/original-name metadata only. A local-disk multer upload endpoint exists for developer convenience in local dev, but no feature's correctness depends on the bytes surviving in production.

### 7.7 Auth token transport
Access token: returned in the JSON response body, held only in memory on the client (React context), never in `localStorage` — reduces XSS blast radius. Refresh token: an **opaque random string** (not a JWT — no need to sign something the server already looks up by hash), stored hashed (`RefreshToken.tokenHash`) in the database, and set as an `httpOnly`, `Secure`, `SameSite=None` cookie scoped to the API's domain. This requires the NestJS CORS config to set `credentials: true` with an explicit `origin` (never `*`), and every frontend request that needs auth to be made with `credentials: 'include'`. Refresh **rotates**: each successful `/auth/refresh` revokes the old `RefreshToken` row and issues a new one, which also makes reuse of a stolen, already-used refresh token immediately detectable (its row will already be revoked).

### 7.8 Cancellation policy
Each `Service.freeCancellationHours` (default 24) defines the free-cancellation window. Chosen rule (the brief allows "refuse or fee" — refusal is chosen for simplicity and clean testability):
- **Customer-initiated cancel inside the window → refused (`422`)**, with a message pointing them to contact the vendor. Outside the window → allowed.
- **Vendor-initiated cancel is never window-gated.** If the vendor cancels, it isn't the customer's fault, so the customer is never penalized for it, and a paid booking is always refunded.
- **Admin force-cancel is never window-gated** and always refunds a paid booking — it exists precisely for exceptional overrides.

### 7.9 Payment flow shape
- `PAY_NOW`: booking is created immediately in `PENDING` (this is what holds the slot's capacity) together with a `Payment` row in `INITIATED`. The customer must then call the confirm-payment endpoint. On mock `SUCCESS`, the `Payment` becomes `SUCCESS`; the *booking* stays `PENDING` until the vendor separately confirms it (payment success is a precondition the vendor-confirm action checks, not something that auto-confirms the booking — vendor confirmation is always an explicit act per the M6 state table). On mock `FAILED`, the booking is auto-transitioned to `CANCELLED` (actor: system, reason: "payment failed") so the slot is released — this is what satisfies "a failed PAY_NOW payment must not leave a permanently held slot."
- `PAY_AFTER`: booking is created `PENDING` with no `Payment` row yet; `outstandingBalance` is computed as the offering's price until the vendor calls the "mark collected" action, which creates a `Payment` row directly in `SUCCESS` with `providerRef` prefixed `cash_`.
- The mock provider's outcome is deterministic and triggerable via a `token` field on the confirm call: `tok_success` (default) → `SUCCESS`, `tok_fail` → `FAILED`, `tok_delay` → stays `INITIATED` until `/payments/webhook` is called manually to resolve it.
- `POST /payments/webhook` is authenticated by a **shared secret header** (`X-Webhook-Secret`), not a user JWT — this mirrors how real payment providers call webhooks (they don't have a user session) and keeps it callable by a reviewer without needing an admin login.

### 7.10 Pagination & filtering contract
Every list endpoint accepts `page` (1-based) and `pageSize` (default 20, max 100) plus endpoint-specific filters, and returns `{ data: T[], meta: { total, page, pageSize, totalPages } }`. Filtering and pagination happen in the Prisma query (`where`, `skip`, `take`) — never by fetching everything and slicing in code.

### 7.11 No package is shared between `apps/web` and `apps/api`
The two apps are deployed separately (Vercel and Render), so they're built to be genuinely independent projects — no workspace tool, no shared `packages/` folder, no cross-app import (Section 3, Section 4). The small amount of overlap that would normally live in a shared package — the `BookingStatus`/`PaymentStatus`/etc. enum values and the permission-slug strings from Section 9 — is instead defined once in `apps/api/src/common/constants` (the real source of truth, since the backend is what enforces them) and mirrored by hand in `apps/web/lib/constants.ts`. This is a small, deliberate duplication (a handful of string literals) traded for zero build coupling between the two deployments.


---

## 8. Domain Model — Canonical Prisma Schema

This is written in full during **Phase 1** and, aside from small additive changes noted in later phases, is not redesigned afterward — every later phase builds logic on top of it.

```prisma
// apps/api/prisma/schema.prisma

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled, used at runtime
  directUrl = env("DIRECT_URL")     // direct, used for migrations
}

generator client {
  provider = "prisma-client-js"
}

enum RoleType {
  CUSTOMER
  VENDOR
  ADMIN
}

enum VendorStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ServiceStatus {
  DRAFT
  PUBLISHED
  SUSPENDED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  REJECTED
  CANCELLED
  NO_SHOW
}

enum PaymentMode {
  PAY_NOW
  PAY_AFTER
}

enum PaymentStatus {
  INITIATED
  SUCCESS
  FAILED
  REFUNDED
}

enum PaymentEventType {
  INITIATED
  SUCCESS
  FAILED
  REFUNDED
  WEBHOOK_RECEIVED
}

model Permission {
  id              String            @id @default(uuid())
  slug            String            @unique
  description     String
  rolePermissions RolePermission[]
  createdAt       DateTime          @default(now())
}

model Role {
  id           String           @id @default(uuid())
  name         String           @unique
  type         RoleType
  bypassChecks Boolean          @default(false)
  isSystem     Boolean          @default(false) // seeded roles; blocks deletion
  permissions  RolePermission[]
  users        User[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model User {
  id                    String           @id @default(uuid())
  email                 String           @unique
  passwordHash          String
  name                  String
  phone                 String?
  roleId                String
  role                  Role             @relation(fields: [roleId], references: [id])
  isActive              Boolean          @default(true)
  vendorProfile         VendorProfile?
  refreshTokens         RefreshToken[]
  bookings              Booking[]        @relation("CustomerBookings")
  bookingHistoryActions BookingHistory[] @relation("HistoryActor")
  createdAt             DateTime         @default(now())
  updatedAt              DateTime        @updatedAt
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
}

model VendorProfile {
  id              String           @id @default(uuid())
  userId          String           @unique
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessName    String
  contactName     String
  contactPhone    String
  address         String
  timezone        String           @default("Asia/Kolkata") // IANA tz; drives all slot math
  status          VendorStatus     @default(PENDING)
  rejectionReason String?
  approvedAt      DateTime?
  documents       VendorDocument[]
  services        Service[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model VendorDocument {
  id              String        @id @default(uuid())
  vendorProfileId String
  vendorProfile   VendorProfile @relation(fields: [vendorProfileId], references: [id], onDelete: Cascade)
  filename        String
  originalName    String
  createdAt       DateTime      @default(now())
}

model Category {
  id        String     @id @default(uuid())
  name      String
  slug      String     @unique
  parentId  String?
  parent    Category?  @relation("CategoryToSub", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToSub")
  isActive  Boolean    @default(true)
  services  Service[]
  createdAt DateTime   @default(now())
}

model Service {
  id                     String                   @id @default(uuid())
  vendorProfileId        String
  vendorProfile          VendorProfile            @relation(fields: [vendorProfileId], references: [id])
  categoryId             String
  category               Category                 @relation(fields: [categoryId], references: [id])
  title                  String
  description            String
  images                 String[]
  status                 ServiceStatus            @default(DRAFT)
  suspendedReason        String?
  freeCancellationHours  Int                      @default(24)
  offerings              Offering[]
  availabilityRules      AvailabilityRule[]
  availabilityExceptions AvailabilityException[]
  bookings               Booking[]
  createdAt              DateTime                 @default(now())
  updatedAt               DateTime                @updatedAt

  @@index([vendorProfileId])
  @@index([categoryId])
  @@index([status])
}

model Offering {
  id              String    @id @default(uuid())
  serviceId       String
  service         Service   @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  name            String
  durationMinutes Int
  priceMinorUnits Int
  isActive        Boolean   @default(true)
  bookings        Booking[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model AvailabilityRule {
  id          String   @id @default(uuid())
  serviceId   String
  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  weekday     Int      // 0 = Sunday .. 6 = Saturday
  startMinute Int      // minutes from midnight, vendor-local time
  endMinute   Int
  capacity    Int
  createdAt   DateTime @default(now())

  @@index([serviceId, weekday])
}

model AvailabilityException {
  id          String   @id @default(uuid())
  serviceId   String
  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  date        DateTime // date-only; midnight represents the vendor-local calendar date
  isClosed    Boolean  @default(true)
  startMinute Int?     // required when isClosed = false
  endMinute   Int?     // required when isClosed = false
  capacity    Int?     // required when isClosed = false
  createdAt   DateTime @default(now())

  @@index([serviceId, date])
}

model Booking {
  id                 String           @id @default(uuid())
  customerId         String
  customer           User             @relation("CustomerBookings", fields: [customerId], references: [id])
  serviceId          String
  service            Service          @relation(fields: [serviceId], references: [id])
  offeringId         String
  offering           Offering         @relation(fields: [offeringId], references: [id])
  slotStart          DateTime         // UTC
  slotEnd            DateTime         // UTC
  status             BookingStatus    @default(PENDING)
  priceMinorUnits    Int              // snapshot at booking time
  currency           String           @default("INR")
  paymentMode        PaymentMode
  cancellationReason String?
  history            BookingHistory[]
  payment            Payment?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@index([serviceId, offeringId, slotStart])
  @@index([customerId])
  @@index([status])
}

model BookingHistory {
  id          String         @id @default(uuid())
  bookingId   String
  booking     Booking        @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  fromStatus  BookingStatus?
  toStatus    BookingStatus
  actorUserId String?
  actor       User?          @relation("HistoryActor", fields: [actorUserId], references: [id])
  reason      String?
  metadata    Json?          // e.g. { oldSlotStart, newSlotStart } for reschedules
  createdAt   DateTime       @default(now())
}

model Payment {
  id               String         @id @default(uuid())
  bookingId        String         @unique
  booking          Booking        @relation(fields: [bookingId], references: [id])
  amountMinorUnits Int
  currency         String         @default("INR")
  providerRef      String         @unique
  status           PaymentStatus  @default(INITIATED)
  events           PaymentEvent[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model PaymentEvent {
  id        String           @id @default(uuid())
  paymentId String
  payment   Payment          @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  type      PaymentEventType
  metadata  Json?
  createdAt DateTime         @default(now())
}

model IdempotencyKey {
  key            String   @id
  endpoint       String
  responseStatus Int
  responseBody   Json
  createdAt      DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String?
  action      String
  targetType  String?
  targetId    String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

### Entity-relation summary (for orientation)

```mermaid
erDiagram
  Role ||--o{ RolePermission : has
  Permission ||--o{ RolePermission : grants
  Role ||--o{ User : "assigned to"
  User ||--o| VendorProfile : "is a"
  VendorProfile ||--o{ VendorDocument : has
  VendorProfile ||--o{ Service : owns
  Category ||--o{ Service : classifies
  Category ||--o{ Category : "parent of"
  Service ||--o{ Offering : has
  Service ||--o{ AvailabilityRule : has
  Service ||--o{ AvailabilityException : has
  Service ||--o{ Booking : "booked via"
  Offering ||--o{ Booking : "booked as"
  User ||--o{ Booking : "makes (as customer)"
  Booking ||--o{ BookingHistory : logs
  Booking ||--o| Payment : has
  Payment ||--o{ PaymentEvent : logs
```


---

## 9. Permission Catalogue (seed this exact list in Phase 1)

Slugs follow `resource.action`. Offering and availability-rule mutations are folded into `service.update` / `availability.manage` respectively rather than given their own slugs — they're always exercised by the owning vendor as one bundle, and the brief's own examples (`service.create`, `booking.cancel`, `vendor.approve`, `role.update`) show a moderate, not maximal, granularity.

| Slug | Meaning |
|---|---|
| `role.create` / `role.read` / `role.update` / `role.delete` | Manage role definitions and their permission bundles |
| `role.assign` | Assign a role to a user (incl. creating a sub-admin's account role) |
| `admin.create` | Create a new admin/sub-admin user account |
| `permission.read` | List the permission catalogue (for the role-builder UI) |
| `vendor.approve` | Approve or reject a pending vendor application |
| `vendor.read.any` | List/view any vendor's profile (admin) |
| `vendor.profile.read` / `vendor.profile.update` | Vendor viewing/editing their own profile (ownership-checked) |
| `category.create` / `category.update` / `category.delete` | Manage the category tree (public read needs no permission) |
| `service.create` / `service.update` / `service.delete` | Vendor manages own services & offerings (ownership-checked) |
| `service.publish` | Vendor publishes their own `DRAFT` service (also requires vendor `APPROVED`) |
| `service.suspend` | Admin suspends any live service with a reason (stretch, built in Phase 5) |
| `service.read.any` | Admin/vendor listing incl. non-published services |
| `availability.manage` | Vendor manages own service's weekly rules & date exceptions |
| `booking.create` | Customer creates a booking |
| `booking.read.own` | Customer reads their own bookings |
| `booking.read.vendor` | Vendor reads bookings against their own services |
| `booking.read.any` | Admin reads any booking |
| `booking.confirm` / `booking.reject` / `booking.complete` / `booking.noshow` | Vendor state transitions on own bookings |
| `booking.cancel.own` | Customer cancels their own booking (window rule applies) |
| `booking.cancel.vendor` | Vendor cancels a booking on their own service (no window) |
| `booking.cancel.any` | Admin force-cancel, any booking, mandatory reason, no window |
| `booking.reschedule.own` | Customer reschedules their own booking |
| `payment.confirm` | Customer confirms/settles their own booking's payment |
| `payment.markCollected` | Vendor marks a `PAY_AFTER` booking as paid (cash/manual) |
| `payment.refund` | Admin manually triggers a refund (dispute edge case) |
| `dashboard.read` | Admin dashboard summary metrics |
| `audit.read` | Admin audit log (stretch, built in Phase 9) |

**Seeded system roles** (`isSystem = true`):
- `SUPER_ADMIN` — `type: ADMIN`, `bypassChecks: true`. No explicit permission rows needed, but seed all of them anyway for display consistency in the role UI.
- `ADMIN` — `type: ADMIN`, every permission above except none excluded (a full, non-bypassing admin).
- `VENDOR` — `type: VENDOR` — `vendor.profile.read`, `vendor.profile.update`, `service.create`, `service.update`, `service.delete`, `service.publish`, `availability.manage`, `booking.read.vendor`, `booking.confirm`, `booking.reject`, `booking.complete`, `booking.noshow`, `booking.cancel.vendor`, `payment.markCollected`.
- `CUSTOMER` — `type: CUSTOMER` — `booking.create`, `booking.read.own`, `booking.cancel.own`, `booking.reschedule.own`, `payment.confirm`.

The seed additionally creates one **custom** role to exercise the data-driven system end-to-end: `CATALOGUE_MODERATOR` — `type: ADMIN`, `isSystem: false` — holding only `category.create`, `category.update`, `category.delete`, `service.suspend`. This is the exact example the brief gives, and doubles as a live demonstration that custom roles work.

---

## 10. API Conventions

### 10.1 Auth
Every protected request: `Authorization: Bearer <accessToken>`. Refresh token travels only as the `httpOnly` cookie described in Section 7.7 — never in a header or body the client can read.

### 10.2 Response envelopes

Success:
```json
{ "success": true, "data": { }, "meta": { } }
```
`meta` is omitted when not applicable (e.g. pagination `meta` only appears on list endpoints).

Error (produced by one global `AllExceptionsFilter`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [ { "field": "email", "message": "must be an email" } ]
  }
}
```
Status-code discipline: `400` malformed/invalid input, `401` missing/expired/invalid token, `403` valid token but wrong permission, `404` not found or not owned (Section 7.3), `409` conflict (duplicate email, capacity race lost, illegal state transition attempted on a resource that legitimately exists), `422` semantically invalid request against a resource that exists and is visible (e.g. `complete` called on a `PENDING` booking, cancel inside the free-cancellation window). **Never 500 for a validation failure.**

### 10.3 Pagination & filtering
`GET /resource?page=1&pageSize=20&<filters>` → `{ success: true, data: [...], meta: { total, page, pageSize, totalPages } }`. Always implemented via Prisma `where` + `skip`/`take`, never in-memory.

### 10.4 Idempotency
Any endpoint documented as idempotent requires an `Idempotency-Key` header. A dedicated `IdempotencyInterceptor` checks the `IdempotencyKey` table first: if the key exists, the stored `responseStatus`/`responseBody` is replayed verbatim without re-executing business logic; if not, the request proceeds and the interceptor persists the response before returning it.

---

## 11. Frontend Conventions

- **Rendering split:** public/browse pages (`(public)` route group — catalogue browse, service detail, slot picker) are React **Server Components** hitting the API's unauthenticated endpoints directly, for fast first paint and no unnecessary client JS. Everything behind login (`(customer)`, `(vendor)`, `(admin)`) is **Client Components** using TanStack Query + `auth-context.tsx`, since none of it needs SEO and all of it needs live, permission-aware interactivity.
- **`auth-context.tsx`** calls `GET /me` on load, exposes `{ user, permissions: string[], hasPermission(slug) }`. UI elements are conditionally rendered with `hasPermission(...)` — this is cosmetic convenience only; the server is what actually enforces access (Section 2).
- **`api-client.ts`** is a single typed wrapper around `fetch` (`credentials: 'include'` for cookie-based refresh) that on a `401` transparently attempts one `/auth/refresh` and retries the original request once before surfacing the failure — mirrors the backend's M1 "DONE WHEN."
- **Every data-fetching screen handles three states explicitly:** loading (skeleton, not a blank screen), empty (a real empty state with a next action, not just "no data"), and error (a retry affordance, not a stack trace). This is graded (Section 14's "UI" row) and cheap to do consistently if it's a shared pattern from the start rather than bolted on later.
- **Forms** use React Hook Form + a Zod schema colocated with the form component (not shared with the backend — the backend DTOs are the real gate; frontend Zod schemas exist purely for instant UX feedback).
- shadcn components are added on demand per phase (`npx shadcn@latest add <component>`), not all upfront — keeps the diff for each phase readable.


---

## 12. Phased Implementation Plan

Each phase lists: **Goal**, **Depends on**, **Backend tasks**, **Frontend tasks**, **Endpoints introduced**, **Definition of Done**. Priority tags (`MUST`/`SHOULD`/`STRETCH`) are inherited from the original brief so effort is spent in the right order if time runs short. Most `STRETCH` items from the brief are still built (folded into the phase they naturally belong to, or as Phase 12) — the one exception is forgot-password, which is intentionally left out entirely (Section 6).

---

### Phase 0 — Repository Setup & Infrastructure Foundation `MUST` (enables everything)

**Goal:** A deployed, empty-but-working skeleton for both apps, connected to Neon, before any feature work begins. ("Deploy early on Saturday, against a nearly empty project" — the brief is explicit that this is the most common way submissions go late.)

**Depends on:** nothing.

**Backend tasks:**
- Create the repo with the two independent folders laid out in Section 4 (`apps/web`, `apps/api`) — no workspace file, no root `package.json` that either app depends on.
- Scaffold NestJS in `apps/api` (its own `package.json`, run and installed from inside that folder); install the packages listed in Section 3.
- `PrismaModule` as a global module wrapping a `PrismaService` (`onModuleInit` → `$connect()`, `onModuleDestroy` → `$disconnect()`).
- Global `ValidationPipe`, global `AllExceptionsFilter` (Section 10.2), global response-wrapping interceptor, `helmet()`, CORS (`origin: FRONTEND_URL`, `credentials: true`), a light `ThrottlerModule` config on auth routes only (guard added in Phase 2).
- `GET /health` → `{ status: "ok", uptime, dbConnected }` (do a trivial `SELECT 1` through Prisma to confirm the DB link, not just process liveness).
- `.env.example` for `apps/api`.

**Frontend tasks:**
- Scaffold Next.js (App Router, TS, Tailwind) in `apps/web` (its own `package.json`, run and installed from inside that folder, `npx create-next-app@latest`); run `npx shadcn@latest init` from within `apps/web`.
- A placeholder landing page (`app/(public)/page.tsx`) — enough to prove the deploy pipeline works, not a designed homepage yet.
- `.env.example` for `apps/web`.

**Endpoints introduced:** `GET /health`.

**Definition of Done:**
- Neon project created; `DATABASE_URL`/`DIRECT_URL` obtained.
- Repo pushed to GitHub with real (non-squashed) commit history starting here.
- Vercel project connected with **root directory set to `apps/web`** and deployed; Render/Railway web service connected with **root directory set to `apps/api`** and deployed. Each platform installs and builds only its own folder — this is what "fully independent" buys you operationally.
- The deployed frontend URL loads the placeholder page; the deployed `<api-url>/health` returns `200` with `dbConnected: true`. Both reachable without VPN/login. You should be able to run each locally, independently, with `cd apps/api && npm run start:dev` and `cd apps/web && npm run dev` in two separate terminals — neither command depends on the other having run first.

---

### Phase 1 — Database Schema & Seed Skeleton `MUST`

**Goal:** The complete schema from Section 8 exists and is migrated. This is deliberately front-loaded — every later phase adds *logic*, not new tables (a couple of narrow, explicitly-noted additions are allowed later if something is genuinely missed, but the intent is schema stability from here on, which is what "one source of truth" requires).

**Depends on:** Phase 0.

**Backend tasks (everything below lives inside `apps/api`, run with `apps/api` as the working directory):**
- Write `prisma/schema.prisma` verbatim from Section 8.
- `npx prisma migrate dev --name init` locally against Neon's direct URL; confirm `npx prisma studio` shows every model.
- `prisma/seed.ts`: a thin orchestrator that calls small, named functions in order — `seedPermissionsAndRoles()`, then empty stubs (`seedUsers()`, `seedVendors()`, `seedCategories()`, `seedServicesAndOfferings()`, `seedAvailability()`, `seedBookings()`) that later phases fill in one at a time. Wire `"prisma": { "seed": "ts-node prisma/seed.ts" }` in `apps/api/package.json` and add a `"seed": "prisma db seed"` script.
- Implement `seedPermissionsAndRoles()` now: insert every slug from Section 9, the four system roles with their bundles, and the one custom `CATALOGUE_MODERATOR` role.

**Definition of Done:**
- `npx prisma migrate deploy` (run from `apps/api`) succeeds against the deployed Neon database (not just local).
- `npm run seed` (run from `apps/api`) runs cleanly, idempotently (safe to re-run — use `upsert` throughout), against both local and deployed DB, and after running, `Permission`/`Role`/`RolePermission` tables are fully populated per Section 9.

---

### Phase 2 — Authentication & Session Management `MUST` (M1)

**Goal:** All three roles can sign up (customer self-serve, vendor self-serve into `PENDING`, admin only via seed/another admin) and log in; tokens work exactly as specified in Section 7.7.

**Depends on:** Phase 1.

**Backend tasks (`modules/auth`):**
- `POST /auth/signup/customer` — creates `User` with the `CUSTOMER` role. Duplicate email → clean `409`, not a raw DB constraint error (catch the Prisma unique-violation and translate it).
- `POST /auth/signup/vendor` — creates `User` with the `VENDOR` role **and** a `VendorProfile` in `PENDING` in one transaction.
- `POST /auth/login` — verifies password with `bcrypt.compare`, issues access token (Section 7.7 payload) + sets the refresh cookie, creates the `RefreshToken` row.
- `POST /auth/refresh` — reads the cookie, hashes it, looks up an unrevoked/unexpired `RefreshToken`, rotates it (Section 7.7), issues a new access token.
- `POST /auth/logout` — revokes the current `RefreshToken` row, clears the cookie.
- `GET /me` — returns `{ id, email, name, role: { name, type }, permissions: string[] }`, resolved fresh from the DB (never token-cached, consistent with Section 7.2).
- `JwtAuthGuard` applied globally by default (`APP_GUARD`), with a `@Public()` decorator to opt out for signup/login/refresh/health/public catalogue routes — safer default than opting in per-route.
- Apply `ThrottlerGuard` to `/auth/login` and `/auth/signup/*` specifically (basic brute-force mitigation).

**Frontend tasks:**
- `(auth)/login`, `(auth)/signup`, `(auth)/vendor/signup` pages with React Hook Form + Zod.
- `auth-context.tsx` + `api-client.ts` as specified in Section 11, wired app-wide in the root layout.
- Minimal top nav that shows Login/Signup when logged out; once `GET /me` resolves, shows the caller's name and a role-appropriate link (this nav is intentionally bare here — full role-based navigation is built out as each dashboard phase lands).

**Endpoints introduced:** `POST /auth/signup/customer`, `POST /auth/signup/vendor`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`.

**Tests (required for this phase):**
- Expired access token → `401`; one transparent refresh succeeds and the retried request goes through.
- Duplicate-email signup → `409` with the standard error envelope, not a stack trace.
- After logout, replaying the old refresh token fails.

**Definition of Done:** All three DONE WHEN bullets under M1 in the original brief pass, verified against the *deployed* API, not just locally.

---

### Phase 3 — Roles & Permissions Engine `MUST` (M2 — "reviewed first")

**Goal:** Real server-side enforcement, ownership checks separated from permission checks, and live role editing — this is the module the brief says gets reviewed first, so it must be unambiguous and solid before other modules lean on it.

**Depends on:** Phase 2.

**Backend tasks (`common/guards`, `modules/roles`):**
- `PermissionsGuard` + `@RequirePermissions('resource.action', ...)` decorator: loads `req.user`'s role + permissions fresh from the DB (Section 7.2); `role.bypassChecks === true` short-circuits to allow; otherwise checks the required slug is present, else `403`.
- Establish the ownership-check convention (Section 7.3) as a small reusable helper (e.g. `assertOwnedOrAny(resourceOwnerId, requester, anyPermissionSlug)`) used inside service methods — not a generic guard, since "ownership" means something different per resource.
- `GET /permissions` `[permission.read]`.
- `GET /roles`, `POST /roles`, `PATCH /roles/:id`, `DELETE /roles/:id` (`isSystem` roles reject delete with `409`) `[role.create|read|update|delete]`.
- `POST /admin/sub-admins` `{ email, name, password, roleId }` `[admin.create]` — creates a new `ADMIN`-type user with the given role in one call (this is the concrete implementation of "admin creates sub-admins").
- `POST /admin/users/:id/role` `[role.assign]` — reassigns an existing user's role.

**Frontend tasks:**
- `(admin)/admin/roles` — list roles, create a role (name + tick permissions from `GET /permissions`, grouped by resource prefix), edit a role's permission set, create a sub-admin and assign a role. This is deliberately built now (not deferred to the full Phase 9 admin console) because it's the only way to *demonstrate* the data-driven claim: create a restricted role live, assign it, and watch that account's own UI/API surface shrink.

**Endpoints introduced:** `GET /permissions`, `GET/POST/PATCH/DELETE /roles`, `POST /admin/sub-admins`, `POST /admin/users/:id/role`.

**Tests (required for this phase):**
- A privileged endpoint (any `[permission-gated]` route) called with a token lacking that permission → `403`.
- Revoke a permission from a role via `PATCH /roles/:id`, then immediately re-call an endpoint requiring it with a token belonging to that role → `403`, no restart involved.
- Two different users' owned resources are mutually inaccessible (this test can be written now against a resource that already exists — e.g. two vendor profiles once Phase 4 lands — or deferred to be re-verified per-resource in each later phase's own test suite; either is acceptable as long as it's covered somewhere).

**Definition of Done:** All three M2 DONE WHEN bullets pass against the deployed API.

---

### Phase 4 — Vendor Onboarding `SHOULD` (M3 — structurally required before Phase 5)

**Goal:** Vendors submit a business profile and sit in `PENDING` until an admin decides. Although the brief tags this `SHOULD`, Phase 5's "only `PUBLISHED` services belonging to an `APPROVED` vendor appear in the public catalogue" rule structurally depends on this existing — so it's built now, deliberately kept lean.

**Depends on:** Phase 3.

**Backend tasks (`modules/vendors`):**
- `PATCH /vendors/me/profile` `[vendor.profile.update]`, ownership implicit (there's exactly one profile per authenticated vendor user).
- `POST /vendors/me/documents` `[vendor.profile.update]` — accepts a filename/metadata payload (Section 7.6); a real `multer` disk-upload variant is included for local dev but is not what production correctness relies on.
- `GET /vendors/me` `[vendor.profile.read]` — includes `status` and `rejectionReason` so the vendor can see exactly why, if rejected.
- `GET /admin/vendors?status=&page=&pageSize=` `[vendor.read.any]`.
- `PATCH /admin/vendors/:id/approve` and `PATCH /admin/vendors/:id/reject { reason }` `[vendor.approve]` — sets `status`/`approvedAt`/`rejectionReason`.
- Guard: anywhere a vendor attempts a vendor-only action (Phase 5 onward), the guard/service also checks `vendorProfile.status === 'APPROVED'` where the brief requires it (specifically: publishing a service). A pending/rejected vendor's account still logs in and hits `GET /vendors/me` fine — they're just blocked from anything beyond that, at the API, not just a hidden button.

**Frontend tasks:**
- `(vendor)/vendor/onboarding` — profile completion form + document upload; a status banner (pending/approved/rejected + reason) shown on every vendor page until `APPROVED`.
- `(admin)/admin/vendors` — paginated, status-filterable queue; approve/reject actions with a required reason field on reject.

**Endpoints introduced:** `PATCH /vendors/me/profile`, `POST /vendors/me/documents`, `GET /vendors/me`, `GET /admin/vendors`, `PATCH /admin/vendors/:id/approve`, `PATCH /admin/vendors/:id/reject`.

**Definition of Done:** Both M3 DONE WHEN bullets pass — a pending vendor is blocked from publishing at the API layer (proven by a direct call, not just UI absence), and approval is visible to the vendor on their very next request (no re-login required, since `GET /me`/`GET /vendors/me` are always fetched fresh).


---

### Phase 5 — Service Catalogue `MUST` (M4)

**Goal:** Categories, services, offerings, publish workflow, and a properly server-paginated/filtered/searched public catalogue.

**Depends on:** Phase 4.

**Backend tasks (`modules/categories`, `modules/services`):**
- `GET /categories` (public, no permission needed — it's read-only reference data), `POST/PATCH/DELETE /categories` `[category.create|update|delete]`. Two levels of nesting enforced by rejecting a create/update where `parentId` points at a category that itself already has a `parentId`.
- `GET /vendors/me/services`, `POST /vendors/me/services` `[service.create]`, `PATCH /services/:id` `[service.update]`, `DELETE /services/:id` `[service.delete]` — all ownership-checked against the caller's `VendorProfile`.
- `PATCH /services/:id/publish` `[service.publish]` — rejects with `422` unless the service has ≥1 active offering and the owning vendor is `APPROVED`.
- `PATCH /services/:id/suspend { reason }` `[service.suspend]` (**STRETCH** within this phase — see Section 7.6-adjacent note: existing bookings are untouched, only the public listing and slot generation stop; implement this now since it falls out of the status filter for free, no extra schema work needed).
- Offerings nested under services: `POST /services/:id/offerings`, `PATCH /offerings/:id`, `DELETE /offerings/:id`, all `[service.update]`, ownership via the parent service.
- `GET /services?page=&pageSize=&search=&categoryId=` (public) — only `status: PUBLISHED` **and** `vendorProfile.status: APPROVED`; `search` does a case-insensitive `contains` on `title`/`description` at the DB level.
- `GET /services/:id` (public detail) — `404` if not published/approved and the requester isn't the owning vendor or an admin (consistent with Section 7.3).

**Frontend tasks:**
- `(admin)/admin/categories` — tree-aware CRUD (two levels, rendered as parent → children).
- `(vendor)/vendor/services` — list, create/edit service (title/description/category/images-as-filenames), manage offerings inline, publish/unpublish toggle (disabled with an explanatory tooltip while `DRAFT` prerequisites aren't met or vendor isn't approved).
- `(public)/services` — server-rendered browse grid with search + category filter + pagination controls; `(public)/services/[id]` — detail page listing offerings (booking itself comes in Phase 7 once slots exist).

**Endpoints introduced:** `GET/POST/PATCH/DELETE /categories`, `GET/POST /vendors/me/services`, `PATCH/DELETE /services/:id`, `PATCH /services/:id/publish`, `PATCH /services/:id/suspend`, `POST /services/:id/offerings`, `PATCH/DELETE /offerings/:id`, `GET /services`, `GET /services/:id`.

**Definition of Done:** Both M4 DONE WHEN bullets pass — a `DRAFT` service's detail URL returns `404` to a signed-out visitor, and page 2 of a filtered/searched `GET /services` call returns the correct slice with an accurate `meta.total`.

---

### Phase 6 — Availability & Slot Engine `MUST` (M5)

**Goal:** Bookable slots are always *derived*, never hand-stored, and correctly account for weekly rules, date exceptions, existing bookings, past-time exclusion, and the vendor's own timezone.

**Depends on:** Phase 5.

**Backend tasks (`modules/availability`):**
- `POST /services/:id/availability-rules { weekday, startMinute, endMinute, capacity }`, `DELETE /availability-rules/:id` — both `[availability.manage]`, ownership via the parent service. A service can have multiple rule rows per weekday (multiple windows, e.g. 09:00–13:00 and 16:00–20:00 both stored as separate rows for the same `weekday`).
- `POST /services/:id/availability-exceptions { date, isClosed, startMinute?, endMinute?, capacity? }`, `DELETE /availability-exceptions/:id` — same guard. `isClosed: true` zeroes out that calendar date entirely regardless of the weekly rules; `isClosed: false` requires `startMinute`/`endMinute`/`capacity` and represents a one-off opening on an otherwise-closed day.
- **Slot derivation algorithm** (pure function, unit-testable independent of HTTP — this matters, per Section 2): given `(service, offering, dateRangeStart, dateRangeEnd)`:
  1. Load the vendor's `timezone` from `VendorProfile`.
  2. For each calendar date in range, resolve the day's effective open windows: start from `AvailabilityRule` rows matching that weekday; if an `AvailabilityException` exists for that exact date, it fully overrides the rules for that date (closed → no windows; open → its own window(s) replace the weekly ones).
  3. Within each resolved window, step forward in increments of `offering.durationMinutes` from `startMinute` while `slotStart + duration <= endMinute`, converting each vendor-local `(date, minute)` pair to a UTC `Date` using the vendor's timezone.
  4. Discard any slot whose UTC start is in the past, compared against **server** time (not the browser's) — this is what the brief explicitly calls out.
  5. For each remaining slot, compute `remaining = capacity - count(bookings in PENDING/CONFIRMED/COMPLETED for that exact (serviceId, offeringId, slotStart))` and drop slots where `remaining <= 0`.
  - Use `luxon` for all timezone-aware arithmetic — never rely on the Node process's local timezone.
- `GET /services/:id/slots?offeringId=&from=&to=` (public) — runs the algorithm above.
- `GET /services/:id/next-available?offeringId=` (public, **SHOULD**) — same algorithm, returns the first slot found, scanning forward in bounded windows (e.g. week by week) up to a sane cap (e.g. 60 days) before returning `null`.

**Frontend tasks:**
- `(vendor)/vendor/services/[id]/availability` — a weekly grid editor (per weekday, add/remove windows + capacity) and an exceptions calendar (mark a date closed, or add a one-off window).
- `(public)/services/[id]` — a slot picker (date range → available slots with remaining capacity shown) using `GET /services/:id/slots`, feeding into the booking flow built in Phase 7.

**Endpoints introduced:** `POST/DELETE /availability-rules`, `POST/DELETE /availability-exceptions`, `GET /services/:id/slots`, `GET /services/:id/next-available`.

**Tests (required for this phase):**
- Changing an offering's duration from 30 to 60 minutes changes the generated slot boundaries.
- A capacity-2 slot with one active booking reports `remaining: 1`; with two, it's excluded from the results entirely.
- Adding then removing a closing `AvailabilityException` makes a date's slots disappear, then reappear unchanged from the base weekly rule.

**Definition of Done:** All three M5 DONE WHEN bullets pass, including the duration-change test above, against the deployed API.


---

### Phase 7 — Booking Lifecycle & Concurrency `MUST` (M6 — "the heart of the assignment")

**Goal:** The full state machine, enforced server-side, with race-safe capacity handling proven under real concurrent load.

**Depends on:** Phase 6.

**Backend tasks (`modules/bookings`):**
- Implement the state machine as an explicit, table-driven map (not scattered `if` statements) — legal transitions exactly as specified in the brief's M6 table plus Section 7.8's vendor-cancel addition:
  - `PENDING → CONFIRMED` (vendor, `booking.confirm`; requires `Payment.status === SUCCESS` when `paymentMode === PAY_NOW`, else `422`)
  - `PENDING → REJECTED` (vendor, `booking.reject`)
  - `PENDING → CANCELLED` (customer `booking.cancel.own`, window-gated; vendor `booking.cancel.vendor`, not window-gated; admin `booking.cancel.any`, not window-gated)
  - `CONFIRMED → COMPLETED` (vendor, `booking.complete`; only once `now >= slotStart`)
  - `CONFIRMED → CANCELLED` (same actors/rules as above)
  - `CONFIRMED → NO_SHOW` (vendor, `booking.noshow`; only once `now >= slotStart`)
  - Any other requested transition → `422` (e.g. `complete` called on `PENDING` → `422`, per the brief's own example). Calling a mutation with the wrong permission entirely → `403` (e.g. a customer token calling `/complete`).
- `reserveSlot(tx, { serviceId, offeringId, slotStart, slotEnd, excludeBookingId? })` — the shared capacity-reservation routine from Section 7.5, used by both create and reschedule.
- `POST /bookings { serviceId, offeringId, slotStart, paymentMode }` `[booking.create]` — wraps `reserveSlot` in a `$transaction`; on success inserts the `Booking` (`PENDING`) + a `BookingHistory` row (`toStatus: PENDING`, actor = customer) + (if `PAY_NOW`) a `Payment` row (`INITIATED`, `providerRef` generated). Price is taken from the current `Offering.priceMinorUnits` server-side — **never** trust a price from the client.
- `PATCH /bookings/:id/confirm|reject|complete|no-show|cancel|reschedule` — each writes a `BookingHistory` row (`fromStatus`, `toStatus`, `actorUserId`, `reason?`, `metadata?`) inside the same transaction as the status change. Reschedule calls `reserveSlot` for the new slot before updating `slotStart`/`slotEnd`.
- `GET /bookings/:id` — full detail including the ordered `history` timeline; ownership per Section 7.3 (`booking.read.own` for the customer, `booking.read.vendor` for the owning vendor, `booking.read.any` for admin).
- `GET /bookings` (mine, customer), `GET /vendor/bookings` (mine, vendor, filterable by `status`/`serviceId`/date range), `GET /admin/bookings` (any, filterable by `status`/`vendorId`/date range) — all paginated per Section 10.3.

**Frontend tasks:**
- Booking flow on `(public)/services/[id]`: pick offering → pick slot (from Phase 6's picker) → choose `PAY_NOW`/`PAY_AFTER` → confirm (payment step itself lands in Phase 8; this phase can stub it as "confirm booking" and Phase 8 slots the real payment step in).
- `(customer)/account/bookings` — list with status filter; `(customer)/account/bookings/[id]` — detail + timeline + cancel/reschedule actions where legal.
- `(vendor)/vendor/bookings` — list with filters; per-row confirm/reject/complete/no-show/cancel actions, each only rendered when the current status makes it legal (cosmetic; the API is the real gate).

**Endpoints introduced:** `POST /bookings`, `GET /bookings/:id`, `GET /bookings`, `GET /vendor/bookings`, `GET /admin/bookings`, `PATCH /bookings/:id/confirm|reject|complete|no-show|cancel|reschedule`.

**Concurrency proof (required deliverable, per the brief):**
- `apps/api/scripts/load-test-booking.ts` — a plain Node script using `Promise.all` to fire 20 simultaneous `POST /bookings` requests at one specific `(service, offering, slotStart)` known to have capacity 3 (seed data provides such a slot). Commit the script **and** a captured run of its output (e.g. `apps/api/scripts/load-test-output.txt`) showing exactly 3 succeed and 17 receive `409`.

**Tests (required for this phase):**
- State machine: table-driven test asserting every legal transition succeeds and every illegal one returns `422`.
- Capacity race: an integration test hitting a real (test) database with concurrent requests, asserting exactly `capacity` bookings are created.
- `PATCH /bookings/:id/complete` called by a customer token → `403`; called by the owning vendor on a `PENDING` booking → `422`.
- Reschedule-then-cancel: assert the resulting `BookingHistory` timeline reads correctly start to finish.

**Definition of Done:** All three M6 DONE WHEN bullets pass, with the load-test script and its output committed to the repo.

---

### Phase 8 — Mocked Payments `MUST` (M7)

**Goal:** A payment flow whose *structure* — state transitions, idempotency, failure/refund handling — is correct, using a hand-written mock provider behind an interface (no real gateway, ever).

**Depends on:** Phase 7.

**Backend tasks (`modules/payments`):**
- `PaymentProvider` interface with one implementation, `MockPaymentProvider`, selected via DI (so a real provider could later be swapped in without touching booking/payment orchestration logic — this is exactly what's being assessed per the brief). Mock outcome rules exactly as Section 7.9 documents: `tok_success` (default) → `SUCCESS`, `tok_fail` → `FAILED`, `tok_delay` → stays `INITIATED`.
- `POST /payments/:id/confirm { token? }` `[payment.confirm]`, ownership-checked (caller must be the booking's customer), **requires** `Idempotency-Key` header, wrapped in the `IdempotencyInterceptor` from Section 10.4. On `SUCCESS`: `Payment.status = SUCCESS` + a `PaymentEvent(type: SUCCESS)` row; booking stays `PENDING` (awaiting vendor confirm). On `FAILED`: `Payment.status = FAILED` + `PaymentEvent(type: FAILED)`; the booking is transitioned `PENDING → CANCELLED` in the same transaction (actor: system, reason: `"payment failed"`), releasing the slot.
- `POST /payments/webhook { providerRef, outcome: "SUCCESS" | "FAILED" }` — guarded by `X-Webhook-Secret === process.env.WEBHOOK_SECRET`, not JWT. Resolves a `tok_delay` payment exactly like the confirm endpoint's success/failure branch above. **Idempotent by construction**: if the `Payment` is already in a terminal state (`SUCCESS`/`FAILED`/`REFUNDED`), the webhook is a no-op that still logs a `PaymentEvent(type: WEBHOOK_RECEIVED)` for audit but makes no state change and returns `200`.
- `PATCH /bookings/:id/mark-collected` `[payment.markCollected]`, ownership (vendor) — only valid for `PAY_AFTER` bookings with no existing `Payment`; creates a `Payment` directly in `SUCCESS` with `providerRef` prefixed `cash_`.
- Refund path, triggered automatically wherever Section 7.8 calls for one (customer cancel outside window, vendor cancel, admin force-cancel) on a booking whose `Payment.status === SUCCESS`: `Payment.status → REFUNDED` + a `PaymentEvent(type: REFUNDED)` row (this is the "status change plus a ledger row" the brief asks for). `POST /admin/payments/:id/refund { reason }` `[payment.refund]` exists as a manual override for edge cases (e.g. a dispute after the booking is already `COMPLETED`).
- Add `outstandingBalanceMinorUnits` to the booking detail response: `offering.priceMinorUnits` if `paymentMode === PAY_AFTER` and no `Payment` exists yet, else `0`.

**Frontend tasks:**
- Payment step in the customer booking flow (from Phase 7's stub): for `PAY_NOW`, a form to trigger `POST /payments/:id/confirm` with a token selector defaulting to success but exposing `tok_fail`/`tok_delay` for reviewer testing, exactly as the README will document; shows the resulting payment status.
- Booking detail page: payment status badge, outstanding balance (for `PAY_AFTER`), and — for the owning vendor — a "mark cash collected" button.
- Admin: a manual refund action on the booking detail page (visible only with `payment.refund`).

**Endpoints introduced:** `POST /payments/:id/confirm`, `POST /payments/webhook`, `PATCH /bookings/:id/mark-collected`, `POST /admin/payments/:id/refund`.

**Tests (required for this phase):**
- A forced `tok_fail` payment leaves the slot bookable by someone else (assert via the slots endpoint or a second booking attempt succeeding).
- Replaying the same `POST /payments/:id/confirm` request with the same `Idempotency-Key` twice produces exactly one `Payment` row and one `Booking` row.
- Calling `/payments/webhook` twice with the same outcome has no additional effect on `Payment` state (assert only one `SUCCESS`/`FAILED` `PaymentEvent`, with subsequent calls only logging `WEBHOOK_RECEIVED`).

**Definition of Done:** All three M7 DONE WHEN bullets pass, and a full grep of the codebase confirms zero references to any real payment network/SDK.


---

### Phase 9 — Admin Console `SHOULD` (M8)

**Goal:** The operational surface an admin actually needs day to day — Phase 3 already covers role/permission management; this phase adds the dashboard and cross-vendor oversight.

**Depends on:** Phase 8 (needs bookings + payments to have real numbers to show).

**Backend tasks (`modules/admin`):**
- `GET /admin/dashboard/summary` `[dashboard.read]` → `{ pendingVendorApplications, bookingsToday, revenueCollectedMinorUnits, paymentsFailedCount }`, each a single indexed aggregate query (not a full-table scan).
- `GET /admin/bookings` already exists from Phase 7 — extend its filters here if anything's missing (vendor, status, date range, all server-side).
- `PATCH /admin/bookings/:id/force-cancel { reason }` `[booking.cancel.any]` — `reason` is mandatory (`400` if missing), goes through the same state-machine + refund path as any other cancel, and is what M8's "appears in the booking's timeline" requirement is checking.
- `AuditLog` writes (**STRETCH**, but cheap once the shape exists): a small interceptor on admin-only mutating routes (`vendor.approve`, `service.suspend`, `booking.cancel.any`, `role.*`) writes `{ actorUserId, action, targetType, targetId }`. `GET /admin/audit-logs` `[audit.read]`, paginated/filterable.

**Frontend tasks:**
- `(admin)/admin/dashboard` — the four summary cards from above.
- `(admin)/admin/bookings` — cross-vendor list with status/vendor/date filters; force-cancel action with a required-reason dialog.
- Role/permission screens already exist from Phase 3 — this phase just makes sure they're linked from the admin shell's navigation.
- (**STRETCH**) `(admin)/admin/audit-log` — simple filterable table.

**Endpoints introduced:** `GET /admin/dashboard/summary`, `PATCH /admin/bookings/:id/force-cancel`, `GET /admin/audit-logs` (stretch).

**Definition of Done:** An admin can see today's real numbers, filter all bookings across every vendor, and force-cancel one with a reason that then shows up correctly on that booking's timeline.

---

### Phase 10 — Cross-Cutting Hardening & QA `MUST` (applies to everything, Section 09 of the brief)

**Goal:** A final pass ensuring the standards in Section 2 actually hold everywhere, not just in the phase where a rule was first introduced.

**Depends on:** Phase 9.

**Tasks:**
- Grep every controller for a raw client-supplied price, role, or id being trusted without re-derivation/re-validation — fix any found.
- Grep every controller for a response that doesn't go through the standard envelope (Section 10.2) — fix any found.
- Confirm no endpoint returns `500` for what is actually a validation failure — deliberately send malformed payloads at a sample of endpoints across every module and check status codes.
- Confirm every list endpoint's pagination/filtering is provably server-side (temporarily point one at a large seeded dataset and check the SQL, or check `meta.total` behaves correctly with `pageSize` smaller than total).
- Full regression pass on the test suite listed in Section 13; fill any gap so all six required test categories exist and pass.
- Frontend: audit every authenticated screen for the three-state handling mandated in Section 11 (loading/empty/error) — this is graded under "UI" in the rubric (Section 14) and is easy to miss on screens built early in the project before the pattern was fully settled.
- Basic accessibility pass: form labels, button text (not icon-only with no `aria-label`), sufficient color contrast on shadcn theme tokens, keyboard-reachable interactive elements.
- Confirm `.env.example` in both apps is complete and accurate against what the code actually reads from `process.env`.

**Definition of Done:** Nothing new is built in this phase — it exists purely to make everything already built consistent with Section 2 and Section 09 of the original brief. Exit criteria: the checklist above is walked and every item is either confirmed fine or fixed.

---

### Phase 11 — Deployment, Seed Completion & Submission Package `MUST` (Section 11 of the brief)

**Goal:** Everything the brief's submission email requires, assembled and verified end-to-end from a cold clone.

**Depends on:** Phase 10.

**Tasks:**
- **Finish the seed script** (`apps/api/prisma/seed.ts`). By now every domain function stubbed in Phase 1 has a real implementation. Assemble the exact roster the brief requires (see Appendix A) — this is the single script that populates both the local and the deployed database (run `npm run seed` from `apps/api`, once against the local `DATABASE_URL`, once against the deployed one).
- **`README.md`** (repo root, so it renders on the GitHub repo page) — both live URLs at the very top, then credentials for every seeded role (Appendix A), then cold-clone setup covering *both* apps separately: for `apps/api` — prerequisites, environment variables (mirroring its `.env.example`), `npm install`, `npx prisma migrate deploy`, `npm run seed`, `npm run start:dev`; for `apps/web` — environment variables (mirroring its `.env.example`), `npm install`, `npm run dev`. Also document the mock-payment trigger tokens (`tok_success`/`tok_fail`/`tok_delay`) here, per M7's explicit instruction.
- **`DECISIONS.md`** (repo root) — the data model (the Section 8 Mermaid ER diagram, or an equivalent plain list), how the capacity race was prevented (Section 7.5, summarized), what was deliberately left out (forgot-password — Section 6 — plus Phase 12/staff-assignment if it genuinely didn't get built in the time available), and what would be built next given another week (forgot-password, real object storage, an actual queue-backed webhook simulation, and staff assignment if Phase 12 wasn't reached).
- **API reference** — `docs/openapi.yaml` generated from the NestJS app (`@nestjs/swagger` decorators added retroactively across controllers is the fastest path — annotate DTOs and controllers, then export the generated spec) **or** a Postman collection exported with the deployed base URL pre-filled. Either satisfies the requirement; OpenAPI is preferred since it can be generated mechanically from code that's already typed, which is less effort to keep accurate than hand-maintaining a Postman collection.
- **Final deployment verification:** both live URLs reachable with no VPN/invite; sign in as each seeded role on the *deployed* instance and exercise one representative action per role (customer books, vendor confirms, admin approves a vendor) to confirm the seed + deploy actually work together, not just in isolation.
- **Repository hygiene check:** confirm commit history through all prior phases is genuinely incremental (this was supposed to happen continuously, but verify here as a final check — a single end-of-weekend commit is explicitly called out as unacceptable).

**Definition of Done:** All five items in the brief's Section 11 checklist (live app, GitHub repo, README, seed script, DECISIONS.md, API reference) exist and are correct when checked from a genuinely fresh clone and a genuinely fresh browser session against the deployed URLs.

---

### Phase 12 — Staff Assignment `STRETCH` (optional, attempt only after Phase 11 is solid)

**Goal:** Close the gap noted in Section 7.4 — real cross-offering resource contention, instead of each offering having its own independent slot pool.

**Depends on:** Phase 11. Attempt this only if every prior phase's Definition of Done is genuinely met and tested; do not let this eat into time a `MUST`/`SHOULD` phase needs (Section 6).

**Backend tasks:**
- A `Staff` model per vendor (`id`, `vendorProfileId`, `name`, `isActive`).
- `GET/POST /vendors/me/staff`, `PATCH/DELETE /vendors/me/staff/:id` — vendor manages their own roster, ownership-checked, folded under the existing `vendor.profile.update` permission rather than a new slug.
- `Booking` gains an optional `staffId`; a service's effective capacity becomes a function of how many active staff can cover that window, rather than the flat `AvailabilityRule.capacity` used everywhere else in the system.
- `reserveSlot` (Section 7.5) is extended to reserve a specific staff member, not just a slot — this is the part that actually closes the modelling gap, since two different offerings can now be correctly recognized as competing for the same staff member's time. `staffId` becomes an optional field on `PATCH /bookings/:id/confirm`.

**Endpoints introduced:** `GET/POST /vendors/me/staff`, `PATCH/DELETE /vendors/me/staff/:id`; `staffId` added to `PATCH /bookings/:id/confirm`.

**Frontend tasks:**
- Vendor: manage a small staff roster; optionally assign a staff member when confirming a booking.
- Customer/public: no visible change — this phase is entirely about correctness of the underlying capacity math, not a new user-facing concept.

**Definition of Done:** A vendor with one staff member cannot have two different offerings both confirmed at overlapping times — the scenario Section 7.4 documents as a known simplification everywhere else in the system no longer occurs once staff assignment is in place.

---

## 13. Testing Strategy Summary

Per the brief: "six tests covering the booking state machine, the capacity race and the permission guard are worth more than sixty covering trivial accessors." Required minimum, already called out per-phase above, gathered here for visibility:

1. Booking state machine — every legal transition succeeds, every illegal one is rejected (Phase 7).
2. Capacity race — concurrent requests against one slot yield exactly `capacity` successes (Phase 7).
3. Permission guard — a lower-privileged token on a privileged route → `403` (Phase 3).
4. Ownership isolation — actor A can't reach actor B's resource by id → `403`/`404` (Phase 3, re-verified per resource as it's built).
5. Payment idempotency — replayed `Idempotency-Key` produces exactly one booking and one payment (Phase 8).
6. Auth lifecycle — expired token → `401` + one transparent refresh; logout invalidates the refresh token (Phase 2).

Beyond this floor, add tests where a bug would be expensive and silent (slot derivation math, webhook double-delivery) — skip tests on pure DTOs, trivial getters, or framework wiring.


---

## 14. Final Submission Checklist

Mapped directly to the brief's Section 11 and its scoring table, so this document can be self-graded before submission.

- [ ] Live frontend URL + live API URL, both reachable without VPN/invite/local build
- [ ] Deployed instance runs the seed data — every role signs in immediately on first open
- [ ] Public (or access-granted-private) GitHub repo with genuinely incremental commit history
- [ ] `README.md`: both live URLs at top → seeded credentials → cold-clone setup steps
- [ ] Seed script populates local **and** deployed DB identically
- [ ] `DECISIONS.md`: data model, capacity-race prevention, deliberate omissions, next-week plan
- [ ] API reference (OpenAPI or Postman) pointed at the deployed base URL

| Rubric area | Weight | Where it's built |
|---|---|---|
| Permissions | 20 | Phase 3 |
| Booking integrity | 20 | Phase 6, Phase 7 |
| Payment flow | 15 | Phase 8 |
| Data & API design | 15 | Phase 1, Section 10 |
| Code quality | 15 | Section 2, all phases |
| Delivery | 10 | Phase 0, Phase 11 |
| UI | 5 | Phase 10, Section 11 |

---

## Appendix A — Seed Data Specification

The seed script (finalized in Phase 11, built incrementally from Phase 1 onward) must create exactly this roster. Use obviously-fake but memorable passwords, documented in `README.md`.

**Accounts:**
- 1 `SUPER_ADMIN` — `superadmin@marketplace.test`
- 1 restricted sub-admin on the `CATALOGUE_MODERATOR` role (Section 9) — `moderator@marketplace.test`
- 1 `APPROVED` vendor with ≥2 published services, each with ≥2 offerings, weekly availability rules, and at least one date exception — `vendor.approved@marketplace.test`
- 1 `PENDING` vendor with a submitted profile but no services — `vendor.pending@marketplace.test`
- 2 customers — `customer1@marketplace.test`, `customer2@marketplace.test`

**Bookings in assorted states** (against the approved vendor's services, spread across both customers): at least one each of `PENDING` (unpaid `PAY_NOW`), `CONFIRMED` (`PAY_NOW`, paid), `CONFIRMED` (`PAY_AFTER`, outstanding balance), `COMPLETED`, `REJECTED`, `CANCELLED` (with a `BookingHistory` showing a reschedule before the cancellation, to make the timeline UI demonstrable immediately), and `NO_SHOW`.

**Reference data:** at least 2 top-level categories with 1 sub-category each (proving two-level nesting works).

---

## Appendix B — Endpoint Index (by phase)

Quick lookup, in the order introduced. Full request/response contracts belong in the generated OpenAPI spec (Phase 11), not duplicated here.

**Phase 0:** `GET /health`
**Phase 2:** `POST /auth/signup/customer`, `POST /auth/signup/vendor`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`
**Phase 3:** `GET /permissions`, `GET|POST /roles`, `PATCH|DELETE /roles/:id`, `POST /admin/sub-admins`, `POST /admin/users/:id/role`
**Phase 4:** `PATCH /vendors/me/profile`, `POST /vendors/me/documents`, `GET /vendors/me`, `GET /admin/vendors`, `PATCH /admin/vendors/:id/approve`, `PATCH /admin/vendors/:id/reject`
**Phase 5:** `GET|POST /categories`, `PATCH|DELETE /categories/:id`, `GET|POST /vendors/me/services`, `PATCH|DELETE /services/:id`, `PATCH /services/:id/publish`, `PATCH /services/:id/suspend`, `POST /services/:id/offerings`, `PATCH|DELETE /offerings/:id`, `GET /services`, `GET /services/:id`
**Phase 6:** `POST|DELETE /availability-rules`, `POST|DELETE /availability-exceptions`, `GET /services/:id/slots`, `GET /services/:id/next-available`
**Phase 7:** `POST /bookings`, `GET /bookings/:id`, `GET /bookings`, `GET /vendor/bookings`, `GET /admin/bookings`, `PATCH /bookings/:id/confirm|reject|complete|no-show|cancel|reschedule`
**Phase 8:** `POST /payments/:id/confirm`, `POST /payments/webhook`, `PATCH /bookings/:id/mark-collected`, `POST /admin/payments/:id/refund`
**Phase 9:** `GET /admin/dashboard/summary`, `PATCH /admin/bookings/:id/force-cancel`, `GET /admin/audit-logs` (stretch)
**Phase 12 (stretch):** `GET/POST/PATCH/DELETE /vendors/me/staff`; `staffId` added to the booking confirm payload

---

*End of implementation plan. Build phase by phase, keep the code extremely modular, scalable, and maintainable throughout, and update `DECISIONS.md` continuously rather than reconstructing it from memory at the end.*
