import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './coupon.entity';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon]), AuthModule],
    controllers: [CouponsController],
    providers: [CouponsService],
    exports: [CouponsService],
})
export class CouponsModule {}
