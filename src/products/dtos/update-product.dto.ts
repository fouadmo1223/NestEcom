import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
export class UpdateProductDto {
    @ApiProperty({ example: 'Wireless Headphones', description: 'Product title', required: false })
    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    title?: string;

    @ApiProperty({ example: 99.99, description: 'Product price', required: false })
    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
    @IsNumber({}, { message: 'Price must be a number' })
    @Min(0, { message: 'Price must be at least 0' })
    price?: number;

    @ApiProperty({ example: 'High-quality wireless headphones with noise cancellation', description: 'Product description', required: false })
    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description?: string;

    @ApiProperty({ example: 1, description: 'Category ID that the product belongs to', required: false })
    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsNumber({}, { message: 'Category ID must be a number' })
    categoryId?: number;

    @ApiProperty({ example: 50, description: 'Available stock quantity', required: false })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt({ message: 'Stock must be an integer' })
    @Min(0, { message: 'Stock must be at least 0' })
    stock?: number;
}