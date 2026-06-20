import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CheckoutDto {
    @ApiProperty({ example: 1, description: 'The ID of the shipping address' })
    @IsInt()
    @IsPositive()
    addressId!: number;

    @ApiProperty({ example: 'SUMMER2024', description: 'An optional coupon code to apply to the order', required: false })
    @IsOptional()
    @IsString()
    couponCode?: string;

    @ApiProperty({ example: 'Please leave the package at the front door.', description: 'Optional notes for the order', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}