import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dtos/register.dto';
import { LoginDto } from '../users/dtos/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly usersService: UsersService) {}

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.usersService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginDto) {
        return this.usersService.login(dto);
    }
}
