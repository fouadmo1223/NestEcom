import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(CartItem)
        private readonly cartRepository: Repository<CartItem>,
    ) {}

    async getCart(userId: number) {
        const items = await this.cartRepository.find({
            where: { user: { id: userId } },
            relations: { product: true },
        });
        const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
        return { items, total };
    }

    async addItem(userId: number, dto: AddToCartDto): Promise<CartItem> {
        const existing = await this.cartRepository.findOne({
            where: { user: { id: userId }, product: { id: dto.productId } },
        });

        if (existing) {
            existing.quantity += dto.quantity;
            return this.cartRepository.save(existing);
        }

        const item = this.cartRepository.create({
            user: { id: userId },
            product: { id: dto.productId },
            quantity: dto.quantity,
        });
        return this.cartRepository.save(item);
    }

    async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto): Promise<CartItem> {
        const item = await this.cartRepository.findOne({
            where: { id: itemId, user: { id: userId } },
        });
        if (!item) throw new NotFoundException('Cart item not found');
        item.quantity = dto.quantity;
        return this.cartRepository.save(item);
    }

    async removeItem(userId: number, itemId: number): Promise<{ message: string }> {
        const item = await this.cartRepository.findOne({
            where: { id: itemId, user: { id: userId } },
        });
        if (!item) throw new NotFoundException('Cart item not found');
        await this.cartRepository.remove(item);
        return { message: 'Item removed from cart' };
    }

    async clearCart(userId: number): Promise<{ message: string }> {
        await this.cartRepository.delete({ user: { id: userId } });
        return { message: 'Cart cleared' };
    }
}
