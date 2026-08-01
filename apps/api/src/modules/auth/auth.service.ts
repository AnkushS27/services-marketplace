import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerSignupDto, VendorSignupDto, LoginDto } from './dto/auth.dto';
import { RoleType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN') || undefined;

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async createAndSetRefreshToken(userId: string, res: Response): Promise<string> {
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);
    const days = parseInt(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_DAYS') || '30', 10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    res.cookie('refreshToken', refreshToken, {
      ...this.getCookieOptions(),
      expires: expiresAt,
    });

    return refreshToken;
  }

  private signAccessToken(userId: string, roleId: string): string {
    const expiresIn = (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m') as any;
    return this.jwtService.sign(
      { sub: userId, roleId },
      { expiresIn },
    );
  }

  async signupCustomer(dto: CustomerSignupDto, res: Response) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const customerRole = await this.prisma.role.findFirst({
      where: { type: RoleType.CUSTOMER },
    });
    if (!customerRole) {
      throw new NotFoundException('CUSTOMER role not configured in database');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        roleId: customerRole.id,
      },
      include: {
        role: true,
      },
    });

    await this.createAndSetRefreshToken(user.id, res);
    const accessToken = this.signAccessToken(user.id, user.roleId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: {
          id: user.role.id,
          name: user.role.name,
          type: user.role.type,
        },
      },
      accessToken,
    };
  }

  async signupVendor(dto: VendorSignupDto, res: Response) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const vendorRole = await this.prisma.role.findFirst({
      where: { type: RoleType.VENDOR },
    });
    if (!vendorRole) {
      throw new NotFoundException('VENDOR role not configured in database');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          phone: dto.phone,
          roleId: vendorRole.id,
        },
        include: {
          role: true,
        },
      });

      const vendorProfile = await tx.vendorProfile.create({
        data: {
          userId: user.id,
          businessName: dto.businessName,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          address: dto.address,
          timezone: dto.timezone || 'Asia/Kolkata',
        },
      });

      return { user, vendorProfile };
    });

    await this.createAndSetRefreshToken(result.user.id, res);
    const accessToken = this.signAccessToken(result.user.id, result.user.roleId);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: {
          id: result.user.role.id,
          name: result.user.role.name,
          type: result.user.role.type,
        },
      },
      vendorProfile: result.vendorProfile,
      accessToken,
    };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.createAndSetRefreshToken(user.id, res);
    const accessToken = this.signAccessToken(user.id, user.roleId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: {
          id: user.role.id,
          name: user.role.name,
          type: user.role.type,
        },
      },
      accessToken,
    };
  }

  async refreshToken(refreshTokenCookie: string | undefined, res: Response) {
    if (!refreshTokenCookie) {
      throw new UnauthorizedException('No refresh token cookie provided');
    }

    const tokenHash = this.hashToken(refreshTokenCookie);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!existingToken.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    await this.createAndSetRefreshToken(existingToken.userId, res);
    const accessToken = this.signAccessToken(existingToken.userId, existingToken.user.roleId);

    return { accessToken };
  }

  async logout(refreshTokenCookie: string | undefined, res: Response) {
    if (refreshTokenCookie) {
      const tokenHash = this.hashToken(refreshTokenCookie);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('refreshToken', this.getCookieOptions());
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        vendorProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    let permissions: string[] = [];
    if (user.role.bypassChecks) {
      const allPermissions = await this.prisma.permission.findMany();
      permissions = allPermissions.map((p) => p.slug);
    } else {
      permissions = user.role.permissions.map((rp) => rp.permission.slug);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: {
        id: user.role.id,
        name: user.role.name,
        type: user.role.type,
      },
      permissions,
      vendorProfile: user.vendorProfile || null,
    };
  }
}
