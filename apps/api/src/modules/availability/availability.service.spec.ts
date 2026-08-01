import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { DateTime } from 'luxon';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;

  const mockServiceId = 'service-123';
  const mockOffering30Id = 'offering-30';
  const mockOffering60Id = 'offering-60';

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-vendor',
    timezone: 'Asia/Kolkata',
  };

  const mockOffering30 = {
    id: mockOffering30Id,
    serviceId: mockServiceId,
    name: '30 Min Consultation',
    durationMinutes: 30,
    priceMinorUnits: 1000,
    isActive: true,
  };

  const mockOffering60 = {
    id: mockOffering60Id,
    serviceId: mockServiceId,
    name: '60 Min Full Session',
    durationMinutes: 60,
    priceMinorUnits: 2000,
    isActive: true,
  };

  const tomorrowStr = DateTime.now()
    .setZone('Asia/Kolkata')
    .plus({ days: 1 })
    .toISODate()!;

  const tomorrowDt = DateTime.fromISO(tomorrowStr, { zone: 'Asia/Kolkata' });
  const tomorrowWeekday = tomorrowDt.weekday % 7;

  const mockRules = [
    {
      id: 'rule-1',
      serviceId: mockServiceId,
      weekday: tomorrowWeekday,
      startMinute: 600, // 10:00 AM
      endMinute: 720, // 12:00 PM (120 min window)
      capacity: 2,
    },
  ];

  beforeEach(async () => {
    prisma = {
      vendorProfile: {
        findUnique: jest.fn(),
      },
      service: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      availabilityRule: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      availabilityException: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
      },
      staff: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  describe('deriveSlots - Test 1: Duration Change', () => {
    it('changing offering duration from 30 to 60 minutes changes generated slot boundaries', async () => {
      // Setup service mock with both offerings and 10:00 AM to 12:00 PM rule
      prisma.service.findUnique.mockResolvedValue({
        id: mockServiceId,
        vendorProfile: mockVendorProfile,
        offerings: [mockOffering30, mockOffering60],
        availabilityRules: mockRules,
        availabilityExceptions: [],
      });
      prisma.booking.findMany.mockResolvedValue([]); // No existing bookings

      // Derive slots for 30 min offering
      const slots30 = await service.deriveSlots(
        mockServiceId,
        mockOffering30Id,
        tomorrowStr,
        tomorrowStr,
      );

      // Derive slots for 60 min offering
      const slots60 = await service.deriveSlots(
        mockServiceId,
        mockOffering60Id,
        tomorrowStr,
        tomorrowStr,
      );

      // 10:00 to 12:00 with 30 min duration should yield 4 slots (10:00, 10:30, 11:00, 11:30)
      expect(slots30.length).toBe(4);

      // 10:00 to 12:00 with 60 min duration should yield 2 slots (10:00, 11:00)
      expect(slots60.length).toBe(2);

      expect(slots30[0].slotStart.getTime()).not.toEqual(slots30[1].slotStart.getTime());
      expect(slots60[0].slotStart.getTime()).toEqual(slots30[0].slotStart.getTime());
      expect(slots60[1].slotStart.getTime()).toEqual(slots30[2].slotStart.getTime());
    });
  });

  describe('deriveSlots - Test 2: Capacity & Active Bookings', () => {
    it('a capacity-2 slot with 1 active booking reports remaining: 1; with 2 active bookings, excluded entirely', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: mockServiceId,
        vendorProfile: mockVendorProfile,
        offerings: [mockOffering60],
        availabilityRules: mockRules,
        availabilityExceptions: [],
      });

      // Compute exact 10:00 AM slot start Date for tomorrow
      const slot1Start = DateTime.fromObject(
        {
          year: tomorrowDt.year,
          month: tomorrowDt.month,
          day: tomorrowDt.day,
          hour: 10,
          minute: 0,
        },
        { zone: 'Asia/Kolkata' },
      ).toJSDate();

      // Case A: 1 active booking for slot 1
      prisma.booking.findMany.mockResolvedValueOnce([
        { slotStart: slot1Start },
      ]);

      const slotsWith1Booking = await service.deriveSlots(
        mockServiceId,
        mockOffering60Id,
        tomorrowStr,
        tomorrowStr,
      );

      const slot1Result = slotsWith1Booking.find(
        (s) => s.slotStart.getTime() === slot1Start.getTime(),
      );
      expect(slot1Result).toBeDefined();
      expect(slot1Result?.remaining).toBe(1);
      expect(slot1Result?.capacity).toBe(2);

      // Case B: 2 active bookings for slot 1 (reaches capacity 2)
      prisma.booking.findMany.mockResolvedValueOnce([
        { slotStart: slot1Start },
        { slotStart: slot1Start },
      ]);

      const slotsWith2Bookings = await service.deriveSlots(
        mockServiceId,
        mockOffering60Id,
        tomorrowStr,
        tomorrowStr,
      );

      const slot1ResultFull = slotsWith2Bookings.find(
        (s) => s.slotStart.getTime() === slot1Start.getTime(),
      );
      expect(slot1ResultFull).toBeUndefined(); // Excluded from results!
    });
  });

  describe('deriveSlots - Test 3: Availability Exceptions', () => {
    it('adding then removing a closing AvailabilityException makes date slots disappear then reappear', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const closingException = {
        id: 'exc-closed',
        serviceId: mockServiceId,
        date: new Date(tomorrowStr),
        isClosed: true,
        startMinute: null,
        endMinute: null,
        capacity: null,
      };

      // Step A: With closing exception active -> 0 slots for tomorrow
      prisma.service.findUnique.mockResolvedValueOnce({
        id: mockServiceId,
        vendorProfile: mockVendorProfile,
        offerings: [mockOffering60],
        availabilityRules: mockRules,
        availabilityExceptions: [closingException],
      });

      const slotsClosed = await service.deriveSlots(
        mockServiceId,
        mockOffering60Id,
        tomorrowStr,
        tomorrowStr,
      );
      expect(slotsClosed.length).toBe(0);

      // Step B: Exception removed -> weekly rule resumes (2 slots)
      prisma.service.findUnique.mockResolvedValueOnce({
        id: mockServiceId,
        vendorProfile: mockVendorProfile,
        offerings: [mockOffering60],
        availabilityRules: mockRules,
        availabilityExceptions: [],
      });

      const slotsReopened = await service.deriveSlots(
        mockServiceId,
        mockOffering60Id,
        tomorrowStr,
        tomorrowStr,
      );
      expect(slotsReopened.length).toBe(2);
    });
  });
});
