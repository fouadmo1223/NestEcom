import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrder } from './entities/customer-order.entity';
import { VendorOrder } from './entities/vendor-order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { VendorOrdersController } from './vendor-orders.controller';
import { CartItem } from '../cart/cart-item.entity';
import { Address } from '../addresses/address.entity';
import { Product } from '../products/product.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { CouponsModule } from '../coupons/coupons.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { ProductsModule } from '../products/products.module';
import { VendorsModule } from '../vendors/vendors.module';
import { MoneyModule } from '../money/money.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerOrder,
      VendorOrder,
      OrderItem,
      CartItem,
      Address,
      Product,
      Vendor,
    ]),
    CouponsModule,
    AuthModule,
    MailModule,
    ProductsModule,
    VendorsModule,
    MoneyModule,
  ],
  controllers: [OrdersController, VendorOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
