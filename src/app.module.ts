import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadModule } from './uploads/upload.module';
import { MailModule } from './mail/mail.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
   imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRootAsync({
         imports: [ConfigModule],
         inject: [ConfigService],
         useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get<string>('DB_HOST'),
            port: config.get<number>('DB_PORT'),
            username: config.get<string>('DB_USERNAME'),
            password: config.get<string>('DB_PASSWORD'),
            database: config.get<string>('DB_NAME'),
            autoLoadEntities: true,
            synchronize: config.get<string>('NODE_ENV') !== 'production',
         }),
      }),
      ProductsModule,
      ReviewsModule,
      UsersModule,
      AuthModule,
      CategoriesModule,
      UploadModule,
      MailModule,
      CartModule,
      WishlistModule,
   ],
   controllers: [],
   providers: [
      
   ],
})
export class AppModule {}
