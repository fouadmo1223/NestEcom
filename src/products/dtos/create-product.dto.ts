import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { ProductStatus } from '../product.entity';

@ApiTags('Products')
export class CreateProductDto {
    @ApiProperty({ example: 'Wireless Headphones', description: 'Product title', required: true })
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title!: string;

    @ApiProperty({ example: 'سماعات لاسلكية', description: 'Arabic title', required: false })
    @IsOptional()
    @IsString()
    titleAr?: string;

    @ApiProperty({ example: 99.99, description: 'Product price', required: true })
    @Transform(({ value }) => Number(value))
    @IsNumber({}, { message: 'Price must be a number' })
    @Min(0, { message: 'Price must be at least 0' })
    price!: number;

    @ApiProperty({ example: 129.99, description: 'Struck-through "was" price for a sale', required: false })
    @IsOptional()
    @Transform(({ value }) =>
        value === '' || value === null || value === undefined ? null : Number(value),
    )
    @ValidateIf((_o, v) => v !== null)
    @IsNumber({}, { message: 'Compare-at price must be a number' })
    @Min(0, { message: 'Compare-at price must be at least 0' })
    compareAtPrice?: number | null;

    @ApiProperty({ example: 'High-quality wireless headphones with noise cancellation', description: 'Product description', required: false })
    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description?: string;

    @ApiProperty({ description: 'Arabic description', required: false })
    @IsOptional()
    @IsString()
    descriptionAr?: string;

    @ApiProperty({ example: 1, description: 'Category ID that the product belongs to', required: false })
    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsNumber({}, { message: 'Category ID must be a number' })
    categoryId?: number;

    @ApiProperty({ example: 50, description: 'Available stock quantity', required: false })
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined || value === null || value === '' ? undefined : Number(value),
    )
    @IsInt({ message: 'Stock must be an integer' })
    @Min(0, { message: 'Stock must be at least 0' })
    stock?: number;

    @ApiProperty({ example: ['new', 'featured'], description: 'Product tags', enum: ['new', 'sale', 'featured'], isArray: true, required: false })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value))
    @IsArray()
    @IsIn(['new', 'sale', 'featured'], { each: true })
    tags?: string[];

    @ApiProperty({ enum: ProductStatus, required: false, description: 'Defaults to draft' })
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @ApiProperty({ description: 'Image URLs (when not uploading files)', required: false, isArray: true })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    @IsArray()
    @IsString({ each: true })
    imageUrls?: string[];

    @ApiProperty({
        description: 'Purchasable variants (JSON string in multipart, or array). Each: {name, price, stock, options?}',
        required: false,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value == null || value === '') return undefined;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    })
    @IsArray({ message: 'Variants must be an array' })
    variants?: unknown[];
}