import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityRuleDto,
  CreateAvailabilityExceptionDto,
  QuerySlotsDto,
} from './dto/availability.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // --- Vendor Availability Management ---

  @Get('services/:id/availability')
  @RequirePermissions(PERMISSIONS.AVAILABILITY_MANAGE)
  async getServiceRulesAndExceptions(
    @Param('id') serviceId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.getServiceRulesAndExceptions(
      serviceId,
      user.userId,
    );
  }

  @Post('services/:id/availability-rules')
  @RequirePermissions(PERMISSIONS.AVAILABILITY_MANAGE)
  async createRule(
    @Param('id') serviceId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAvailabilityRuleDto,
  ) {
    return this.availabilityService.createRule(serviceId, user.userId, dto);
  }

  @Delete('availability-rules/:id')
  @RequirePermissions(PERMISSIONS.AVAILABILITY_MANAGE)
  async deleteRule(
    @Param('id') ruleId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.deleteRule(ruleId, user.userId);
  }

  @Post('services/:id/availability-exceptions')
  @RequirePermissions(PERMISSIONS.AVAILABILITY_MANAGE)
  async createException(
    @Param('id') serviceId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAvailabilityExceptionDto,
  ) {
    return this.availabilityService.createException(
      serviceId,
      user.userId,
      dto,
    );
  }

  @Delete('availability-exceptions/:id')
  @RequirePermissions(PERMISSIONS.AVAILABILITY_MANAGE)
  async deleteException(
    @Param('id') exceptionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.availabilityService.deleteException(exceptionId, user.userId);
  }

  // --- Public Slot Discovery ---

  @Get('services/:id/slots')
  @Public()
  async getSlots(
    @Param('id') serviceId: string,
    @Query() query: QuerySlotsDto,
  ) {
    return this.availabilityService.deriveSlots(
      serviceId,
      query.offeringId,
      query.from,
      query.to,
    );
  }

  @Get('services/:id/next-available')
  @Public()
  async getNextAvailable(
    @Param('id') serviceId: string,
    @Query('offeringId') offeringId: string,
  ) {
    return this.availabilityService.getNextAvailableSlot(
      serviceId,
      offeringId,
    );
  }
}
