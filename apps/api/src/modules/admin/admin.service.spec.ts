import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { BadRequestException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;
  let bookingsService: any;

  beforeEach(async () => {
    prismaService = {
      vendorProfile: {
        count: jest.fn(),
      },
      booking: {
        count: jest.fn(),
      },
      payment: {
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    bookingsService = {
      cancelBooking: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaService },
        { provide: BookingsService, useValue: bookingsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    it('should return aggregated platform metrics', async () => {
      prismaService.vendorProfile.count.mockResolvedValue(3);
      prismaService.booking.count.mockResolvedValue(12);
      prismaService.payment.aggregate.mockResolvedValue({
        _sum: { amountMinorUnits: 250000 },
      });
      prismaService.payment.count.mockResolvedValue(1);

      const res = await service.getDashboardSummary();

      expect(res).toEqual({
        pendingVendorApplications: 3,
        bookingsToday: 12,
        revenueCollectedMinorUnits: 250000,
        paymentsFailedCount: 1,
      });
    });

    it('should handle zero revenue aggregate gracefully', async () => {
      prismaService.vendorProfile.count.mockResolvedValue(0);
      prismaService.booking.count.mockResolvedValue(0);
      prismaService.payment.aggregate.mockResolvedValue({
        _sum: { amountMinorUnits: null },
      });
      prismaService.payment.count.mockResolvedValue(0);

      const res = await service.getDashboardSummary();

      expect(res.revenueCollectedMinorUnits).toBe(0);
    });
  });

  describe('forceCancelBooking', () => {
    it('should throw BadRequestException if reason is empty', async () => {
      const user = { userId: 'admin-1', roleId: 'role-1' };
      await expect(service.forceCancelBooking('b1', user, '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delegate to bookingsService and write audit log', async () => {
      const user = { userId: 'admin-1', roleId: 'role-1' };
      bookingsService.cancelBooking.mockResolvedValue({ id: 'b1', status: 'CANCELLED' });
      prismaService.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await service.forceCancelBooking('b1', user, 'Violation of terms');

      expect(bookingsService.cancelBooking).toHaveBeenCalledWith('b1', user, {
        reason: 'Violation of terms',
      });
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'booking.force_cancel',
          targetType: 'Booking',
          targetId: 'b1',
        }),
      });
      expect(res).toEqual({ id: 'b1', status: 'CANCELLED' });
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with enriched actor data', async () => {
      prismaService.auditLog.count.mockResolvedValue(1);
      prismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'l1',
          actorUserId: 'u1',
          action: 'booking.force_cancel',
          targetType: 'Booking',
          targetId: 'b1',
          metadata: { reason: 'test' },
          createdAt: new Date(),
        },
      ]);
      prismaService.user.findMany.mockResolvedValue([
        { id: 'u1', name: 'Admin User', email: 'admin@test.com' },
      ]);

      const res = await service.getAuditLogs({ page: 1, pageSize: 20 });

      expect(res.data.length).toBe(1);
      expect(res.data[0].actor).toEqual({
        id: 'u1',
        name: 'Admin User',
        email: 'admin@test.com',
      });
      expect(res.meta.total).toBe(1);
    });
  });
});
