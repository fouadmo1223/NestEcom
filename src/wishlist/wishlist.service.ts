import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './wishlist-item.entity';

@Injectable()
export class WishlistService {
    constructor(
        @InjectRepository(WishlistItem)
        private readonly wishlistRepository: Repository<WishlistItem>,
    ) {}

    async getWishlist(userId: number) {
        const items = await this.wishlistRepository.find({
            where: { user: { id: userId } },
            relations: { product: true },
        });
        return { items, total: items.length };
    }

    async toggle(userId: number, productId: number): Promise<{ message: string; added: boolean }> {
        const existing = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, product: { id: productId } },
        });

        if (existing) {
            await this.wishlistRepository.remove(existing);
            return { message: 'Removed from wishlist', added: false };
        }

        const item = this.wishlistRepository.create({
            user: { id: userId },
            product: { id: productId },
        });
        await this.wishlistRepository.save(item);
        return { message: 'Added to wishlist', added: true };
    }

    async remove(userId: number, itemId: number): Promise<{ message: string }> {
        await this.wishlistRepository.delete({ id: itemId, user: { id: userId } });
        return { message: 'Removed from wishlist' };
    }
}
