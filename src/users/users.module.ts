import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Otp } from './otp.entity';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Otp]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                global: true,
                secret: config.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') as any },
            }),
        }),
        MailModule,
    ],
    controllers: [UsersController],
    providers: [UsersService, JwtGuard, RolesGuard],
    exports: [UsersService, JwtModule],
})
export class UsersModule {}
