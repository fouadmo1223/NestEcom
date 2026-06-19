import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('cart')
@UseGuards(JwtGuard)
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get()
    getCart(@CurrentUser() user: { id: number }) {
        return this.cartService.getCart(user.id);
    }

    @Post('items')
    addItem(@CurrentUser() user: { id: number }, @Body() dto: AddToCartDto) {
        return this.cartService.addItem(user.id, dto);
    }

    @Patch('items/:id')
    updateItem(
        @CurrentUser() user: { id: number },
        @Param('id', ParseIntPipe) itemId: number,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.updateItem(user.id, itemId, dto);
    }

    @Delete('items/:id')
    removeItem(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) itemId: number) {
        return this.cartService.removeItem(user.id, itemId);
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    clearCart(@CurrentUser() user: { id: number }) {
        return this.cartService.clearCart(user.id);
    }
}
