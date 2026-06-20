import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class ProductsQueryDto extends PaginationDto {
    @ApiProperty({ description: 'Filter by product title', required: false })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ description: 'Search for products by keyword', required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ description: 'Filter by category ID', required: false })
    @IsOptional()
    @IsNumberString()
    categoryId?: string;

    @ApiProperty({ description: 'Filter by minimum price', required: false })
    @IsOptional()
    @IsNumberString()
    minPrice?: string;

    @ApiProperty({ description: 'Filter by maximum price', required: false })
    @IsOptional()
    @IsNumberString()
    maxPrice?: string;

    @ApiProperty({ description: 'Sort products by a specific field', enum: ['price', 'createdAt', 'avgRating'], required: false })
    @IsOptional()
    @IsIn(['price', 'createdAt', 'avgRating'])
    sortBy?: 'price' | 'createdAt' | 'avgRating';

    @ApiProperty({ description: 'Specify the sort order', enum: ['ASC', 'DESC'], required: false })
    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC';

    @ApiProperty({ description: 'Filter by a specific tag', enum: ['new', 'sale', 'featured'], required: false })
    @IsOptional()
    @IsIn(['new', 'sale', 'featured'])
    tag?: 'new' | 'sale' | 'featured';
}