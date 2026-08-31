import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dtos/register.dto';
import { LoginDto } from '../users/dtos/login.dto';
import { VerifyOtpDto } from '../users/dtos/verify-otp.dto';
import { VerifyAccountDto, ResendVerificationDto } from '../users/dtos/verify-account.dto';
import { SendResetOtpDto } from '../users/dtos/send-reset-otp.dto';
import { ResetPasswordDto } from '../users/dtos/reset-password.dto';
import { GoogleExchangeDto } from './dtos/google-exchange.dto';
import { RefreshDto } from './dtos/refresh.dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import type { User } from '../users/user.entity';

const REFRESH_COOKIE = 'refresh_token';

/** Tight limiter for credential / OTP endpoints (5 hits per minute per IP). */
const SENSITIVE = { default: { limit: 5, ttl: 60_000 } } as const;

@Controller('auth')
export class AuthController {
    constructor(
        private readonly usersService: UsersService,
        private readonly config: ConfigService,
    ) {}

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private isNativeClient(req: Request): boolean {
        return String(req.headers['x-client'] ?? '').toLowerCase() === 'mobile';
    }

    private cookieOptions() {
        const isProd = this.config.get('NODE_ENV') === 'production';
        return {
            httpOnly: true,
            secure: isProd,
            // Cross-site cookie for the web/dashboard SPAs needs SameSite=None in prod.
            sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        };
    }

    /**
     * Web/dashboard: refresh token goes in an httpOnly cookie.
     * Native (X-Client: mobile): refresh token is returned in the body for
     * expo-secure-store — no cookie is set.
     */
    private deliverAuth<T extends object>(
        req: Request,
        res: Response,
        refreshToken: string,
        body: T,
    ): T | (T & { refreshToken: string }) {
        if (this.isNativeClient(req)) {
            return { ...body, refreshToken };
        }
        res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
        return body;
    }

    private extractRefreshToken(req: Request, dto?: RefreshDto): string | undefined {
        const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
        const fromBody = dto?.refreshToken;
        const header = req.headers.authorization;
        const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
        return fromCookie || fromBody || fromHeader;
    }

    // ─── Registration / Login ────────────────────────────────────────────────

    @Post('register')
    @Throttle(SENSITIVE)
    register(@Body() dto: RegisterDto) {
        return this.usersService.register(dto);
    }

    @Post('login')
    @Throttle(SENSITIVE)
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { refreshToken, ...rest } = await this.usersService.login(dto);
        return this.deliverAuth(req, res, refreshToken, rest);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Body() dto: RefreshDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const token = this.extractRefreshToken(req, dto);
        const { refreshToken, ...rest } = await this.usersService.refreshTokens(token ?? '');
        return this.deliverAuth(req, res, refreshToken, rest);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie(REFRESH_COOKIE, { path: '/' });
        return { message: 'Logged out successfully' };
    }

    // ─── Google OAuth ────────────────────────────────────────────────────────

    @Get('google')
    @UseGuards(AuthGuard('google'))
    googleLogin() {
        // Passport redirects to Google — no body needed.
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    googleCallback(@Req() req: Request, @Res() res: Response) {
        const user = req.user as User;
        const code = this.usersService.issueGoogleAuthCode(user);
        const target = this.config.get<string>(
            'OAUTH_SUCCESS_REDIRECT',
            `${this.config.get('WEB_URL', 'http://localhost:3000')}/auth/callback`,
        );
        const url = new URL(target);
        url.searchParams.set('code', code);
        return res.redirect(url.toString());
    }

    @Post('google/exchange')
    @Throttle(SENSITIVE)
    @HttpCode(HttpStatus.OK)
    async googleExchange(
        @Body() dto: GoogleExchangeDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { refreshToken, ...rest } = await this.usersService.exchangeGoogleAuthCode(dto.code);
        return this.deliverAuth(req, res, refreshToken, rest);
    }

    // ─── Email Verification ──────────────────────────────────────────────────

    @Post('send-verification-otp')
    @Throttle(SENSITIVE)
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

    /** Public verification for users who cannot log in yet (email + code). */
    @Post('verify-account')
    @Throttle(SENSITIVE)
    @HttpCode(HttpStatus.OK)
    verifyAccount(@Body() dto: VerifyAccountDto) {
        return this.usersService.verifyAccountByEmail(dto.email, dto.code);
    }

    @Post('resend-verification')
    @Throttle(SENSITIVE)
    @HttpCode(HttpStatus.OK)
    resendVerification(@Body() dto: ResendVerificationDto) {
        return this.usersService.resendVerificationByEmail(dto.email);
    }

    // ─── Password Reset ──────────────────────────────────────────────────────

    @Post('send-reset-otp')
    @Throttle(SENSITIVE)
    @HttpCode(HttpStatus.OK)
    sendResetOtp(@Body() dto: SendResetOtpDto) {
        return this.usersService.sendPasswordResetOtp(dto.email);
    }

    @Post('reset-password')
    @Throttle(SENSITIVE)
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.usersService.resetPassword(dto.email, dto.code, dto.newPassword);
    }
}
