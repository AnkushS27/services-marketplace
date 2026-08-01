import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  QueryBookingsDto,
  CancelBookingDto,
  RejectBookingDto,
  RescheduleBookingDto,
} from './dto/bookings.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('bookings')
  @RequirePermissions(PERMISSIONS.BOOKING_CREATE)
  async createBooking(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user.userId, dto);
  }

  @Get('bookings')
  @RequirePermissions(PERMISSIONS.BOOKING_READ_OWN)
  async getCustomerBookings(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryBookingsDto,
  ) {
    return this.bookingsService.getCustomerBookings(user.userId, query);
  }

  @Get('vendor/bookings')
  @RequirePermissions(PERMISSIONS.BOOKING_READ_VENDOR)
  async getVendorBookings(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryBookingsDto,
  ) {
    return this.bookingsService.getVendorBookings(user.userId, query);
  }

  @Get('admin/bookings')
  @RequirePermissions(PERMISSIONS.BOOKING_READ_ANY)
  async getAdminBookings(@Query() query: QueryBookingsDto) {
    return this.bookingsService.getAdminBookings(query);
  }

  @Get('bookings/:id')
  async getBookingById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.bookingsService.getBookingById(id, user);
  }

  @Patch('bookings/:id/confirm')
  @RequirePermissions(PERMISSIONS.BOOKING_CONFIRM)
  async confirmBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.bookingsService.confirmBooking(id, user.userId);
  }

  @Patch('bookings/:id/reject')
  @RequirePermissions(PERMISSIONS.BOOKING_REJECT)
  async rejectBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RejectBookingDto,
  ) {
    return this.bookingsService.rejectBooking(id, user.userId, dto);
  }

  @Patch('bookings/:id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, user, dto);
  }

  @Patch('bookings/:id/complete')
  @RequirePermissions(PERMISSIONS.BOOKING_COMPLETE)
  async completeBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.bookingsService.completeBooking(id, user.userId);
  }

  @Patch('bookings/:id/no-show')
  @RequirePermissions(PERMISSIONS.BOOKING_NOSHOW)
  async noShowBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.bookingsService.noShowBooking(id, user.userId);
  }

  @Patch('bookings/:id/reschedule')
  @RequirePermissions(PERMISSIONS.BOOKING_RESCHEDULE_OWN)
  async rescheduleBooking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.rescheduleBooking(id, user.userId, dto);
  }
}
