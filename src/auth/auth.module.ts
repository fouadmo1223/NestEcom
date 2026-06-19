import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { GoogleStrategy } from './google.strategy';

@Module({
    imports: [UsersModule, PassportModule],
    controllers: [AuthController],
    providers: [JwtGuard, RolesGuard, GoogleStrategy],
    exports: [JwtGuard, RolesGuard, UsersModule],
})
export class AuthModule {}
