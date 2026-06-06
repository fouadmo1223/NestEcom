import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dtos/register.dto';
import { LoginDto } from '../users/dtos/login.dto';

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
}
