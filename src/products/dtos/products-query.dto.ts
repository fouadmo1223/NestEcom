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

    @ApiProperty({ description: 'Filter to a single store (public storefront)', required: false })
    @IsOptional()
    @IsString()
    vendorSlug?: string;
}

/** Vendor-scoped product listing (own catalogue, all statuses). */
export class VendorProductsQueryDto extends ProductsQueryDto {
    @ApiProperty({ enum: ['draft', 'active', 'archived'], required: false })
    @IsOptional()
    @IsIn(['draft', 'active', 'archived'])
    status?: 'draft' | 'active' | 'archived';

    @ApiProperty({ description: 'Only products at or below this stock level', required: false })
    @IsOptional()
    @IsNumberString()
    lowStock?: string;

    @ApiProperty({ description: 'Admin: restrict to one vendor', required: false })
    @IsOptional()
    @IsNumberString()
    vendorId?: string;

    @ApiProperty({ description: 'Created on/after this ISO date', required: false })
    @IsOptional()
    @IsString()
    from?: string;

    @ApiProperty({ description: 'Created on/before this ISO date', required: false })
    @IsOptional()
    @IsString()
    to?: string;
}