import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { ProductStatus } from '../product.entity';

@ApiTags('Products')
export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titleAr?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be at least 0' })
  price?: number;

  @ApiProperty({ required: false, description: 'Struck-through "was" price. Send "" / null to clear.' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? null : Number(value),
  )
  @ValidateIf((_o, v) => v !== null)
  @IsNumber({}, { message: 'Compare-at price must be a number' })
  @Min(0, { message: 'Compare-at price must be at least 0' })
  compareAtPrice?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber({}, { message: 'Category ID must be a number' })
  categoryId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt({ message: 'Stock must be an integer' })
  @Min(0, { message: 'Stock must be at least 0' })
  stock?: number;

  @ApiProperty({ enum: ['new', 'sale', 'featured'], isArray: true, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value,
  )
  @IsArray()
  @IsIn(['new', 'sale', 'featured'], { each: true })
  tags?: string[];

  @ApiProperty({ enum: ProductStatus, required: false })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ description: 'Replace/append image URLs', required: false, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({ description: 'Replace the variant list (JSON string in multipart, or array).', required: false })
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

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
