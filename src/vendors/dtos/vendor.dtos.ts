import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

class ApplicationDocumentDto {
  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  label!: string;
}

export class ApplyVendorDto {
  @ApiProperty({ example: 'Nordic Supply Co.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  proposedStoreName!: string;

  @ApiProperty({ example: '+201234567890' })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  contactPhone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: [ApplicationDocumentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationDocumentDto)
  documents?: ApplicationDocumentDto[];
}

export class UpdateStoreDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  supportPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  returnsPolicy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shippingPolicy?: string;
}

export enum ApplicationReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewApplicationDto {
  @ApiProperty({ enum: ApplicationReviewAction })
  @IsEnum(ApplicationReviewAction)
  action!: ApplicationReviewAction;

  @ApiProperty({ required: false, description: 'Required when rejecting' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ required: false, description: 'Commission rate override (0–1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;
}

export class CreateVendorDto {
  @ApiProperty({ description: 'Existing user id to promote to vendor', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  userId?: number;

  @ApiProperty({ description: 'Or the email of the user to promote', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Nordic Supply Co.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  storeName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;
}

export enum VendorAdminAction {
  SUSPEND = 'suspend',
  REACTIVATE = 'reactivate',
}

export class UpdateVendorAdminDto {
  @ApiProperty({ enum: VendorAdminAction, required: false })
  @IsOptional()
  @IsEnum(VendorAdminAction)
  action?: VendorAdminAction;

  @ApiProperty({ required: false, description: 'Commission rate override (0–1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class VendorListQueryDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ['rating', 'sales', 'newest'] })
  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'sales' | 'newest';
}

export class AdminVendorListQueryDto extends VendorListQueryDto {
  @ApiProperty({ required: false, enum: ['pending', 'approved', 'rejected', 'suspended'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['user', 'admin', 'super_admin'] })
  @IsString()
  @IsEnum({ user: 'user', admin: 'admin', super_admin: 'super_admin' })
  role!: 'user' | 'admin' | 'super_admin';
}
