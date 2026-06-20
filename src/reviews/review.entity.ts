import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'reviews' })
export class Review {
    @ApiProperty({ example: 1, description: 'The unique identifier of the review' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: 5, description: 'The rating given by the user (1-5)' })
    @Column({ type: 'int' })
    rating!: number;

    @ApiProperty({ example: 'This product is amazing!', description: 'A comment about the product', nullable: true })
    @Column({ type: 'varchar', nullable: true })
    comment!: string | null;

    @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
    product!: Product;

    @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
    user!: User;

    @ApiProperty({ description: 'The date and time the review was created' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ description: 'The date and time the review was last updated' })
    @UpdateDateColumn()
    updatedAt!: Date;
}