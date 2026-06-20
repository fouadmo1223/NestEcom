import { IsInt, Min } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Cart')
export class UpdateCartItemDto {
    @ApiProperty({ example: 2, description: 'Updated quantity of the cart item', minimum: 1, required: true })
    @IsInt()
    @Min(1)
    quantity!: number;
}