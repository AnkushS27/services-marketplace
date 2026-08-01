import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const createMockExecutionContext = (userPayload: any): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userPayload,
        }),
      }),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should allow access if no permissions are required for the route', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    const context = createMockExecutionContext({ userId: 'user-1' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no user payload in request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['role.read']);

    const context = createMockExecutionContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow access if role has bypassChecks = true', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['role.delete']);

    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'superadmin-1',
      isActive: true,
      role: {
        id: 'role-super',
        name: 'SUPER_ADMIN',
        bypassChecks: true,
        permissions: [],
      },
    });

    const context = createMockExecutionContext({ userId: 'superadmin-1' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access if user role has all required permissions', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['role.read', 'role.update']);

    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      isActive: true,
      role: {
        id: 'role-admin',
        name: 'ADMIN',
        bypassChecks: false,
        permissions: [
          { permission: { slug: 'role.read' } },
          { permission: { slug: 'role.update' } },
        ],
      },
    });

    const context = createMockExecutionContext({ userId: 'admin-1' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user role lacks required permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['role.delete']);

    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'moderator-1',
      isActive: true,
      role: {
        id: 'role-mod',
        name: 'CATALOGUE_MODERATOR',
        bypassChecks: false,
        permissions: [
          { permission: { slug: 'category.create' } },
          { permission: { slug: 'category.update' } },
        ],
      },
    });

    const context = createMockExecutionContext({ userId: 'moderator-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
