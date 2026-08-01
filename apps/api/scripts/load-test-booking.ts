import { PrismaClient, BookingStatus, PaymentMode, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Concurrency Proof Script for Phase 7 (M6)
 * Demonstrates advisory transaction locks preventing overbooking when
 * 20 concurrent booking requests hit a slot with capacity 3.
 */
async function runLoadTest() {
  const prisma = new PrismaClient();
  await prisma.$connect();

  console.log('--- Phase 7 Concurrency Load Test ---');

  try {
    // 1. Ensure required Roles exist
    const customerRole = await prisma.role.findFirst({
      where: { name: 'CUSTOMER' },
    });

    const vendorRole = await prisma.role.findFirst({
      where: { name: 'VENDOR' },
    });

    if (!customerRole || !vendorRole) {
      console.error('Error: System roles missing. Please run `pnpm seed` first.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 2. Ensure test Customer user exists
    let customer = await prisma.user.findFirst({
      where: { email: 'customer1@marketplace.test' },
    });

    if (!customer) {
      console.log('Creating test customer: customer1@marketplace.test');
      customer = await prisma.user.create({
        data: {
          email: 'customer1@marketplace.test',
          passwordHash,
          name: 'Test Customer 1',
          roleId: customerRole.id,
        },
      });
    }

    // 3. Ensure test Approved Vendor & Service exist
    let vendorUser = await prisma.user.findFirst({
      where: { email: 'vendor.approved@marketplace.test' },
    });

    if (!vendorUser) {
      console.log('Creating test vendor user: vendor.approved@marketplace.test');
      vendorUser = await prisma.user.create({
        data: {
          email: 'vendor.approved@marketplace.test',
          passwordHash,
          name: 'Approved Vendor Owner',
          roleId: vendorRole.id,
        },
      });
    }

    let vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: vendorUser.id },
    });

    if (!vendorProfile) {
      console.log('Creating test vendor profile...');
      vendorProfile = await prisma.vendorProfile.create({
        data: {
          userId: vendorUser.id,
          businessName: 'Sparkle Clean Services',
          contactName: 'Approved Vendor Owner',
          contactPhone: '+1999888777',
          address: '123 Market Street',
          timezone: 'Asia/Kolkata',
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });
    } else if (vendorProfile.status !== 'APPROVED') {
      vendorProfile = await prisma.vendorProfile.update({
        where: { id: vendorProfile.id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
    }

    // Ensure Category
    let category = await prisma.category.findFirst({
      where: { slug: 'home-cleaning' },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Home Cleaning',
          slug: 'home-cleaning',
        },
      });
    }

    // Ensure Service
    let service = await prisma.service.findFirst({
      where: {
        vendorProfileId: vendorProfile.id,
        status: 'PUBLISHED',
      },
      include: {
        offerings: { where: { isActive: true } },
      },
    });

    if (!service) {
      console.log('Creating published test service...');
      service = await prisma.service.create({
        data: {
          vendorProfileId: vendorProfile.id,
          categoryId: category.id,
          title: 'Deep Home Sanitization',
          description: 'Comprehensive home deep cleaning and sanitization package.',
          status: 'PUBLISHED',
          freeCancellationHours: 24,
          images: [],
          offerings: {
            create: [
              {
                name: 'Full Home Package',
                durationMinutes: 60,
                priceMinorUnits: 499900,
                isActive: true,
              },
            ],
          },
        },
        include: {
          offerings: { where: { isActive: true } },
        },
      });
    }

    const offering = service.offerings[0];

    // Target a slot in the future (7 days out at 10:00 AM)
    const targetSlotStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    targetSlotStart.setHours(10, 0, 0, 0);

    const weekday = targetSlotStart.getDay() % 7;
    const startMinute = targetSlotStart.getHours() * 60;
    const endMinute = startMinute + offering.durationMinutes;

    // Configure exact capacity = 3 for this test
    await prisma.availabilityRule.deleteMany({
      where: {
        serviceId: service.id,
        weekday,
        startMinute,
      },
    });

    await prisma.availabilityRule.create({
      data: {
        serviceId: service.id,
        weekday,
        startMinute,
        endMinute,
        capacity: 3,
      },
    });

    // Clean up any existing bookings for this target slot
    await prisma.booking.deleteMany({
      where: {
        serviceId: service.id,
        offeringId: offering.id,
        slotStart: targetSlotStart,
      },
    });

    console.log(`Targeting Service: "${service.title}"`);
    console.log(`Targeting Offering: "${offering.name}"`);
    console.log(`Target Slot: ${targetSlotStart.toISOString()}`);
    console.log(`Slot Capacity Configured: 3`);
    console.log(`Dispatching 20 simultaneous POST /bookings requests...\n`);

    const apiUrl = process.env.API_URL || 'http://localhost:4000';

    // Authenticate as customer1@marketplace.test
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer1@marketplace.test',
        password: 'Password123!',
      }),
    });

    const loginData = await loginRes.json();
    const accessToken = loginData.data?.accessToken;

    if (!accessToken) {
      console.error('Failed to log in as customer1@marketplace.test. Response:', loginData);
      process.exit(1);
    }

    // Fire 20 requests concurrently using Promise.all
    const requests = Array.from({ length: 20 }, (_, i) =>
      fetch(`${apiUrl}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          serviceId: service.id,
          offeringId: offering.id,
          slotStart: targetSlotStart.toISOString(),
          paymentMode: PaymentMode.PAY_AFTER,
        }),
      }).then(async (res) => ({
        index: i + 1,
        status: res.status,
        body: await res.json(),
      })),
    );

    const results = await Promise.all(requests);

    let successCount = 0;
    let conflictCount = 0;
    let otherCount = 0;

    results.forEach((r) => {
      if (r.status === 201) {
        successCount++;
        console.log(`Request #${r.index}: HTTP 201 Created (Booking ID: ${r.body.data?.id})`);
      } else if (r.status === 409) {
        conflictCount++;
        console.log(`Request #${r.index}: HTTP 409 Conflict - ${r.body.error?.message}`);
      } else {
        otherCount++;
        console.log(`Request #${r.index}: HTTP ${r.status} - ${JSON.stringify(r.body)}`);
      }
    });

    console.log('\n--- CONCURRENCY TEST SUMMARY ---');
    console.log(`Total Requests: ${results.length}`);
    console.log(`Successful Bookings (HTTP 201): ${successCount}`);
    console.log(`Capacity Exceeded Conflicts (HTTP 409): ${conflictCount}`);
    console.log(`Other Statuses: ${otherCount}`);

    if (successCount === 3 && conflictCount === 17) {
      console.log('\n✅ PASSED: Advisory lock prevented overbooking under concurrent load!');
    } else {
      console.log(`\n❌ FAILED: Expected 3 successes and 17 conflicts, got ${successCount} successes.`);
    }
  } catch (err: any) {
    console.error('Execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runLoadTest();
