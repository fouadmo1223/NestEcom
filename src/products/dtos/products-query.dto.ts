import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class ProductsQueryDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsNumberString()
    categoryId?: string;

    @IsOptional()
    @IsNumberString()
    minPrice?: string;

    @IsOptional()
    @IsNumberString()
    maxPrice?: string;
}
