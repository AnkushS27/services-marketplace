import { NotFoundException } from '@nestjs/common';
import { PermissionSlug } from '../constants/permissions';

export interface RequesterInfo {
  userId: string;
  bypassChecks?: boolean;
  userPermissions?: string[];
}

export function assertOwnedOrAny(
  resourceOwnerId: string,
  requester: RequesterInfo,
  anyPermissionSlug: PermissionSlug,
): void {
  if (requester.bypassChecks) {
    return;
  }

  if (requester.userPermissions?.includes(anyPermissionSlug)) {
    return;
  }

  if (resourceOwnerId === requester.userId) {
    return;
  }

  // Section 7.3: Ownership failures return 404 to avoid leaking resource existence
  throw new NotFoundException('Resource not found');
}
