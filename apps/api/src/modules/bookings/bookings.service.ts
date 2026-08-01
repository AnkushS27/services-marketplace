import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBookingDto,
  QueryBookingsDto,
  CancelBookingDto,
  RejectBookingDto,
  RescheduleBookingDto,
} from './dto/bookings.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { BookingStatus, PaymentMode, PaymentStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to derive slot capacity and validate rules outside of transaction lock
   */
  async validateAndGetSlotCapacity(
    serviceId: string,
    offeringId: string,
    slotStart: Date,
    slotEnd: Date,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        vendorProfile: true,
        offerings: true,
        availabilityRules: true,
        availabilityExceptions: true,
      },
    });

    if (!service || service.status !== 'PUBLISHED') {
      throw new BadRequestException('Service is not available for booking');
    }

    if (!service.vendorProfile || service.vendorProfile.status !== 'APPROVED') {
      throw new BadRequestException('Service vendor is not approved');
    }

    const offering = service.offerings.find((o) => o.id === offeringId);
    if (!offering || !offering.isActive) {
      throw new BadRequestException('Service offering is not active or invalid');
    }

    // Check past time against server time
    const now = new Date();
    if (slotStart.getTime() <= now.getTime()) {
      throw new BadRequestException('Cannot book a time slot in the past');
    }

    // Verify slotEnd matches calculated duration
    const expectedEndMs = slotStart.getTime() + offering.durationMinutes * 60 * 1000;
    if (slotEnd.getTime() !== expectedEndMs) {
      throw new BadRequestException('Invalid slot end time for offering duration');
    }

    // Derive capacity for slotStart in vendor timezone
    const vendorTz = service.vendorProfile.timezone || 'Asia/Kolkata';
    const slotStartDt = DateTime.fromJSDate(slotStart, { zone: vendorTz });
    const slotDateStr = slotStartDt.toISODate(); // YYYY-MM-DD
    const startMinute = slotStartDt.hour * 60 + slotStartDt.minute;

    let slotCapacity = 0;

    // Check date exceptions first
    const matchingException = service.availabilityExceptions.find((exc) => {
      const excDt = DateTime.fromJSDate(exc.date, { zone: 'utc' });
      return excDt.toISODate() === slotDateStr;
    });

    if (matchingException) {
      if (
        !matchingException.isClosed &&
        matchingException.startMinute !== null &&
        matchingException.endMinute !== null &&
        matchingException.capacity !== null
      ) {
        if (
          startMinute >= matchingException.startMinute &&
          startMinute + offering.durationMinutes <= matchingException.endMinute
        ) {
          slotCapacity = matchingException.capacity;
        }
      }
    } else {
      // Check base weekly rules
      const weekday = slotStartDt.weekday % 7; // 0=Sun .. 6=Sat
      const matchingRule = service.availabilityRules.find((rule) => {
        return (
          rule.weekday === weekday &&
          startMinute >= rule.startMinute &&
          startMinute + offering.durationMinutes <= rule.endMinute
        );
      });
      if (matchingRule) {
        slotCapacity = matchingRule.capacity;
      }
    }

    if (slotCapacity <= 0) {
      throw new BadRequestException('Selected time slot is not open for booking');
    }

    return { service, offering, slotCapacity };
  }

  /**
   * Capacity reservation helper with advisory locking
   * Serializes concurrent attempts on the exact (serviceId, offeringId, slotStart) tuple.
   */
  async reserveSlot(
    tx: Prisma.TransactionClient,
    params: {
      serviceId: string;
      offeringId: string;
      slotStart: Date;
      slotEnd: Date;
      slotCapacity?: number;
      excludeBookingId?: string;
    },
  ) {
    const lockKey = `${params.serviceId}:${params.offeringId}:${params.slotStart.toISOString()}`;

    // 1. Acquire transaction-level advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    let capacity = params.slotCapacity;
    if (capacity === undefined) {
      const derived = await this.validateAndGetSlotCapacity(
        params.serviceId,
        params.offeringId,
        params.slotStart,
        params.slotEnd,
      );
      capacity = derived.slotCapacity;
    }

    // 2. Count existing bookings in PENDING, CONFIRMED, COMPLETED under advisory lock
    const activeCount = await tx.booking.count({
      where: {
        serviceId: params.serviceId,
        offeringId: params.offeringId,
        slotStart: params.slotStart,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        ...(params.excludeBookingId ? { id: { not: params.excludeBookingId } } : {}),
      },
    });

    // 3. Verify capacity limit
    if (activeCount >= capacity) {
      throw new ConflictException('Selected slot capacity has been reached');
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    const slotStart = new Date(dto.slotStart);
    if (isNaN(slotStart.getTime())) {
      throw new BadRequestException('Invalid slotStart ISO date format');
    }

    const offering = await this.prisma.offering.findUnique({
      where: { id: dto.offeringId },
    });

    if (!offering || !offering.isActive) {
      throw new BadRequestException('Offering not found or inactive');
    }

    const slotEnd = new Date(slotStart.getTime() + offering.durationMinutes * 60 * 1000);

    // Pre-validate slot capacity outside transaction lock to make transaction hyper-fast
    const { slotCapacity } = await this.validateAndGetSlotCapacity(
      dto.serviceId,
      dto.offeringId,
      slotStart,
      slotEnd,
    );

    return this.prisma.$transaction(
      async (tx) => {
        // Reserve capacity with advisory lock
        await this.reserveSlot(tx, {
          serviceId: dto.serviceId,
          offeringId: dto.offeringId,
          slotStart,
          slotEnd,
          slotCapacity,
        });

        // Create Booking
        const booking = await tx.booking.create({
          data: {
            customerId: userId,
            serviceId: dto.serviceId,
            offeringId: dto.offeringId,
            slotStart,
            slotEnd,
            status: BookingStatus.PENDING,
            priceMinorUnits: offering.priceMinorUnits,
            currency: 'INR',
            paymentMode: dto.paymentMode,
          },
          include: {
            service: {
              include: {
                vendorProfile: true,
              },
            },
            offering: true,
          },
        });

        // Create BookingHistory
        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: null,
            toStatus: BookingStatus.PENDING,
            actorUserId: userId,
            reason: 'Booking created',
          },
        });

        // Handle PAY_NOW initial payment row
        if (dto.paymentMode === PaymentMode.PAY_NOW) {
          const mockRef = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              amountMinorUnits: offering.priceMinorUnits,
              currency: 'INR',
              providerRef: mockRef,
              status: PaymentStatus.INITIATED,
            },
          });
        }

        return tx.booking.findUnique({
          where: { id: booking.id },
          include: {
            service: {
              include: {
                vendorProfile: true,
              },
            },
            offering: true,
            payment: true,
            history: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  /**
   * Get single booking by ID with ownership checks
   */
  async getBookingById(id: string, user: CurrentUserPayload) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        service: {
          include: {
            vendorProfile: true,
          },
        },
        offering: true,
        payment: true,
        history: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Fetch caller user role and permissions from DB fresh
    const callerUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
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

    const userPermissions = new Set(
      callerUser?.role?.permissions?.map((p) => p.permission.slug) || [],
    );

    // Ownership check according to Section 7.3:
    // Admin / SuperAdmin -> allowed
    // Vendor owning service -> allowed
    // Customer owning booking -> allowed
    // Otherwise 404 (do not leak existence)
    const isAdmin =
      callerUser?.role?.type === 'ADMIN' ||
      Boolean(callerUser?.role?.bypassChecks) ||
      userPermissions.has('booking.read.any');

    const isVendorOwner =
      userPermissions.has('booking.read.vendor') &&
      booking.service.vendorProfile.userId === user.userId;

    const isCustomerOwner =
      userPermissions.has('booking.read.own') &&
      booking.customerId === user.userId;

    if (!isAdmin && !isVendorOwner && !isCustomerOwner) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Get list of customer's own bookings
   */
  async getCustomerBookings(userId: string, query: QueryBookingsDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      customerId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.fromDate || query.toDate
        ? {
            slotStart: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              images: true,
              vendorProfile: {
                select: { businessName: true },
              },
            },
          },
          offering: true,
          payment: true,
        },
      }),
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

  /**
   * Get list of bookings for vendor's services
   */
  async getVendorBookings(userId: string, query: QueryBookingsDto) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      service: {
        vendorProfileId: vendorProfile.id,
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            slotStart: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          service: {
            select: { id: true, title: true },
          },
          offering: true,
          payment: true,
        },
      }),
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

  /**
   * Get list of all bookings for admin
   */
  async getAdminBookings(query: QueryBookingsDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      ...(query.vendorId
        ? {
            service: {
              vendorProfileId: query.vendorId,
            },
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            slotStart: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          service: {
            select: {
              id: true,
              title: true,
              vendorProfile: {
                select: { id: true, businessName: true },
              },
            },
          },
          offering: true,
          payment: true,
        },
      }),
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

  /**
   * Vendor Confirm Booking (PENDING -> CONFIRMED)
   */
  async confirmBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { include: { vendorProfile: true } },
        payment: true,
      },
    });

    if (!booking || booking.service.vendorProfile.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Cannot confirm booking in '${booking.status}' state. Only PENDING bookings can be confirmed.`,
      );
    }

    if (booking.paymentMode === PaymentMode.PAY_NOW) {
      if (!booking.payment || booking.payment.status !== PaymentStatus.SUCCESS) {
        throw new UnprocessableEntityException(
          'PAY_NOW booking cannot be confirmed until payment is SUCCESS',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED },
        include: {
          service: true,
          offering: true,
          payment: true,
        },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.CONFIRMED,
          actorUserId: userId,
          reason: 'Vendor confirmed booking',
        },
      });

      return updated;
    });
  }

  /**
   * Vendor Reject Booking (PENDING -> REJECTED)
   */
  async rejectBooking(id: string, userId: string, dto?: RejectBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { include: { vendorProfile: true } },
      },
    });

    if (!booking || booking.service.vendorProfile.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Cannot reject booking in '${booking.status}' state. Only PENDING bookings can be rejected.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.REJECTED,
          cancellationReason: dto?.reason || 'Rejected by vendor',
        },
        include: {
          service: true,
          offering: true,
          payment: true,
        },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.REJECTED,
          actorUserId: userId,
          reason: dto?.reason || 'Vendor rejected booking',
        },
      });

      return updated;
    });
  }

  /**
   * Cancel Booking (PENDING/CONFIRMED -> CANCELLED)
   * Enforces rules for Customer (window-gated), Vendor (no window), Admin (no window).
   */
  async cancelBooking(id: string, user: CurrentUserPayload, dto?: CancelBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { include: { vendorProfile: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Fetch caller user role and permissions from DB fresh
    const callerUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
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

    const userPermissions = new Set(
      callerUser?.role?.permissions?.map((p) => p.permission.slug) || [],
    );

    const isAdmin =
      callerUser?.role?.type === 'ADMIN' ||
      Boolean(callerUser?.role?.bypassChecks) ||
      userPermissions.has('booking.cancel.any');

    const isVendorOwner =
      userPermissions.has('booking.cancel.vendor') &&
      booking.service.vendorProfile.userId === user.userId;

    const isCustomerOwner =
      userPermissions.has('booking.cancel.own') &&
      booking.customerId === user.userId;

    if (!isAdmin && !isVendorOwner && !isCustomerOwner) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new UnprocessableEntityException(
        `Booking in state '${booking.status}' cannot be cancelled.`,
      );
    }

    // Customer cancellation window check (freeCancellationHours)
    if (isCustomerOwner && !isAdmin && !isVendorOwner) {
      const freeCancellationHours = booking.service.freeCancellationHours ?? 24;
      const now = Date.now();
      const hoursRemaining = (booking.slotStart.getTime() - now) / (1000 * 60 * 60);

      if (hoursRemaining < freeCancellationHours) {
        throw new UnprocessableEntityException(
          `Free cancellation window has passed. Cancellations require at least ${freeCancellationHours} hours notice before slot start. Please contact vendor directly.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: dto?.reason || 'Cancelled',
        },
        include: {
          service: true,
          offering: true,
          payment: true,
        },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          actorUserId: user.userId,
          reason: dto?.reason || 'Booking cancelled',
        },
      });

      return updated;
    });
  }

  /**
   * Vendor Complete Booking (CONFIRMED -> COMPLETED)
   */
  async completeBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { include: { vendorProfile: true } },
      },
    });

    if (!booking || booking.service.vendorProfile.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new UnprocessableEntityException(
        `Cannot complete booking in '${booking.status}' state. Only CONFIRMED bookings can be completed.`,
      );
    }

    const now = new Date();
    if (now.getTime() < booking.slotStart.getTime()) {
      throw new UnprocessableEntityException(
        'Cannot complete a booking before the slot start time',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.COMPLETED },
        include: {
          service: true,
          offering: true,
          payment: true,
        },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          fromStatus: BookingStatus.CONFIRMED,
          toStatus: BookingStatus.COMPLETED,
          actorUserId: userId,
          reason: 'Vendor marked booking as completed',
        },
      });

      return updated;
    });
  }

  /**
   * Vendor No-Show Booking (CONFIRMED -> NO_SHOW)
   */
  async noShowBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { include: { vendorProfile: true } },
      },
    });

    if (!booking || booking.service.vendorProfile.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new UnprocessableEntityException(
        `Cannot mark no-show for booking in '${booking.status}' state. Only CONFIRMED bookings can be marked no-show.`,
      );
    }

    const now = new Date();
    if (now.getTime() < booking.slotStart.getTime()) {
      throw new UnprocessableEntityException(
        'Cannot mark no-show before the slot start time',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.NO_SHOW },
        include: {
          service: true,
          offering: true,
          payment: true,
        },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          fromStatus: BookingStatus.CONFIRMED,
          toStatus: BookingStatus.NO_SHOW,
          actorUserId: userId,
          reason: 'Vendor marked customer as no-show',
        },
      });

      return updated;
    });
  }

  /**
   * Reschedule Booking (Customer reschedules own PENDING or CONFIRMED booking)
   */
  async rescheduleBooking(id: string, userId: string, dto: RescheduleBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        offering: true,
      },
    });

    if (!booking || booking.customerId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new UnprocessableEntityException(
        `Cannot reschedule booking in '${booking.status}' state.`,
      );
    }

    const newSlotStart = new Date(dto.newSlotStart);
    if (isNaN(newSlotStart.getTime())) {
      throw new BadRequestException('Invalid newSlotStart ISO date format');
    }

    const newSlotEnd = new Date(
      newSlotStart.getTime() + booking.offering.durationMinutes * 60 * 1000,
    );

    const { slotCapacity } = await this.validateAndGetSlotCapacity(
      booking.serviceId,
      booking.offeringId,
      newSlotStart,
      newSlotEnd,
    );

    return this.prisma.$transaction(
      async (tx) => {
        // Reserve new slot capacity excluding current booking
        await this.reserveSlot(tx, {
          serviceId: booking.serviceId,
          offeringId: booking.offeringId,
          slotStart: newSlotStart,
          slotEnd: newSlotEnd,
          slotCapacity,
          excludeBookingId: booking.id,
        });

        const updated = await tx.booking.update({
          where: { id },
          data: {
            slotStart: newSlotStart,
            slotEnd: newSlotEnd,
          },
          include: {
            service: true,
            offering: true,
            payment: true,
          },
        });

        await tx.bookingHistory.create({
          data: {
            bookingId: id,
            fromStatus: booking.status,
            toStatus: booking.status,
            actorUserId: userId,
            reason: 'Customer rescheduled booking',
            metadata: {
              oldSlotStart: booking.slotStart.toISOString(),
              newSlotStart: newSlotStart.toISOString(),
            },
          },
        });

        return updated;
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }
}
