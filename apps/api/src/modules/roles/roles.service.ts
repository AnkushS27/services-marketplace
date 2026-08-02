import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, CreateSubAdminDto, AssignRoleDto } from './dto/roles.dto';
import { PERMISSION_DESCRIPTIONS } from '../../common/constants/permissions';
import { RoleType } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { slug: 'asc' },
    });

    const grouped = permissions.reduce(
      (acc, perm) => {
        const [domain] = perm.slug.split('.');
        if (!acc[domain]) {
          acc[domain] = [];
        }
        acc[domain].push({
          id: perm.id,
          slug: perm.slug,
          description: perm.description || PERMISSION_DESCRIPTIONS[perm.slug as keyof typeof PERMISSION_DESCRIPTIONS] || perm.slug,
        });
        return acc;
      },
      {} as Record<string, Array<{ id: string; slug: string; description: string }>>,
    );

    return {
      all: permissions.map((p) => ({
        id: p.id,
        slug: p.slug,
        description: p.description || PERMISSION_DESCRIPTIONS[p.slug as keyof typeof PERMISSION_DESCRIPTIONS] || p.slug,
      })),
      grouped,
    };
  }

  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      type: role.type,
      bypassChecks: role.bypassChecks,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.slug),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async createRole(dto: CreateRoleDto, requesterUserId: string) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    // Section 7.1: Only an existing bypassChecks role can create another bypassChecks role
    if (dto.bypassChecks) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterUserId },
        include: { role: true },
      });
      if (!requester?.role.bypassChecks) {
        throw new ForbiddenException('Only super admins can create bypassChecks roles');
      }
    }

    // Resolve permission IDs from slugs
    const permissions = await this.prisma.permission.findMany({
      where: { slug: { in: dto.permissionSlugs } },
    });

    return this.prisma.role.create({
      data: {
        name: dto.name,
        type: dto.type,
        bypassChecks: dto.bypassChecks || false,
        isSystem: false,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto, requesterUserId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`Role with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.permissionSlugs !== undefined) {
        // Delete old permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Find target permissions
        const permissions = await tx.permission.findMany({
          where: { slug: { in: dto.permissionSlugs } },
        });

        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.type ? { type: dto.type } : {}),
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }

    if (role._count.users > 0) {
      throw new ConflictException(`Cannot delete role with ${role._count.users} active user(s) assigned`);
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: 'Role deleted successfully' };
  }

  async createSubAdmin(dto: CreateSubAdminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException('Specified role not found');
    }

    if (role.type !== RoleType.ADMIN) {
      throw new BadRequestException('Sub-admin role must be of type ADMIN');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        phone: dto.phone,
        roleId: role.id,
      },
      include: {
        role: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: {
        id: user.role.id,
        name: user.role.name,
        type: user.role.type,
      },
    };
  }

  async assignUserRole(userId: string, dto: AssignRoleDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: {
        id: updatedUser.role.id,
        name: updatedUser.role.name,
        type: updatedUser.role.type,
      },
    };
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
      },
      orderBy: [
        { role: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: {
        id: u.role.id,
        name: u.role.name,
        type: u.role.type,
      },
    }));
  }
}

