import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentMode, PaymentStatus } from '@prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    bookingHistory: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    offering: {
      findUnique: jest.fn(),
    },
    vendorProfile: {
      findUnique: jest.fn(),
    },
    staff: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    $executeRaw: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('State Machine & Transitions', () => {
    it('should allow vendor to confirm PENDING booking when payment is PAY_AFTER', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: BookingStatus.PENDING,
        paymentMode: PaymentMode.PAY_AFTER,
        service: {
          vendorProfile: { userId: 'vendor-1' },
        },
        payment: null,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      });

      const res = await service.confirmBooking('booking-1', 'vendor-1');
      expect(res.status).toBe(BookingStatus.CONFIRMED);
      expect(mockPrismaService.bookingHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.CONFIRMED,
        }),
      });
    });

    it('should reject confirm if PAY_NOW payment status is not SUCCESS', async () => {
      const mockBooking = {
        id: 'booking-2',
        status: BookingStatus.PENDING,
        paymentMode: PaymentMode.PAY_NOW,
        service: {
          vendorProfile: { userId: 'vendor-1' },
        },
        payment: { status: PaymentStatus.INITIATED },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.confirmBooking('booking-2', 'vendor-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject illegal state transition e.g. complete on PENDING booking', async () => {
      const mockBooking = {
        id: 'booking-3',
        status: BookingStatus.PENDING,
        service: {
          vendorProfile: { userId: 'vendor-1' },
        },
        slotStart: new Date(Date.now() - 10000),
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.completeBooking('booking-3', 'vendor-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should enforce free cancellation window for customer cancellations', async () => {
      const slotStartIn2Hours = new Date(Date.now() + 2 * 3600 * 1000);
      const mockBooking = {
        id: 'booking-4',
        customerId: 'customer-1',
        status: BookingStatus.CONFIRMED,
        slotStart: slotStartIn2Hours,
        service: {
          freeCancellationHours: 24,
          vendorProfile: { userId: 'vendor-1' },
        },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'customer-1',
        role: {
          type: 'CUSTOMER',
          bypassChecks: false,
          permissions: [{ permission: { slug: 'booking.cancel.own' } }],
        },
      });

      const customerPayload = {
        userId: 'customer-1',
        roleId: 'role-customer',
      } as any;

      await expect(
        service.cancelBooking('booking-4', customerPayload),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('Capacity & ReserveSlot', () => {
    it('should throw ConflictException if active booking count reaches capacity', async () => {
      const futureSlot = new Date(Date.now() + 24 * 3600 * 1000);
      futureSlot.setMinutes(0, 0, 0);

      const mockService = {
        id: 'srv-1',
        status: 'PUBLISHED',
        vendorProfile: { status: 'APPROVED', timezone: 'Asia/Kolkata' },
        offerings: [{ id: 'off-1', durationMinutes: 60, isActive: true }],
        availabilityRules: [
          {
            weekday: futureSlot.getDay() % 7,
            startMinute: futureSlot.getHours() * 60,
            endMinute: futureSlot.getHours() * 60 + 60,
            capacity: 2,
          },
        ],
        availabilityExceptions: [],
      };

      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.booking.count.mockResolvedValue(2); // capacity is 2, active count is 2

      await expect(
        service.reserveSlot(mockPrismaService as any, {
          serviceId: 'srv-1',
          offeringId: 'off-1',
          slotStart: futureSlot,
          slotEnd: new Date(futureSlot.getTime() + 60 * 60 * 1000),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Ownership & Access Control', () => {
    it('should return 404 when user tries to access a booking owned by another user', async () => {
      const mockBooking = {
        id: 'booking-other',
        customerId: 'customer-user-1',
        service: {
          vendorProfile: { userId: 'vendor-user-1' },
        },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'intruder-id',
        role: {
          type: 'CUSTOMER',
          bypassChecks: false,
          permissions: [{ permission: { slug: 'booking.read.own' } }],
        },
      });

      const intruderPayload = {
        userId: 'intruder-id',
        roleId: 'role-customer',
      } as any;

      await expect(
        service.getBookingById('booking-other', intruderPayload),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
