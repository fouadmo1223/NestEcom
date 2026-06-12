import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Review } from '../reviews/review.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';

@Entity({ name: 'products' })
export class Product {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    title!: string;

    @Column({ type: 'varchar', unique: true })
    slug!: string;

    @Column('decimal', { precision: 10, scale: 2 })
    price!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description!: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
    createdBy!: User;

    @ManyToOne(() => Category, (category) => category.products, { onDelete: 'SET NULL', nullable: true, eager: true })
    category!: Category | null;

    @OneToMany(() => Review, (review) => review.product, { eager: true })
    reviews!: Review[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
