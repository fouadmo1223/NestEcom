import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get()
    getAll() {
        return this.reviewsService.findAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.reviewsService.findOne(id);
    }

    @Get('product/:productId')
    getByProduct(@Param('productId', ParseIntPipe) productId: number) {
        return this.reviewsService.findByProduct(productId);
    }
}
