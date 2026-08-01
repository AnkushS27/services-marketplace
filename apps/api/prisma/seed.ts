import { PrismaClient, RoleType } from '@prisma/client';
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

async function seedUsers() {
  // Stub for Phase 2
}

async function seedVendors() {
  // Stub for Phase 3
}

async function seedCategories() {
  // Stub for Phase 4
}

async function seedServicesAndOfferings() {
  // Stub for Phase 5
}

async function seedAvailability() {
  // Stub for Phase 6
}

async function seedBookings() {
  // Stub for Phase 7
}

async function main() {
  await seedPermissionsAndRoles();
  await seedUsers();
  await seedVendors();
  await seedCategories();
  await seedServicesAndOfferings();
  await seedAvailability();
  await seedBookings();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
