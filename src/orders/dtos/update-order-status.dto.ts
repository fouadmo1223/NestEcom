import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus, description: 'The new status of the order' })
    @IsEnum(OrderStatus)
    status!: OrderStatus;

    @ApiProperty({ example: '1Z999AA10123456784', description: 'The tracking number for the shipment', required: false })
    @IsOptional()
    @IsString()
    trackingNumber?: string;
}