import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CustomerSignupDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class VendorSignupDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  contactName!: string;

  @IsString()
  @IsNotEmpty()
  contactPhone!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
