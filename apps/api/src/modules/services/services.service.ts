import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  SuspendServiceDto,
  CreateOfferingDto,
  UpdateOfferingDto,
  QueryServicesDto,
} from './dto/services.dto';
import { ServiceStatus, VendorStatus } from '@prisma/client';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVendorProfileForUser(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    return profile;
  }

  private async assertServiceOwnership(serviceId: string, vendorProfileId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || service.vendorProfileId !== vendorProfileId) {
      // 404 per Section 7.3 for ownership mismatches
      throw new NotFoundException(`Service with ID '${serviceId}' not found`);
    }

    return service;
  }

  // --- Vendor Services CRUD ---

  async getMyServices(userId: string) {
    const profile = await this.getVendorProfileForUser(userId);

    return this.prisma.service.findMany({
      where: { vendorProfileId: profile.id },
      include: {
        category: true,
        offerings: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createService(userId: string, dto: CreateServiceDto) {
    const profile = await this.getVendorProfileForUser(userId);

    // Check category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${dto.categoryId}' not found`);
    }

    return this.prisma.service.create({
      data: {
        vendorProfileId: profile.id,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        images: dto.images || [],
        freeCancellationHours: dto.freeCancellationHours ?? 24,
        status: ServiceStatus.DRAFT,
      },
      include: {
        category: true,
        offerings: true,
      },
    });
  }

  async updateService(serviceId: string, userId: string, dto: UpdateServiceDto) {
    const profile = await this.getVendorProfileForUser(userId);
    await this.assertServiceOwnership(serviceId, profile.id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID '${dto.categoryId}' not found`);
      }
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.freeCancellationHours !== undefined && {
          freeCancellationHours: dto.freeCancellationHours,
        }),
      },
      include: {
        category: true,
        offerings: true,
      },
    });
  }

  async deleteService(serviceId: string, userId: string) {
    const profile = await this.getVendorProfileForUser(userId);
    await this.assertServiceOwnership(serviceId, profile.id);

    return this.prisma.service.delete({
      where: { id: serviceId },
    });
  }

  async publishService(serviceId: string, userId: string) {
    const profile = await this.getVendorProfileForUser(userId);
    const service = await this.assertServiceOwnership(serviceId, profile.id);

    // Rule 1: Owning vendor must be APPROVED
    if (profile.status !== VendorStatus.APPROVED) {
      throw new UnprocessableEntityException(
        `Cannot publish service: Vendor account status is '${profile.status}'. Only APPROVED vendors can publish services.`,
      );
    }

    // Rule 2: Service must have ≥ 1 active offering
    const activeOfferingsCount = await this.prisma.offering.count({
      where: {
        serviceId,
        isActive: true,
      },
    });

    if (activeOfferingsCount < 1) {
      throw new UnprocessableEntityException(
        'Cannot publish service: Service must have at least one active offering.',
      );
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        status: ServiceStatus.PUBLISHED,
        suspendedReason: null,
      },
      include: {
        category: true,
        offerings: true,
      },
    });
  }

  async suspendService(serviceId: string, dto: SuspendServiceDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID '${serviceId}' not found`);
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        status: ServiceStatus.SUSPENDED,
        suspendedReason: dto.reason,
      },
      include: {
        category: true,
        offerings: true,
      },
    });
  }

  // --- Offerings Management ---

  async addOffering(serviceId: string, userId: string, dto: CreateOfferingDto) {
    const profile = await this.getVendorProfileForUser(userId);
    await this.assertServiceOwnership(serviceId, profile.id);

    return this.prisma.offering.create({
      data: {
        serviceId,
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        priceMinorUnits: dto.priceMinorUnits,
        isActive: true,
      },
    });
  }

  async updateOffering(offeringId: string, userId: string, dto: UpdateOfferingDto) {
    const profile = await this.getVendorProfileForUser(userId);
    
    const offering = await this.prisma.offering.findUnique({
      where: { id: offeringId },
      include: { service: true },
    });

    if (!offering || offering.service.vendorProfileId !== profile.id) {
      throw new NotFoundException(`Offering with ID '${offeringId}' not found`);
    }

    return this.prisma.offering.update({
      where: { id: offeringId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.priceMinorUnits !== undefined && { priceMinorUnits: dto.priceMinorUnits }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteOffering(offeringId: string, userId: string) {
    const profile = await this.getVendorProfileForUser(userId);

    const offering = await this.prisma.offering.findUnique({
      where: { id: offeringId },
      include: { service: true },
    });

    if (!offering || offering.service.vendorProfileId !== profile.id) {
      throw new NotFoundException(`Offering with ID '${offeringId}' not found`);
    }

    return this.prisma.offering.delete({
      where: { id: offeringId },
    });
  }

  // --- Public Catalogue & Search ---

  async getPublicServices(query: QueryServicesDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: ServiceStatus.PUBLISHED,
      vendorProfile: {
        status: VendorStatus.APPROVED,
      },
    };

    if (query.categoryId) {
      // Find subcategories if any
      const category = await this.prisma.category.findUnique({
        where: { id: query.categoryId },
        include: { children: true },
      });

      if (category) {
        const categoryIds = [category.id, ...category.children.map((c) => c.id)];
        where.categoryId = { in: categoryIds };
      } else {
        where.categoryId = query.categoryId;
      }
    }

    if (query.search) {
      const searchPattern = query.search.trim();
      where.OR = [
        { title: { contains: searchPattern, mode: 'insensitive' } },
        { description: { contains: searchPattern, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          category: true,
          vendorProfile: {
            select: {
              id: true,
              businessName: true,
              address: true,
              timezone: true,
            },
          },
          offerings: {
            where: { isActive: true },
            orderBy: { priceMinorUnits: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getPublicServiceDetail(serviceId: string, currentUser?: CurrentUserPayload) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        category: true,
        vendorProfile: {
          select: {
            id: true,
            userId: true,
            businessName: true,
            contactName: true,
            contactPhone: true,
            address: true,
            timezone: true,
            status: true,
          },
        },
        offerings: {
          where: { isActive: true },
          orderBy: { priceMinorUnits: 'asc' },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID '${serviceId}' not found`);
    }

    const isPublishedAndApproved =
      service.status === ServiceStatus.PUBLISHED &&
      service.vendorProfile.status === VendorStatus.APPROVED;

    if (!isPublishedAndApproved) {
      // Allow access if caller is the owning vendor or an admin
      let isAllowed = false;
      if (currentUser) {
        if (currentUser.userId === service.vendorProfile.userId) {
          isAllowed = true;
        } else {
          const user = await this.prisma.user.findUnique({
            where: { id: currentUser.userId },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          });
          if (
            user &&
            (user.role.bypassChecks ||
              user.role.permissions.some((p) => p.permission.slug === 'service.read.any'))
          ) {
            isAllowed = true;
          }
        }
      }

      if (!isAllowed) {
        // Return 404 per Section 7.3
        throw new NotFoundException(`Service with ID '${serviceId}' not found`);
      }
    }

    return service;
  }
}
