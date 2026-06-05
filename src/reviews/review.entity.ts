import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'reviews' })
export class Review {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    rating!: number;

    @Column({ type: 'varchar', nullable: true })
    comment!: string | null;

    @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
    product!: Product;

    @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
