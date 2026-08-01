import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ForceCancelBookingDto, QueryAuditLogsDto } from './dto/admin.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/summary')
  @RequirePermissions(PERMISSIONS.DASHBOARD_READ)
  async getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Patch('bookings/:id/force-cancel')
  @RequirePermissions(PERMISSIONS.BOOKING_CANCEL_ANY)
  async forceCancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ForceCancelBookingDto,
  ) {
    return this.adminService.forceCancelBooking(id, user, dto.reason);
  }

  @Get('audit-logs')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  async getAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.adminService.getAuditLogs(query);
  }
}
