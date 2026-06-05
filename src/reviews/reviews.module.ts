import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './review.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Review])],
    controllers: [ReviewsController],
    providers: [ReviewsService],
})
export class ReviewsModule {}