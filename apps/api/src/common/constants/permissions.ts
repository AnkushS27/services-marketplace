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

export const PERMISSION_DESCRIPTIONS: Record<PermissionSlug, string> = {
  [PERMISSIONS.ROLE_CREATE]: 'Create new role definitions',
  [PERMISSIONS.ROLE_READ]: 'Read role definitions and permissions',
  [PERMISSIONS.ROLE_UPDATE]: 'Update existing role definitions',
  [PERMISSIONS.ROLE_DELETE]: 'Delete custom role definitions',
  [PERMISSIONS.ROLE_ASSIGN]: 'Assign roles to users',
  [PERMISSIONS.ADMIN_CREATE]: 'Create admin or sub-admin user accounts',
  [PERMISSIONS.PERMISSION_READ]: 'List permission catalogue',

  [PERMISSIONS.VENDOR_APPROVE]: 'Approve or reject vendor applications',
  [PERMISSIONS.VENDOR_READ_ANY]: 'View any vendor profile',
  [PERMISSIONS.VENDOR_PROFILE_READ]: 'Vendor view own profile',
  [PERMISSIONS.VENDOR_PROFILE_UPDATE]: 'Vendor edit own profile',

  [PERMISSIONS.CATEGORY_CREATE]: 'Create service categories',
  [PERMISSIONS.CATEGORY_UPDATE]: 'Update service categories',
  [PERMISSIONS.CATEGORY_DELETE]: 'Delete service categories',

  [PERMISSIONS.SERVICE_CREATE]: 'Create new services and offerings',
  [PERMISSIONS.SERVICE_UPDATE]: 'Update own services and offerings',
  [PERMISSIONS.SERVICE_DELETE]: 'Delete own services',
  [PERMISSIONS.SERVICE_PUBLISH]: 'Publish own draft service',
  [PERMISSIONS.SERVICE_SUSPEND]: 'Suspend any active service',
  [PERMISSIONS.SERVICE_READ_ANY]: 'Read any service including unpublished',

  [PERMISSIONS.AVAILABILITY_MANAGE]: 'Manage weekly availability and exceptions',

  [PERMISSIONS.BOOKING_CREATE]: 'Create customer booking',
  [PERMISSIONS.BOOKING_READ_OWN]: 'Read customer own bookings',
  [PERMISSIONS.BOOKING_READ_VENDOR]: 'Read vendor service bookings',
  [PERMISSIONS.BOOKING_READ_ANY]: 'Read any booking on platform',
  [PERMISSIONS.BOOKING_CONFIRM]: 'Confirm pending booking',
  [PERMISSIONS.BOOKING_REJECT]: 'Reject pending booking',
  [PERMISSIONS.BOOKING_COMPLETE]: 'Mark booking as completed',
  [PERMISSIONS.BOOKING_NOSHOW]: 'Mark customer as no-show',
  [PERMISSIONS.BOOKING_CANCEL_OWN]: 'Cancel customer own booking',
  [PERMISSIONS.BOOKING_CANCEL_VENDOR]: 'Vendor cancel booking on own service',
  [PERMISSIONS.BOOKING_CANCEL_ANY]: 'Admin force-cancel any booking',
  [PERMISSIONS.BOOKING_RESCHEDULE_OWN]: 'Reschedule customer own booking',

  [PERMISSIONS.PAYMENT_CONFIRM]: 'Confirm booking payment',
  [PERMISSIONS.PAYMENT_MARK_COLLECTED]: 'Mark pay-after booking cash collected',
  [PERMISSIONS.PAYMENT_REFUND]: 'Trigger payment refund',

  [PERMISSIONS.DASHBOARD_READ]: 'Access admin dashboard metrics',
  [PERMISSIONS.AUDIT_READ]: 'Access system audit log',
};
