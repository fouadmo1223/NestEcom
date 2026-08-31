import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './coupon.entity';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponValidateController } from './coupon-validate.controller';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon]), AuthModule, CartModule],
    controllers: [CouponsController, CouponValidateController],
    providers: [CouponsService],
    exports: [CouponsService],
})
export class CouponsModule {}
