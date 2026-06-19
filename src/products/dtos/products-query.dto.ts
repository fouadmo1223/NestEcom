import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class ProductsQueryDto extends PaginationDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsNumberString()
    categoryId?: string;

    @IsOptional()
    @IsNumberString()
    minPrice?: string;

    @IsOptional()
    @IsNumberString()
    maxPrice?: string;

    @IsOptional()
    @IsIn(['price', 'createdAt', 'avgRating'])
    sortBy?: 'price' | 'createdAt' | 'avgRating';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC';

    @IsOptional()
    @IsIn(['new', 'sale', 'featured'])
    tag?: 'new' | 'sale' | 'featured';
}
