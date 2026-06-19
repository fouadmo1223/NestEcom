import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('wishlist')
@UseGuards(JwtGuard)
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) {}

    @Get()
    getWishlist(@CurrentUser() user: { id: number }) {
        return this.wishlistService.getWishlist(user.id);
    }

    @Post('toggle/:productId')
    @HttpCode(HttpStatus.OK)
    toggle(@CurrentUser() user: { id: number }, @Param('productId', ParseIntPipe) productId: number) {
        return this.wishlistService.toggle(user.id, productId);
    }

    @Delete('items/:id')
    remove(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) itemId: number) {
        return this.wishlistService.remove(user.id, itemId);
    }
}
