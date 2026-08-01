import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionSlug } from '../constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionSlug[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;

    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Always load fresh user role + permissions from DB (Section 7.2 requirement)
    const user = await this.prisma.user.findUnique({
      where: { id: userPayload.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    // Role with bypassChecks === true (e.g. SUPER_ADMIN) bypasses all permission checks
    if (user.role.bypassChecks) {
      return true;
    }

    const userPermissionSlugs = new Set(
      user.role.permissions.map((rp) => rp.permission.slug),
    );

    const hasAllPermissions = requiredPermissions.every((slug) =>
      userPermissionSlugs.has(slug),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
