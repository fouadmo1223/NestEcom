import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dtos/register.dto';
import { LoginDto } from '../users/dtos/login.dto';
import { VerifyOtpDto } from '../users/dtos/verify-otp.dto';
import { SendResetOtpDto } from '../users/dtos/send-reset-otp.dto';
import { ResetPasswordDto } from '../users/dtos/reset-password.dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d in ms
};

@Controller('auth')
export class AuthController {
    constructor(private readonly usersService: UsersService) {}

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.usersService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...rest } = await this.usersService.login(dto);
        res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
        return rest;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.[REFRESH_COOKIE];
        const { refreshToken: newRefresh, ...rest } = await this.usersService.refreshTokens(refreshToken);
        res.cookie(REFRESH_COOKIE, newRefresh, COOKIE_OPTIONS);
        return rest;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie(REFRESH_COOKIE);
        return { message: 'Logged out successfully' };
    }

    // ─── Email Verification ──────────────────────────────────────────────────

    @Post('send-verification-otp')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtGuard)
    sendVerificationOtp(@CurrentUser() user: { id: number }) {
        return this.usersService.sendVerificationOtp(user.id);
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtGuard)
    verifyEmail(@CurrentUser() user: { id: number }, @Body() dto: VerifyOtpDto) {
        return this.usersService.verifyEmail(user.id, dto.code);
    }

    // ─── Password Reset ──────────────────────────────────────────────────────

    @Post('send-reset-otp')
    @HttpCode(HttpStatus.OK)
    sendResetOtp(@Body() dto: SendResetOtpDto) {
        return this.usersService.sendPasswordResetOtp(dto.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.usersService.resetPassword(dto.email, dto.code, dto.newPassword);
    }
}
