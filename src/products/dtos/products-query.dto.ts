import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class ProductsQueryDto extends PaginationDto {
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
