import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '../coupon.entity';

export class CreateCouponDto {
    @ApiProperty({ example: 'SUMMER2024', description: 'The coupon code' })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => String(value).toUpperCase().trim())
    code!: string;

    @ApiProperty({ enum: DiscountType, description: 'The type of discount (percentage or fixed)' })
    @IsEnum(DiscountType)
    discountType!: DiscountType;

    @ApiProperty({ example: 10, description: 'The value of the discount' })
    @IsNumber()
    @Min(0)
    discountValue!: number;

    @ApiProperty({ example: 50, description: 'The minimum order amount for the coupon to be valid', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrderAmount?: number;

    @ApiProperty({ example: 100, description: 'The maximum number of times the coupon can be used', required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxUses?: number;

    @ApiProperty({ example: '2024-12-31T23:59:59.999Z', description: 'The expiration date of the coupon', required: false })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined))
    @IsDate()
    expiresAt?: Date;

    @ApiProperty({ example: true, description: 'Whether the coupon is active', required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}