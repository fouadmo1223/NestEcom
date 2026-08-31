import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrder } from '../orders/entities/customer-order.entity';
import { VendorOrder } from '../orders/entities/vendor-order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { User } from '../users/user.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { VendorAnalyticsController } from './vendor-analytics.controller';
import { AuthModule } from '../auth/auth.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerOrder, VendorOrder, OrderItem, User, Vendor]),
    AuthModule,
    VendorsModule,
  ],
  controllers: [AnalyticsController, AdminAnalyticsController, VendorAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
