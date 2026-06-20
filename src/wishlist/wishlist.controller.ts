import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WishlistItem } from './wishlist-item.entity';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
@UseGuards(JwtGuard)
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) {}

    @Get()
    @ApiOperation({ summary: 'Get wishlist', description: 'Retrieves the wishlist of the current user.' })
    @ApiResponse({ status: 200, description: 'The user\'s wishlist.', type: [WishlistItem] })
    getWishlist(@CurrentUser() user: { id: number }) {
        return this.wishlistService.getWishlist(user.id);
    }

    @Post('toggle/:productId')
    @ApiOperation({
        summary: 'Toggle item in wishlist',
        description: 'Adds or removes a product from the user\'s wishlist.',
    })
    @ApiResponse({ status: 200, description: 'The item has been successfully added or removed.' })
    @ApiResponse({ status: 404, description: 'Product not found.' })
    @ApiParam({ name: 'productId', type: Number, description: 'The ID of the product to toggle.' })
    @HttpCode(HttpStatus.OK)
    toggle(@CurrentUser() user: { id: number }, @Param('productId', ParseIntPipe) productId: number) {
        return this.wishlistService.toggle(user.id, productId);
    }

    @Delete('items/:id')
    @ApiOperation({ summary: 'Remove item from wishlist', description: 'Removes an item from the user\'s wishlist.' })
    @ApiResponse({ status: 200, description: 'The item has been successfully removed.' })
    @ApiResponse({ status: 404, description: 'Wishlist item not found.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the wishlist item to remove.' })
    remove(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) itemId: number) {
        return this.wishlistService.remove(user.id, itemId);
    }
}