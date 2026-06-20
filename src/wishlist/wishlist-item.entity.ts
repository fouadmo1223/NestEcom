import { ApiProperty } from '@nestjs/swagger';
import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity({ name: 'wishlist_items' })
@Unique(['user', 'product'])
export class WishlistItem {
    @ApiProperty({ example: 1, description: 'The unique identifier of the wishlist item' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @ApiProperty({ type: () => Product })
    @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
    product!: Product;

    @ApiProperty({ description: 'The date and time the item was added to the wishlist' })
    @CreateDateColumn()
    createdAt!: Date;
}