import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Review } from './review.entity';

type CurrentUserPayload = { id: number; userType: UserType };

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get()
    @ApiOperation({ summary: 'Get all reviews', description: 'Retrieves all reviews with pagination.' })
    @ApiResponse({ status: 200, description: 'A list of all reviews.', type: [Review] })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination.' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page.' })
    getAll(@Query() { page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        return this.reviewsService.findAll(p, l);
    }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Get reviews by product', description: 'Retrieves all reviews for a specific product.' })
    @ApiResponse({ status: 200, description: 'A list of reviews for the specified product.', type: [Review] })
    @ApiParam({ name: 'productId', type: Number, description: 'The ID of the product.' })
    getByProduct(@Param('productId', ParseIntPipe) productId: number) {
        return this.reviewsService.findByProduct(productId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one review', description: 'Retrieves a single review by its ID.' })
    @ApiResponse({ status: 200, description: 'The requested review.', type: Review })
    @ApiResponse({ status: 404, description: 'Review not found.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the review.' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.reviewsService.findOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(JwtGuard)
    @ApiOperation({ summary: 'Create a review', description: 'Creates a new review for a product.' })
    @ApiResponse({ status: 201, description: 'The review has been successfully created.', type: Review })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    @ApiResponse({ status: 404, description: 'Product not found.' })
    create(@Body() dto: CreateReviewDto, @CurrentUser() user: CurrentUserPayload) {
        return this.reviewsService.create(dto, user.id);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(JwtGuard)
    @ApiOperation({ summary: 'Update a review', description: 'Updates an existing review.' })
    @ApiResponse({ status: 200, description: 'The review has been successfully updated.', type: Review })
    @ApiResponse({ status: 404, description: 'Review not found.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the review to update.' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateReviewDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.reviewsService.update(id, dto, user);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(JwtGuard)
    @ApiOperation({ summary: 'Delete a review', description: 'Deletes a review.' })
    @ApiResponse({ status: 200, description: 'The review has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Review not found.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the review to delete.' })
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.reviewsService.delete(id, user);
    }
}