import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { RoleType } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(RoleType)
  type: RoleType;

  @IsArray()
  @IsString({ each: true })
  permissionSlugs: string[];

  @IsOptional()
  @IsBoolean()
  bypassChecks?: boolean;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RoleType)
  type?: RoleType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionSlugs?: string[];
}

export class CreateSubAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
