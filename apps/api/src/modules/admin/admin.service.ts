import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { QueryAuditLogsDto } from './dto/admin.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { VendorStatus, PaymentStatus, Prisma } from '@prisma/client';

export interface DashboardSummaryResponse {
  pendingVendorApplications: number;
  bookingsToday: number;
  revenueCollectedMinorUnits: number;
  paymentsFailedCount: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
  ) {}

  /**
   * GET /admin/dashboard/summary
   * Aggregates platform summary metrics using indexed database queries.
   */
  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      pendingVendorApplications,
      bookingsToday,
      revenueAggregate,
      paymentsFailedCount,
    ] = await Promise.all([
      this.prisma.vendorProfile.count({
        where: { status: VendorStatus.PENDING },
      }),
      this.prisma.booking.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountMinorUnits: true },
        where: { status: PaymentStatus.SUCCESS },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.FAILED },
      }),
    ]);

    return {
      pendingVendorApplications,
      bookingsToday,
      revenueCollectedMinorUnits: revenueAggregate._sum.amountMinorUnits || 0,
      paymentsFailedCount,
    };
  }

  /**
   * PATCH /admin/bookings/:id/force-cancel
   * Admin force cancellation with mandatory reason.
   */
  async forceCancelBooking(
    id: string,
    user: CurrentUserPayload,
    reason: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Reason is mandatory for admin force cancellation');
    }

    const booking = await this.bookingsService.cancelBooking(id, user, {
      reason: reason.trim(),
    });

    // Write audit log entry
    await this.logAudit({
      actorUserId: user.userId,
      action: 'booking.force_cancel',
      targetType: 'Booking',
      targetId: id,
      metadata: { reason: reason.trim() },
    });

    return booking;
  }

  /**
   * GET /admin/audit-logs
   * Retrieve filterable and paginated audit logs for admin audit trail.
   */
  async getAuditLogs(query: QueryAuditLogsDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const actorIds = [
      ...new Set(data.map((l) => l.actorUserId).filter(Boolean)),
    ] as string[];

    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enrichedData = data.map((log) => ({
      ...log,
      actor: log.actorUserId ? actorMap.get(log.actorUserId) || null : null,
    }));

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Record an audit log entry in the database.
   */
  async logAudit(params: {
    actorUserId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        metadata: params.metadata ? (params.metadata as any) : Prisma.DbNull,
      },
    });
  }
}
