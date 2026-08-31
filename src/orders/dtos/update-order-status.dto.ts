import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VendorOrderStatus } from '../entities/vendor-order.entity';

export class UpdateVendorOrderStatusDto {
  @ApiProperty({ enum: VendorOrderStatus })
  @IsEnum(VendorOrderStatus)
  status!: VendorOrderStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  carrier?: string;
}

export class CancelVendorOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
