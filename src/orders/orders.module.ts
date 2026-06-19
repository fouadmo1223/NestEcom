import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartItem } from '../cart/cart-item.entity';
import { Address } from '../addresses/address.entity';
import { Product } from '../products/product.entity';
import { CouponsModule } from '../coupons/coupons.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, CartItem, Address, Product]),
        CouponsModule,
        AuthModule,
        MailModule,
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
