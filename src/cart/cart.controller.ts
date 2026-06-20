import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CartItem } from './cart-item.entity';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtGuard)
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get()
    @ApiOperation({ summary: 'Get user cart', description: 'Retrieves the current user\'s shopping cart.' })
    @ApiResponse({ status: 200, description: 'Returns the user\'s cart.', type: [CartItem] })
    getCart(@CurrentUser() user: { id: number }) {
        return this.cartService.getCart(user.id);
    }

    @Post('items')
    @ApiOperation({ summary: 'Add item to cart', description: 'Adds a product to the user\'s cart.' })
    @ApiBody({ type: AddToCartDto })
    @ApiResponse({ status: 201, description: 'Item added successfully.', type: CartItem })
    addItem(@CurrentUser() user: { id: number }, @Body() dto: AddToCartDto) {
        return this.cartService.addItem(user.id, dto);
    }

    @Patch('items/:id')
    @ApiOperation({ summary: 'Update cart item quantity', description: 'Updates the quantity of an item in the user\'s cart.' })
    @ApiParam({ name: 'id', type: Number, description: 'Cart item ID' })
    @ApiBody({ type: UpdateCartItemDto })
    @ApiResponse({ status: 200, description: 'Item updated successfully.', type: CartItem })
    updateItem(
        @CurrentUser() user: { id: number },
        @Param('id', ParseIntPipe) itemId: number,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.updateItem(user.id, itemId, dto);
    }

    @Delete('items/:id')
    @ApiOperation({ summary: 'Remove item from cart', description: 'Removes an item from the user\'s cart.' })
    @ApiParam({ name: 'id', type: Number, description: 'Cart item ID' })
    @ApiResponse({ status: 200, description: 'Item removed successfully.' })
    removeItem(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) itemId: number) {
        return this.cartService.removeItem(user.id, itemId);
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Clear cart', description: 'Removes all items from the user\'s cart.' })
    @ApiResponse({ status: 200, description: 'Cart cleared successfully.' })
    clearCart(@CurrentUser() user: { id: number }) {
        return this.cartService.clearCart(user.id);
    }
}