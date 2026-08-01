import { SetMetadata } from '@nestjs/common';
import { PermissionSlug } from '../constants/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionSlug[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
