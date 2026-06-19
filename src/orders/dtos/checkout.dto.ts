import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CheckoutDto {
    @IsInt()
    @IsPositive()
    addressId!: number;

    @IsOptional()
    @IsString()
    couponCode?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
