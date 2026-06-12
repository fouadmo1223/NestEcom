import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './review.entity';
import { Product } from '../products/product.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Review, Product]), AuthModule],
    controllers: [ReviewsController],
    providers: [ReviewsService],
})
export class ReviewsModule {}