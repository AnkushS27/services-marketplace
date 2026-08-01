import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  SuspendServiceDto,
  CreateOfferingDto,
  UpdateOfferingDto,
  QueryServicesDto,
} from './dto/services.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // --- Vendor Services Management ---

  @Get('vendors/me/services')
  @RequirePermissions(PERMISSIONS.SERVICE_CREATE)
  async getMyServices(@CurrentUser() user: CurrentUserPayload) {
    return this.servicesService.getMyServices(user.userId);
  }

  @Post('vendors/me/services')
  @RequirePermissions(PERMISSIONS.SERVICE_CREATE)
  async createService(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.createService(user.userId, dto);
  }

  @Patch('services/:id')
  @RequirePermissions(PERMISSIONS.SERVICE_UPDATE)
  async updateService(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(id, user.userId, dto);
  }

  @Delete('services/:id')
  @RequirePermissions(PERMISSIONS.SERVICE_DELETE)
  async deleteService(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.servicesService.deleteService(id, user.userId);
  }

  @Patch('services/:id/publish')
  @RequirePermissions(PERMISSIONS.SERVICE_PUBLISH)
  async publishService(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.servicesService.publishService(id, user.userId);
  }

  @Patch('services/:id/suspend')
  @RequirePermissions(PERMISSIONS.SERVICE_SUSPEND)
  async suspendService(
    @Param('id') id: string,
    @Body() dto: SuspendServiceDto,
  ) {
    return this.servicesService.suspendService(id, dto);
  }

  // --- Offerings Management ---

  @Post('services/:id/offerings')
  @RequirePermissions(PERMISSIONS.SERVICE_UPDATE)
  async addOffering(
    @Param('id') serviceId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateOfferingDto,
  ) {
    return this.servicesService.addOffering(serviceId, user.userId, dto);
  }

  @Patch('offerings/:id')
  @RequirePermissions(PERMISSIONS.SERVICE_UPDATE)
  async updateOffering(
    @Param('id') offeringId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateOfferingDto,
  ) {
    return this.servicesService.updateOffering(offeringId, user.userId, dto);
  }

  @Delete('offerings/:id')
  @RequirePermissions(PERMISSIONS.SERVICE_UPDATE)
  async deleteOffering(
    @Param('id') offeringId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.servicesService.deleteOffering(offeringId, user.userId);
  }

  // --- Public Catalogue & Search ---

  @Get('services')
  @Public()
  async getPublicServices(@Query() query: QueryServicesDto) {
    return this.servicesService.getPublicServices(query);
  }

  @Get('services/:id')
  @Public()
  async getPublicServiceDetail(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.servicesService.getPublicServiceDetail(id, user);
  }
}
