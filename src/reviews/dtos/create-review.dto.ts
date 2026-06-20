import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
    @ApiProperty({ example: 5, description: 'The rating given by the user (1-5)' })
    @IsNumber()
    @IsInt({ message: 'Rating must be an integer' })
    @Min(1, { message: 'Rating must be at least 1' })
    @Max(5, { message: 'Rating must be at most 5' })
    rating!: number;

    @ApiProperty({ example: 'This product is amazing!', description: 'An optional comment about the product', required: false })
    @IsOptional()
    @IsString({ message: 'Comment must be a string' })
    comment?: string;

    @ApiProperty({ example: 1, description: 'The ID of the product being reviewed' })
    @IsNotEmpty({ message: 'Product ID is required' })
    @IsNumber({}, { message: 'Product ID must be a number' })
    productId!: number;
}