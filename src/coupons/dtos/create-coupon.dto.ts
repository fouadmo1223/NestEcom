import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '../coupon.entity';

export class CreateCouponDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => String(value).toUpperCase().trim())
    code!: string;

    @IsEnum(DiscountType)
    discountType!: DiscountType;

    @IsNumber()
    @Min(0)
    discountValue!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrderAmount?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxUses?: number;

    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined))
    @IsDate()
    expiresAt?: Date;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
