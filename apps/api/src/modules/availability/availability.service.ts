import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAvailabilityRuleDto,
  CreateAvailabilityExceptionDto,
} from './dto/availability.dto';
import { DateTime } from 'luxon';
import { BookingStatus } from '@prisma/client';

export interface DerivedSlot {
  slotStart: Date;
  slotEnd: Date;
  remaining: number;
  capacity: number;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVendorProfileForUser(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }
    return vendorProfile;
  }

  private async verifyServiceOwnership(serviceId: string, vendorProfileId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        vendorProfileId,
      },
    });
    if (!service) {
      throw new NotFoundException('Service not found or not owned by vendor');
    }
    return service;
  }

  // --- Vendor Rule & Exception Management ---

  async getServiceRulesAndExceptions(serviceId: string, userId: string) {
    const vendorProfile = await this.getVendorProfileForUser(userId);
    await this.verifyServiceOwnership(serviceId, vendorProfile.id);

    const [rules, exceptions] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { serviceId },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      }),
      this.prisma.availabilityException.findMany({
        where: { serviceId },
        orderBy: { date: 'asc' },
      }),
    ]);

    return { rules, exceptions };
  }

  async createRule(
    serviceId: string,
    userId: string,
    dto: CreateAvailabilityRuleDto,
  ) {
    const vendorProfile = await this.getVendorProfileForUser(userId);
    await this.verifyServiceOwnership(serviceId, vendorProfile.id);

    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException('startMinute must be strictly less than endMinute');
    }

    return this.prisma.availabilityRule.create({
      data: {
        serviceId,
        weekday: dto.weekday,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        capacity: dto.capacity,
      },
    });
  }

  async deleteRule(ruleId: string, userId: string) {
    const vendorProfile = await this.getVendorProfileForUser(userId);

    const rule = await this.prisma.availabilityRule.findUnique({
      where: { id: ruleId },
      include: { service: true },
    });

    if (!rule || rule.service.vendorProfileId !== vendorProfile.id) {
      throw new NotFoundException('Availability rule not found');
    }

    await this.prisma.availabilityRule.delete({
      where: { id: ruleId },
    });

    return { success: true };
  }

  async createException(
    serviceId: string,
    userId: string,
    dto: CreateAvailabilityExceptionDto,
  ) {
    const vendorProfile = await this.getVendorProfileForUser(userId);
    await this.verifyServiceOwnership(serviceId, vendorProfile.id);

    if (!dto.isClosed) {
      if (
        dto.startMinute === undefined ||
        dto.endMinute === undefined ||
        dto.capacity === undefined
      ) {
        throw new BadRequestException(
          'startMinute, endMinute, and capacity are required when isClosed is false',
        );
      }
      if (dto.startMinute >= dto.endMinute) {
        throw new BadRequestException('startMinute must be strictly less than endMinute');
      }
    }

    const parsedDate = new Date(dto.date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }

    // Standardize exception date to midnight UTC/date component
    const normalizedDate = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
      ),
    );

    return this.prisma.availabilityException.create({
      data: {
        serviceId,
        date: normalizedDate,
        isClosed: dto.isClosed,
        startMinute: dto.isClosed ? null : dto.startMinute,
        endMinute: dto.isClosed ? null : dto.endMinute,
        capacity: dto.isClosed ? null : dto.capacity,
      },
    });
  }

  async deleteException(exceptionId: string, userId: string) {
    const vendorProfile = await this.getVendorProfileForUser(userId);

    const exception = await this.prisma.availabilityException.findUnique({
      where: { id: exceptionId },
      include: { service: true },
    });

    if (!exception || exception.service.vendorProfileId !== vendorProfile.id) {
      throw new NotFoundException('Availability exception not found');
    }

    await this.prisma.availabilityException.delete({
      where: { id: exceptionId },
    });

    return { success: true };
  }

  // --- Slot Derivation Algorithm ---

  async deriveSlots(
    serviceId: string,
    offeringId: string,
    fromStr?: string,
    toStr?: string,
  ): Promise<DerivedSlot[]> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        vendorProfile: true,
        offerings: true,
        availabilityRules: true,
        availabilityExceptions: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const offering = service.offerings.find((o) => o.id === offeringId);
    if (!offering || !offering.isActive) {
      throw new NotFoundException('Offering not found or inactive');
    }

    const vendorTz = service.vendorProfile?.timezone || 'Asia/Kolkata';
    const nowServer = new Date();

    // Parse date boundaries in vendor timezone
    let startDate: DateTime;
    if (fromStr) {
      startDate = DateTime.fromISO(fromStr, { zone: vendorTz }).startOf('day');
    } else {
      startDate = DateTime.now().setZone(vendorTz).startOf('day');
    }

    let endDate: DateTime;
    if (toStr) {
      endDate = DateTime.fromISO(toStr, { zone: vendorTz }).endOf('day');
    } else {
      endDate = startDate.plus({ days: 14 }).endOf('day');
    }

    if (endDate < startDate) {
      throw new BadRequestException('from date must be before to date');
    }

    // Pre-process date exceptions map: YYYY-MM-DD -> AvailabilityException
    const exceptionsMap = new Map<string, typeof service.availabilityExceptions[0]>();
    for (const exc of service.availabilityExceptions) {
      const excDt = DateTime.fromJSDate(exc.date, { zone: 'utc' });
      const excDateStr = excDt.toISODate();
      if (excDateStr) {
        exceptionsMap.set(excDateStr, exc);
      }
    }

    const durationMinutes = offering.durationMinutes;
    const potentialSlots: Array<{
      slotStart: Date;
      slotEnd: Date;
      capacity: number;
    }> = [];

    // Step through each calendar date in range
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const currentDateStr = currentDate.toISODate(); // YYYY-MM-DD in vendor tz
      const weekday = currentDate.weekday % 7; // Luxon 1=Mon..7=Sun -> 0=Sun..6=Sat

      let windows: Array<{ startMinute: number; endMinute: number; capacity: number }> = [];

      if (currentDateStr && exceptionsMap.has(currentDateStr)) {
        const exc = exceptionsMap.get(currentDateStr)!;
        if (!exc.isClosed && exc.startMinute !== null && exc.endMinute !== null && exc.capacity !== null) {
          windows.push({
            startMinute: exc.startMinute,
            endMinute: exc.endMinute,
            capacity: exc.capacity,
          });
        }
      } else {
        const matchingRules = service.availabilityRules.filter((r) => r.weekday === weekday);
        for (const rule of matchingRules) {
          windows.push({
            startMinute: rule.startMinute,
            endMinute: rule.endMinute,
            capacity: rule.capacity,
          });
        }
      }

      for (const window of windows) {
        let currentMinute = window.startMinute;
        while (currentMinute + durationMinutes <= window.endMinute) {
          const hour = Math.floor(currentMinute / 60);
          const minute = currentMinute % 60;

          const slotStartDt = DateTime.fromObject(
            {
              year: currentDate.year,
              month: currentDate.month,
              day: currentDate.day,
              hour,
              minute,
              second: 0,
              millisecond: 0,
            },
            { zone: vendorTz },
          );

          const slotStartUtc = slotStartDt.toJSDate();
          const slotEndUtc = new Date(slotStartUtc.getTime() + durationMinutes * 60 * 1000);

          // Rule 4: Discard past slots against server time
          if (slotStartUtc.getTime() > nowServer.getTime()) {
            potentialSlots.push({
              slotStart: slotStartUtc,
              slotEnd: slotEndUtc,
              capacity: window.capacity,
            });
          }

          currentMinute += durationMinutes;
        }
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    if (potentialSlots.length === 0) {
      return [];
    }

    // Query active bookings for capacity math
    const slotStartTimes = potentialSlots.map((s) => s.slotStart);

    // Fetch active staff count for vendor
    const activeStaffCount = await this.prisma.staff.count({
      where: {
        vendorProfileId: service.vendorProfileId,
        isActive: true,
      },
    });

    const activeBookings = await this.prisma.booking.findMany({
      where: {
        serviceId,
        offeringId,
        slotStart: { in: slotStartTimes },
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.COMPLETED,
          ],
        },
      },
      select: {
        slotStart: true,
      },
    });

    const bookingCountsMap = new Map<string, number>();
    for (const b of activeBookings) {
      const key = b.slotStart.toISOString();
      bookingCountsMap.set(key, (bookingCountsMap.get(key) || 0) + 1);
    }

    // Fetch all active vendor bookings across all services for overlap calculation if staff restriction applies
    const allVendorBookings = activeStaffCount > 0
      ? await this.prisma.booking.findMany({
          where: {
            service: { vendorProfileId: service.vendorProfileId },
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.COMPLETED,
              ],
            },
          },
          select: {
            slotStart: true,
            slotEnd: true,
          },
        })
      : [];

    const availableSlots: DerivedSlot[] = [];

    for (const slot of potentialSlots) {
      const key = slot.slotStart.toISOString();
      const bookedCount = bookingCountsMap.get(key) || 0;
      
      let effectiveCapacity = slot.capacity;

      if (activeStaffCount > 0) {
        // Count overlapping bookings across all vendor offerings
        const concurrentVendorCount = allVendorBookings.filter(
          (b) => b.slotStart < slot.slotEnd && b.slotEnd > slot.slotStart,
        ).length;

        const staffRemaining = activeStaffCount - concurrentVendorCount;
        effectiveCapacity = Math.min(slot.capacity, Math.max(0, staffRemaining + bookedCount));
      }

      const remaining = effectiveCapacity - bookedCount;

      if (remaining > 0) {
        availableSlots.push({
          slotStart: slot.slotStart,
          slotEnd: slot.slotEnd,
          remaining,
          capacity: effectiveCapacity,
        });
      }
    }

    return availableSlots;
  }

  async getNextAvailableSlot(
    serviceId: string,
    offeringId: string,
  ): Promise<DerivedSlot | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { vendorProfile: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const vendorTz = service.vendorProfile?.timezone || 'Asia/Kolkata';
    let currentFrom = DateTime.now().setZone(vendorTz).startOf('day');

    const maxDays = 60;
    const windowDays = 7;

    for (let dayOffset = 0; dayOffset < maxDays; dayOffset += windowDays) {
      const windowStart = currentFrom.plus({ days: dayOffset });
      const windowEnd = windowStart.plus({ days: windowDays - 1 }).endOf('day');

      const slots = await this.deriveSlots(
        serviceId,
        offeringId,
        windowStart.toISODate() || undefined,
        windowEnd.toISODate() || undefined,
      );

      if (slots.length > 0) {
        return slots[0];
      }
    }

    return null;
  }
}
