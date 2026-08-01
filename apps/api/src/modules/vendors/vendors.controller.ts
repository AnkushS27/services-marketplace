import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import {
  UpdateVendorProfileDto,
  UploadVendorDocumentDto,
  QueryVendorsDto,
  RejectVendorDto,
} from './dto/vendors.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

@Controller()
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('vendors/me')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_READ)
  async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.vendorsService.getVendorProfile(user.userId);
  }

  @Patch('vendors/me/profile')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_UPDATE)
  async updateMyProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateVendorProfileDto,
  ) {
    return this.vendorsService.updateVendorProfile(user.userId, dto);
  }

  @Post('vendors/me/documents')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_UPDATE)
  async uploadMyDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadVendorDocumentDto,
  ) {
    return this.vendorsService.uploadVendorDocument(user.userId, dto);
  }

  @Get('admin/vendors')
  @RequirePermissions(PERMISSIONS.VENDOR_READ_ANY)
  async getVendorsAdmin(@Query() query: QueryVendorsDto) {
    return this.vendorsService.getVendorsAdmin(query);
  }

  @Patch('admin/vendors/:id/approve')
  @RequirePermissions(PERMISSIONS.VENDOR_APPROVE)
  async approveVendor(@Param('id') id: string) {
    return this.vendorsService.approveVendor(id);
  }

  @Patch('admin/vendors/:id/reject')
  @RequirePermissions(PERMISSIONS.VENDOR_APPROVE)
  async rejectVendor(
    @Param('id') id: string,
    @Body() dto: RejectVendorDto,
  ) {
    return this.vendorsService.rejectVendor(id, dto.reason);
  }
}
