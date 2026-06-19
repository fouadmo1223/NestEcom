import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity({ name: 'cart_items' })
@Unique(['user', 'product'])
export class CartItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
    product!: Product;

    @Column({ type: 'int', default: 1 })
    quantity!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
