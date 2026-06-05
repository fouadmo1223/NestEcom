import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
   imports: [ProductsModule, ReviewsModule, UsersModule,TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '258258',
      database: 'nestjs',
      entities: [ProductsModule, ReviewsModule, UsersModule],
      synchronize: true,
   })],
   controllers: [],
   providers: [],
})
export class AppModule {}
