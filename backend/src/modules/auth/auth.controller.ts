import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ROLE_DASHBOARD_PATH } from '../../common/enums/role.enum';
import type { TokenPayload } from './token-payload.interface';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Brute-force protection lives only on these three endpoints (login-module.md
  // §6/§8 — lock after 5 failed attempts for 15 min). Everything else is
  // unthrottled; a global throttle previously caught /auth/me too and logged
  // users out after a handful of page refreshes.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.identifier, dto.password);
    return this.respondWithSession(res, result);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.auth.sendOtp(dto.phone);
    return { success: true, message: 'OTP sent' };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.verifyOtpAndLogin(dto.phone, dto.code);
    return this.respondWithSession(res, result);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { success: true, message: 'If an account exists, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { success: true, message: 'Password updated. Please log in.' };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as TokenPayload;
    const result = await this.auth.refresh(payload);
    return this.respondWithSession(res, result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.userId);
    res.clearCookie(REFRESH_COOKIE);
    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const record = await this.auth.me(user.userId);
    return {
      user: {
        id: record!.id,
        name: record!.name,
        email: record!.email,
        phone: record!.phone,
        role: record!.role,
        region: record!.region,
        permissions: record!.permissions,
      },
      redirectTo: ROLE_DASHBOARD_PATH[record!.role],
    };
  }

  private respondWithSession(res: Response, result: AuthResult) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
    return {
      accessToken: result.accessToken,
      user: result.user,
      redirectTo: ROLE_DASHBOARD_PATH[result.user.role as keyof typeof ROLE_DASHBOARD_PATH],
    };
  }
}
