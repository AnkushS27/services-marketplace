import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
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
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
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

  // --- Staff Roster Endpoints (Phase 12) ---

  @Get('vendors/me/staff')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_READ)
  async getMyStaff(@CurrentUser() user: CurrentUserPayload) {
    return this.vendorsService.getStaffList(user.userId);
  }

  @Post('vendors/me/staff')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_UPDATE)
  async createStaff(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateStaffDto,
  ) {
    return this.vendorsService.createStaff(user.userId, dto);
  }

  @Patch('vendors/me/staff/:id')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_UPDATE)
  async updateStaff(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.vendorsService.updateStaff(user.userId, id, dto);
  }

  @Delete('vendors/me/staff/:id')
  @RequirePermissions(PERMISSIONS.VENDOR_PROFILE_UPDATE)
  async deleteStaff(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.vendorsService.deleteStaff(user.userId, id);
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
