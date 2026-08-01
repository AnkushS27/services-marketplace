import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, CreateSubAdminDto, AssignRoleDto } from './dto/roles.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.PERMISSION_READ)
  async getPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLE_READ)
  async getRoles() {
    return this.rolesService.getAllRoles();
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLE_CREATE)
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rolesService.createRole(dto, user.userId);
  }

  @Patch('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLE_UPDATE)
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rolesService.updateRole(id, dto, user.userId);
  }

  @Delete('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLE_DELETE)
  async deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }

  @Post('admin/sub-admins')
  @RequirePermissions(PERMISSIONS.ADMIN_CREATE)
  async createSubAdmin(@Body() dto: CreateSubAdminDto) {
    return this.rolesService.createSubAdmin(dto);
  }

  @Post('admin/users/:id/role')
  @RequirePermissions(PERMISSIONS.ROLE_ASSIGN)
  async assignRole(
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rolesService.assignUserRole(userId, dto);
  }
}
