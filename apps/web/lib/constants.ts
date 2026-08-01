export const PERMISSIONS = {
  // Role & Admin management
  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN: 'role.assign',
  ADMIN_CREATE: 'admin.create',
  PERMISSION_READ: 'permission.read',

  // Vendor profile & management
  VENDOR_APPROVE: 'vendor.approve',
  VENDOR_READ_ANY: 'vendor.read.any',
  VENDOR_PROFILE_READ: 'vendor.profile.read',
  VENDOR_PROFILE_UPDATE: 'vendor.profile.update',

  // Categories
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',

  // Services & Offerings
  SERVICE_CREATE: 'service.create',
  SERVICE_UPDATE: 'service.update',
  SERVICE_DELETE: 'service.delete',
  SERVICE_PUBLISH: 'service.publish',
  SERVICE_SUSPEND: 'service.suspend',
  SERVICE_READ_ANY: 'service.read.any',

  // Availability
  AVAILABILITY_MANAGE: 'availability.manage',

  // Bookings
  BOOKING_CREATE: 'booking.create',
  BOOKING_READ_OWN: 'booking.read.own',
  BOOKING_READ_VENDOR: 'booking.read.vendor',
  BOOKING_READ_ANY: 'booking.read.any',
  BOOKING_CONFIRM: 'booking.confirm',
  BOOKING_REJECT: 'booking.reject',
  BOOKING_COMPLETE: 'booking.complete',
  BOOKING_NOSHOW: 'booking.noshow',
  BOOKING_CANCEL_OWN: 'booking.cancel.own',
  BOOKING_CANCEL_VENDOR: 'booking.cancel.vendor',
  BOOKING_CANCEL_ANY: 'booking.cancel.any',
  BOOKING_RESCHEDULE_OWN: 'booking.reschedule.own',

  // Payments
  PAYMENT_CONFIRM: 'payment.confirm',
  PAYMENT_MARK_COLLECTED: 'payment.markCollected',
  PAYMENT_REFUND: 'payment.refund',

  // Admin Dashboard & Audit
  DASHBOARD_READ: 'dashboard.read',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
