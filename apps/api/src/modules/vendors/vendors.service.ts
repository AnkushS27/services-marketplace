import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateVendorProfileDto,
  UploadVendorDocumentDto,
  QueryVendorsDto,
} from './dto/vendors.dto';
import { VendorStatus } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getVendorProfile(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        documents: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    return profile;
  }

  async updateVendorProfile(userId: string, dto: UpdateVendorProfileDto) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const updated = await this.prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.businessName !== undefined && { businessName: dto.businessName }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
      include: {
        documents: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  async uploadVendorDocument(userId: string, dto: UploadVendorDocumentDto) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const document = await this.prisma.vendorDocument.create({
      data: {
        vendorProfileId: profile.id,
        filename: dto.filename,
        originalName: dto.originalName,
      },
    });

    return document;
  }

  async getVendorsAdmin(query: QueryVendorsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const where = query.status ? { status: query.status } : {};

    const [data, total] = await Promise.all([
      this.prisma.vendorProfile.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendorProfile.count({ where }),
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

  async approveVendor(vendorId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor profile with ID '${vendorId}' not found`);
    }

    const updated = await this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.APPROVED,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        documents: true,
      },
    });

    return updated;
  }

  async rejectVendor(vendorId: string, reason: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor profile with ID '${vendorId}' not found`);
    }

    const updated = await this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.REJECTED,
        rejectionReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        documents: true,
      },
    });

    return updated;
  }

  async assertVendorApproved(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    if (profile.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException(
        `Vendor account status is '${profile.status}'. Only APPROVED vendors can perform this action.`,
      );
    }

    return profile;
  }
}
