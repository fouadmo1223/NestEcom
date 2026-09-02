import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadModule } from './uploads/upload.module';
import { MailModule } from './mail/mail.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressesModule } from './addresses/addresses.module';
import { CouponsModule } from './coupons/coupons.module';
import { OrdersModule } from './orders/orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { VendorsModule } from './vendors/vendors.module';
import { MoneyModule } from './money/money.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlatformModule } from './platform/platform.module';
import { AuditModule } from './common/audit/audit.module';
import { VariantAttributesModule } from './variant-attributes/variant-attributes.module';
import { LoggerMiddleware } from './utils/middleware/logger.middleware';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './db/database.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuditModule,
    PlatformModule,
    NotificationsModule,

    ProductsModule,
    ReviewsModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    VariantAttributesModule,
    UploadModule,
    MailModule,
    CartModule,
    WishlistModule,
    AddressesModule,
    CouponsModule,
    OrdersModule,
    AnalyticsModule,
    VendorsModule,
    MoneyModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // Global ceiling for normal browsing traffic. Sensitive auth routes
          // apply a tighter per-route @Throttle (see AuthController).
          ttl: 60_000,
          limit: 300,
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
