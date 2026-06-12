import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';

type CurrentUserPayload = { id: number; userType: UserType };

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get()
    getAll() {
        return this.reviewsService.findAll();
    }

    @Get('product/:productId')
    getByProduct(@Param('productId', ParseIntPipe) productId: number) {
        return this.reviewsService.findByProduct(productId);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.reviewsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtGuard)
    create(@Body() dto: CreateReviewDto, @CurrentUser() user: CurrentUserPayload) {
        return this.reviewsService.create(dto, user.id);
    }

    @Patch(':id')
    @UseGuards(JwtGuard)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateReviewDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.reviewsService.update(id, dto, user);
    }

    @Delete(':id')
    @UseGuards(JwtGuard)
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.reviewsService.delete(id, user);
    }
}
