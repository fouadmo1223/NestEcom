import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity({ name: 'wishlist_items' })
@Unique(['user', 'product'])
export class WishlistItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
    product!: Product;

    @CreateDateColumn()
    createdAt!: Date;
}
