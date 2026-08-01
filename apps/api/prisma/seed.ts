import { PrismaClient, RoleType, VendorStatus, ServiceStatus, BookingStatus, PaymentMode, PaymentStatus, PaymentEventType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../src/common/constants/permissions';

const prisma = new PrismaClient();

async function seedPermissionsAndRoles() {
  console.log('Seeding permissions...');

  const permissionMap = new Map<string, string>();
  for (const slug of Object.values(PERMISSIONS)) {
    const description = PERMISSION_DESCRIPTIONS[slug] || slug;
    const perm = await prisma.permission.upsert({
      where: { slug },
      update: { description },
      create: { slug, description },
    });
    permissionMap.set(slug, perm.id);
  }

  const allPermissionIds = Array.from(permissionMap.values());

  console.log('Seeding system & custom roles...');

  // 1. SUPER_ADMIN (system, bypassChecks = true)
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { type: RoleType.ADMIN, bypassChecks: true, isSystem: true },
    create: { name: 'SUPER_ADMIN', type: RoleType.ADMIN, bypassChecks: true, isSystem: true },
  });

  // 2. ADMIN (system, full non-bypassing admin)
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { type: RoleType.ADMIN, bypassChecks: false, isSystem: true },
    create: { name: 'ADMIN', type: RoleType.ADMIN, bypassChecks: false, isSystem: true },
  });

  for (const permId of allPermissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permId },
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permId } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permId },
    });
  }

  // 3. VENDOR (system)
  const vendorPermissions = [
    PERMISSIONS.VENDOR_PROFILE_READ,
    PERMISSIONS.VENDOR_PROFILE_UPDATE,
    PERMISSIONS.SERVICE_CREATE,
    PERMISSIONS.SERVICE_UPDATE,
    PERMISSIONS.SERVICE_DELETE,
    PERMISSIONS.SERVICE_PUBLISH,
    PERMISSIONS.AVAILABILITY_MANAGE,
    PERMISSIONS.BOOKING_READ_VENDOR,
    PERMISSIONS.BOOKING_CONFIRM,
    PERMISSIONS.BOOKING_REJECT,
    PERMISSIONS.BOOKING_COMPLETE,
    PERMISSIONS.BOOKING_NOSHOW,
    PERMISSIONS.BOOKING_CANCEL_VENDOR,
    PERMISSIONS.PAYMENT_MARK_COLLECTED,
  ];

  const vendorRole = await prisma.role.upsert({
    where: { name: 'VENDOR' },
    update: { type: RoleType.VENDOR, bypassChecks: false, isSystem: true },
    create: { name: 'VENDOR', type: RoleType.VENDOR, bypassChecks: false, isSystem: true },
  });

  for (const slug of vendorPermissions) {
    const permId = permissionMap.get(slug);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: vendorRole.id, permissionId: permId } },
        update: {},
        create: { roleId: vendorRole.id, permissionId: permId },
      });
    }
  }

  // 4. CUSTOMER (system)
  const customerPermissions = [
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ_OWN,
    PERMISSIONS.BOOKING_CANCEL_OWN,
    PERMISSIONS.BOOKING_RESCHEDULE_OWN,
    PERMISSIONS.PAYMENT_CONFIRM,
  ];

  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: { type: RoleType.CUSTOMER, bypassChecks: false, isSystem: true },
    create: { name: 'CUSTOMER', type: RoleType.CUSTOMER, bypassChecks: false, isSystem: true },
  });

  for (const slug of customerPermissions) {
    const permId = permissionMap.get(slug);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: customerRole.id, permissionId: permId } },
        update: {},
        create: { roleId: customerRole.id, permissionId: permId },
      });
    }
  }

  // 5. CATALOGUE_MODERATOR (custom role, isSystem = false)
  const moderatorPermissions = [
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_UPDATE,
    PERMISSIONS.CATEGORY_DELETE,
    PERMISSIONS.SERVICE_SUSPEND,
  ];

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'CATALOGUE_MODERATOR' },
    update: { type: RoleType.ADMIN, bypassChecks: false, isSystem: false },
    create: { name: 'CATALOGUE_MODERATOR', type: RoleType.ADMIN, bypassChecks: false, isSystem: false },
  });

  for (const slug of moderatorPermissions) {
    const permId = permissionMap.get(slug);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: moderatorRole.id, permissionId: permId } },
        update: {},
        create: { roleId: moderatorRole.id, permissionId: permId },
      });
    }
  }

  console.log('Successfully seeded permissions and roles.');
}

async function seedUsersAndVendors() {
  console.log('Seeding users and vendors...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });
  const moderatorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CATALOGUE_MODERATOR' } });
  const vendorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'VENDOR' } });
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });

  // 1. SUPER_ADMIN user
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@marketplace.test' },
    update: { name: 'Super Admin', roleId: superAdminRole.id },
    create: {
      email: 'superadmin@marketplace.test',
      passwordHash,
      name: 'Super Admin',
      roleId: superAdminRole.id,
    },
  });

  // 2. Sub-admin moderator
  const moderatorUser = await prisma.user.upsert({
    where: { email: 'moderator@marketplace.test' },
    update: { name: 'Catalogue Moderator', roleId: moderatorRole.id },
    create: {
      email: 'moderator@marketplace.test',
      passwordHash,
      name: 'Catalogue Moderator',
      roleId: moderatorRole.id,
    },
  });

  // 3. APPROVED Vendor
  const approvedVendorUser = await prisma.user.upsert({
    where: { email: 'vendor.approved@marketplace.test' },
    update: { name: 'Alex Approved', roleId: vendorRole.id },
    create: {
      email: 'vendor.approved@marketplace.test',
      passwordHash,
      name: 'Alex Approved',
      roleId: vendorRole.id,
    },
  });

  const approvedVendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: approvedVendorUser.id },
    update: { status: VendorStatus.APPROVED, approvedAt: new Date() },
    create: {
      userId: approvedVendorUser.id,
      businessName: 'Elite Home & Beauty Services',
      contactName: 'Alex Approved',
      contactPhone: '+15550001111',
      address: '123 Main Street, Suite 100',
      timezone: 'Asia/Kolkata',
      status: VendorStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  // Seed Staff for Approved Vendor
  await prisma.staff.upsert({
    where: { id: 'staff-alex-1' },
    update: { name: 'John Specialist', isActive: true },
    create: {
      id: 'staff-alex-1',
      vendorProfileId: approvedVendorProfile.id,
      name: 'John Specialist',
      isActive: true,
    },
  });

  await prisma.staff.upsert({
    where: { id: 'staff-alex-2' },
    update: { name: 'Sarah Senior Stylist', isActive: true },
    create: {
      id: 'staff-alex-2',
      vendorProfileId: approvedVendorProfile.id,
      name: 'Sarah Senior Stylist',
      isActive: true,
    },
  });

  // 4. PENDING Vendor
  const pendingVendorUser = await prisma.user.upsert({
    where: { email: 'vendor.pending@marketplace.test' },
    update: { name: 'Peter Pending', roleId: vendorRole.id },
    create: {
      email: 'vendor.pending@marketplace.test',
      passwordHash,
      name: 'Peter Pending',
      roleId: vendorRole.id,
    },
  });

  await prisma.vendorProfile.upsert({
    where: { userId: pendingVendorUser.id },
    update: { status: VendorStatus.PENDING },
    create: {
      userId: pendingVendorUser.id,
      businessName: 'Pending Services Co',
      contactName: 'Peter Pending',
      contactPhone: '+15550002222',
      address: '456 Oak Avenue',
      timezone: 'Asia/Kolkata',
      status: VendorStatus.PENDING,
    },
  });

  // 5. Customers
  const customer1 = await prisma.user.upsert({
    where: { email: 'customer1@marketplace.test' },
    update: { name: 'Charlie Customer 1', roleId: customerRole.id },
    create: {
      email: 'customer1@marketplace.test',
      passwordHash,
      name: 'Charlie Customer 1',
      roleId: customerRole.id,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer2@marketplace.test' },
    update: { name: 'Chloe Customer 2', roleId: customerRole.id },
    create: {
      email: 'customer2@marketplace.test',
      passwordHash,
      name: 'Chloe Customer 2',
      roleId: customerRole.id,
    },
  });

  console.log('Successfully seeded users, vendors, and staff.');
  return { approvedVendorProfile, approvedVendorUser, customer1, customer2, superAdminUser };
}

async function seedCategories() {
  console.log('Seeding categories...');

  // Top level 1
  const homeCat = await prisma.category.upsert({
    where: { slug: 'home-services' },
    update: { name: 'Home Services' },
    create: { name: 'Home Services', slug: 'home-services' },
  });

  // Sub 1
  const plumbingSub = await prisma.category.upsert({
    where: { slug: 'plumbing' },
    update: { name: 'Plumbing Services', parentId: homeCat.id },
    create: { name: 'Plumbing Services', slug: 'plumbing', parentId: homeCat.id },
  });

  // Top level 2
  const beautyCat = await prisma.category.upsert({
    where: { slug: 'beauty-wellness' },
    update: { name: 'Beauty & Wellness' },
    create: { name: 'Beauty & Wellness', slug: 'beauty-wellness' },
  });

  // Sub 2
  const hairSub = await prisma.category.upsert({
    where: { slug: 'hair-styling' },
    update: { name: 'Hair & Styling', parentId: beautyCat.id },
    create: { name: 'Hair & Styling', slug: 'hair-styling', parentId: beautyCat.id },
  });

  console.log('Successfully seeded categories.');
  return { plumbingSub, hairSub };
}

async function seedServicesAndOfferings(vendorProfileId: string, plumbingSubId: string, hairSubId: string) {
  console.log('Seeding services and offerings...');

  // Service 1: Plumbing
  let service1 = await prisma.service.findFirst({
    where: { vendorProfileId, title: 'Professional Plumbing & Leak Repair' },
  });

  if (!service1) {
    service1 = await prisma.service.create({
      data: {
        vendorProfileId,
        categoryId: plumbingSubId,
        title: 'Professional Plumbing & Leak Repair',
        description: 'Complete plumbing inspection, pipe repair, fixture installation, and emergency leak fixes.',
        images: ['plumbing-1.jpg', 'plumbing-2.jpg'],
        status: ServiceStatus.PUBLISHED,
        freeCancellationHours: 24,
        offerings: {
          create: [
            {
              name: 'Standard Pipe & Leak Repair',
              durationMinutes: 30,
              priceMinorUnits: 50000, // ₹500
            },
            {
              name: 'Full Bathroom Inspection & Maintenance',
              durationMinutes: 60,
              priceMinorUnits: 120000, // ₹1200
            },
          ],
        },
      },
    });
  }

  // Service 2: Hair & Styling
  let service2 = await prisma.service.findFirst({
    where: { vendorProfileId, title: 'Executive Hair & Beard Styling' },
  });

  if (!service2) {
    service2 = await prisma.service.create({
      data: {
        vendorProfileId,
        categoryId: hairSubId,
        title: 'Executive Hair & Beard Styling',
        description: 'Premium haircut, hair coloring, beard trim, and relaxing facial treatment.',
        images: ['hair-1.jpg', 'hair-2.jpg'],
        status: ServiceStatus.PUBLISHED,
        freeCancellationHours: 24,
        offerings: {
          create: [
            {
              name: 'Executive Haircut & Wash',
              durationMinutes: 45,
              priceMinorUnits: 80000, // ₹800
            },
            {
              name: 'Beard Grooming & Trim',
              durationMinutes: 30,
              priceMinorUnits: 40000, // ₹400
            },
          ],
        },
      },
    });
  }

  console.log('Successfully seeded services and offerings.');
  return { service1, service2 };
}

async function seedAvailability(service1Id: string, service2Id: string) {
  console.log('Seeding availability rules and exceptions...');

  // Service 1 Rules (Mon - Fri: 09:00 - 17:00, capacity 2)
  for (let weekday = 1; weekday <= 5; weekday++) {
    const existing = await prisma.availabilityRule.findFirst({
      where: { serviceId: service1Id, weekday },
    });
    if (!existing) {
      await prisma.availabilityRule.create({
        data: {
          serviceId: service1Id,
          weekday,
          startMinute: 540,  // 09:00
          endMinute: 1020,   // 17:00
          capacity: 2,
        },
      });
    }
  }

  // Service 1 Exception (Next Wednesday closed)
  const nextWed = new Date();
  nextWed.setDate(nextWed.getDate() + ((3 + 7 - nextWed.getDay()) % 7 || 7));
  nextWed.setUTCHours(0, 0, 0, 0);

  const existingExc1 = await prisma.availabilityException.findFirst({
    where: { serviceId: service1Id, date: nextWed },
  });
  if (!existingExc1) {
    await prisma.availabilityException.create({
      data: {
        serviceId: service1Id,
        date: nextWed,
        isClosed: true,
      },
    });
  }

  // Service 2 Rules (Tue - Sat: 10:00 - 18:00, capacity 3)
  for (let weekday = 2; weekday <= 6; weekday++) {
    const existing = await prisma.availabilityRule.findFirst({
      where: { serviceId: service2Id, weekday },
    });
    if (!existing) {
      await prisma.availabilityRule.create({
        data: {
          serviceId: service2Id,
          weekday,
          startMinute: 600,  // 10:00
          endMinute: 1080,   // 18:00
          capacity: 3,
        },
      });
    }
  }

  console.log('Successfully seeded availability.');
}

async function seedBookings(
  customer1Id: string,
  customer2Id: string,
  vendorUserId: string,
  service1: any,
  service2: any,
  superAdminId: string,
) {
  console.log('Seeding bookings across all states...');

  const offerings1 = await prisma.offering.findMany({ where: { serviceId: service1.id } });
  const offerings2 = await prisma.offering.findMany({ where: { serviceId: service2.id } });

  const off1 = offerings1[0];
  const off2 = offerings1[1] || offerings1[0];
  const off3 = offerings2[0];

  const now = new Date();

  // Helper for dates relative to today
  const futureDate1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureDate2 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const pastDate1 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const pastDate2 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. PENDING (PAY_NOW, unpaid)
  const b1 = await prisma.booking.create({
    data: {
      customerId: customer1Id,
      serviceId: service1.id,
      offeringId: off1.id,
      slotStart: futureDate1,
      slotEnd: new Date(futureDate1.getTime() + off1.durationMinutes * 60 * 1000),
      status: BookingStatus.PENDING,
      priceMinorUnits: off1.priceMinorUnits,
      paymentMode: PaymentMode.PAY_NOW,
      history: {
        create: {
          fromStatus: null,
          toStatus: BookingStatus.PENDING,
          actorUserId: customer1Id,
          reason: 'Initial booking creation',
        },
      },
      payment: {
        create: {
          amountMinorUnits: off1.priceMinorUnits,
          providerRef: `mock_ref_b1_${Date.now()}`,
          status: PaymentStatus.INITIATED,
          events: {
            create: {
              type: PaymentEventType.INITIATED,
              metadata: { note: 'Payment initiated' },
            },
          },
        },
      },
    },
  });

  // 2. CONFIRMED (PAY_NOW, paid)
  const b2 = await prisma.booking.create({
    data: {
      customerId: customer1Id,
      serviceId: service1.id,
      offeringId: off2.id,
      slotStart: futureDate2,
      slotEnd: new Date(futureDate2.getTime() + off2.durationMinutes * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      priceMinorUnits: off2.priceMinorUnits,
      paymentMode: PaymentMode.PAY_NOW,
      history: {
        createMany: {
          data: [
            {
              fromStatus: null,
              toStatus: BookingStatus.PENDING,
              actorUserId: customer1Id,
              reason: 'Booking requested',
            },
            {
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CONFIRMED,
              actorUserId: vendorUserId,
              reason: 'Vendor confirmed booking after payment',
            },
          ],
        },
      },
      payment: {
        create: {
          amountMinorUnits: off2.priceMinorUnits,
          providerRef: `mock_ref_b2_${Date.now()}`,
          status: PaymentStatus.SUCCESS,
          events: {
            createMany: {
              data: [
                { type: PaymentEventType.INITIATED },
                { type: PaymentEventType.SUCCESS },
              ],
            },
          },
        },
      },
    },
  });

  // 3. CONFIRMED (PAY_AFTER, outstanding balance)
  const b3 = await prisma.booking.create({
    data: {
      customerId: customer2Id,
      serviceId: service2.id,
      offeringId: off3.id,
      slotStart: futureDate1,
      slotEnd: new Date(futureDate1.getTime() + off3.durationMinutes * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      priceMinorUnits: off3.priceMinorUnits,
      paymentMode: PaymentMode.PAY_AFTER,
      history: {
        createMany: {
          data: [
            {
              fromStatus: null,
              toStatus: BookingStatus.PENDING,
              actorUserId: customer2Id,
              reason: 'Pay after booking requested',
            },
            {
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CONFIRMED,
              actorUserId: vendorUserId,
              reason: 'Vendor accepted pay after booking',
            },
          ],
        },
      },
    },
  });

  // 4. COMPLETED (PAY_AFTER, cash collected)
  const b4 = await prisma.booking.create({
    data: {
      customerId: customer2Id,
      serviceId: service1.id,
      offeringId: off1.id,
      slotStart: pastDate1,
      slotEnd: new Date(pastDate1.getTime() + off1.durationMinutes * 60 * 1000),
      status: BookingStatus.COMPLETED,
      priceMinorUnits: off1.priceMinorUnits,
      paymentMode: PaymentMode.PAY_AFTER,
      history: {
        createMany: {
          data: [
            { fromStatus: null, toStatus: BookingStatus.PENDING, actorUserId: customer2Id },
            { fromStatus: BookingStatus.PENDING, toStatus: BookingStatus.CONFIRMED, actorUserId: vendorUserId },
            { fromStatus: BookingStatus.CONFIRMED, toStatus: BookingStatus.COMPLETED, actorUserId: vendorUserId, reason: 'Service fulfilled successfully' },
          ],
        },
      },
      payment: {
        create: {
          amountMinorUnits: off1.priceMinorUnits,
          providerRef: `cash_${Date.now()}`,
          status: PaymentStatus.SUCCESS,
          events: {
            create: { type: PaymentEventType.SUCCESS, metadata: { note: 'Cash collected by vendor' } },
          },
        },
      },
    },
  });

  // 5. REJECTED
  const b5 = await prisma.booking.create({
    data: {
      customerId: customer1Id,
      serviceId: service2.id,
      offeringId: off3.id,
      slotStart: futureDate2,
      slotEnd: new Date(futureDate2.getTime() + off3.durationMinutes * 60 * 1000),
      status: BookingStatus.REJECTED,
      priceMinorUnits: off3.priceMinorUnits,
      paymentMode: PaymentMode.PAY_AFTER,
      history: {
        createMany: {
          data: [
            { fromStatus: null, toStatus: BookingStatus.PENDING, actorUserId: customer1Id },
            { fromStatus: BookingStatus.PENDING, toStatus: BookingStatus.REJECTED, actorUserId: vendorUserId, reason: 'Vendor schedule conflict' },
          ],
        },
      },
    },
  });

  // 6. CANCELLED (with history showing reschedule BEFORE cancellation)
  const b6 = await prisma.booking.create({
    data: {
      customerId: customer1Id,
      serviceId: service1.id,
      offeringId: off1.id,
      slotStart: futureDate2,
      slotEnd: new Date(futureDate2.getTime() + off1.durationMinutes * 60 * 1000),
      status: BookingStatus.CANCELLED,
      priceMinorUnits: off1.priceMinorUnits,
      paymentMode: PaymentMode.PAY_NOW,
      cancellationReason: 'Customer plans changed',
      history: {
        createMany: {
          data: [
            { fromStatus: null, toStatus: BookingStatus.PENDING, actorUserId: customer1Id, reason: 'Booking created' },
            {
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.PENDING,
              actorUserId: customer1Id,
              reason: 'Customer rescheduled slot',
              metadata: { oldSlotStart: futureDate1.toISOString(), newSlotStart: futureDate2.toISOString() },
            },
            {
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CANCELLED,
              actorUserId: customer1Id,
              reason: 'Customer cancelled booking',
            },
          ],
        },
      },
      payment: {
        create: {
          amountMinorUnits: off1.priceMinorUnits,
          providerRef: `mock_ref_b6_${Date.now()}`,
          status: PaymentStatus.REFUNDED,
          events: {
            createMany: {
              data: [
                { type: PaymentEventType.INITIATED },
                { type: PaymentEventType.SUCCESS },
                { type: PaymentEventType.REFUNDED, metadata: { reason: 'Booking cancelled' } },
              ],
            },
          },
        },
      },
    },
  });

  // 7. NO_SHOW
  const b7 = await prisma.booking.create({
    data: {
      customerId: customer2Id,
      serviceId: service2.id,
      offeringId: off3.id,
      slotStart: pastDate2,
      slotEnd: new Date(pastDate2.getTime() + off3.durationMinutes * 60 * 1000),
      status: BookingStatus.NO_SHOW,
      priceMinorUnits: off3.priceMinorUnits,
      paymentMode: PaymentMode.PAY_AFTER,
      history: {
        createMany: {
          data: [
            { fromStatus: null, toStatus: BookingStatus.PENDING, actorUserId: customer2Id },
            { fromStatus: BookingStatus.PENDING, toStatus: BookingStatus.CONFIRMED, actorUserId: vendorUserId },
            { fromStatus: BookingStatus.CONFIRMED, toStatus: BookingStatus.NO_SHOW, actorUserId: vendorUserId, reason: 'Customer did not show up' },
          ],
        },
      },
    },
  });

  console.log('Successfully seeded all booking states.');
}

async function main() {
  await seedPermissionsAndRoles();
  const { approvedVendorProfile, approvedVendorUser, customer1, customer2, superAdminUser } = await seedUsersAndVendors();
  const { plumbingSub, hairSub } = await seedCategories();
  const { service1, service2 } = await seedServicesAndOfferings(
    approvedVendorProfile.id,
    plumbingSub.id,
    hairSub.id,
  );
  await seedAvailability(service1.id, service2.id);
  await seedBookings(customer1.id, customer2.id, approvedVendorUser.id, service1, service2, superAdminUser.id);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
