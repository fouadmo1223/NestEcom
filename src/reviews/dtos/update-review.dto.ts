import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReviewDto {
    @ApiProperty({ example: 4, description: 'The updated rating given by the user (1-5)', required: false })
    @IsOptional()
    @IsNumber()
    @IsInt({ message: 'Rating must be an integer' })
    @Min(1, { message: 'Rating must be at least 1' })
    @Max(5, { message: 'Rating must be at most 5' })
    rating?: number;

    @ApiProperty({
        example: 'This product is great, but it could be better.',
        description: 'An optional updated comment about the product',
        required: false,
    })
    @IsOptional()
    @IsString({ message: 'Comment must be a string' })
    comment?: string;
}