import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title!: string;

    @Transform(({ value }) => Number(value))
    @IsNumber({}, { message: 'Price must be a number' })
    @Min(0, { message: 'Price must be at least 0' })
    price!: number;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description?: string;

    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsNumber({}, { message: 'Category ID must be a number' })
    categoryId?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt({ message: 'Stock must be an integer' })
    @Min(0, { message: 'Stock must be at least 0' })
    stock?: number;

    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value))
    @IsArray()
    @IsIn(['new', 'sale', 'featured'], { each: true })
    tags?: string[];
}
