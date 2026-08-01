import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CustomerSignupDto, VendorSignupDto, LoginDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/signup/customer')
  async signupCustomer(
    @Body() dto: CustomerSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signupCustomer(dto, res);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/signup/vendor')
  async signupVendor(
    @Body() dto: VendorSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signupVendor(dto, res);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('auth/login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('auth/refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenCookie = req.cookies?.refreshToken;
    return this.authService.refreshToken(refreshTokenCookie, res);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('auth/logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenCookie = req.cookies?.refreshToken;
    return this.authService.logout(refreshTokenCookie, res);
  }

  @Get(['me', 'auth/me'])
  async getMe(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }
}
