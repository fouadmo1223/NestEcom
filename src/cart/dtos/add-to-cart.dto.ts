import { IsInt, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Cart')
export class AddToCartDto {
    @ApiProperty({ example: 1, description: 'ID of the product to add to cart', required: true })
    @IsInt()
    @IsPositive()
    productId!: number;

    @ApiProperty({ example: 1, description: 'Quantity of the product to add', default: 1, minimum: 1, required: true })
    @IsInt()
    @Min(1)
    quantity: number = 1;
}