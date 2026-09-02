import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class MyOrdersQueryDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class VendorOrdersQueryDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Search by product title or order id' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  fromDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  to?: string;
}

export class AdminOrdersQueryDto extends VendorOrdersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  vendorId?: string;

  @ApiProperty({ required: false, enum: ['pending', 'partially_fulfilled', 'fulfilled', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'partially_fulfilled', 'fulfilled', 'cancelled'])
  rollupStatus?: string;

  @ApiProperty({ required: false, description: 'Minimum order total' })
  @IsOptional()
  @IsNumberString()
  minTotal?: string;

  @ApiProperty({ required: false, description: 'Maximum order total' })
  @IsOptional()
  @IsNumberString()
  maxTotal?: string;

  @ApiProperty({ required: false, enum: ['newest', 'oldest'] })
  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sort?: 'newest' | 'oldest';
}
