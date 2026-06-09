import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';

@Module({
    imports: [UsersModule],
    controllers: [AuthController],
    providers: [JwtGuard, RolesGuard],
    exports: [JwtGuard, RolesGuard, UsersModule],
})
export class AuthModule {}
