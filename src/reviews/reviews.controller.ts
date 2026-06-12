import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';

type CurrentUserPayload = { id: number; userType: UserType };

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get()
    getAll(@Query() { page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        return this.reviewsService.findAll(p, l);
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
