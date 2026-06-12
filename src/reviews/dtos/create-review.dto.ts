import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
    @IsNumber()
    @IsInt({ message: 'Rating must be an integer' })
    @Min(1, { message: 'Rating must be at least 1' })
    @Max(5, { message: 'Rating must be at most 5' })
    rating!: number;

    @IsOptional()
    @IsString({ message: 'Comment must be a string' })
    comment?: string;

    @IsNotEmpty({ message: 'Product ID is required' })
    @IsNumber({}, { message: 'Product ID must be a number' })
    productId!: number;
}
