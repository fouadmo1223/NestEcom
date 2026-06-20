import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity({ name: 'categories' })
export class Category {
    @ApiProperty({ example: 1, description: 'The unique identifier of the category' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: 'Electronics', description: 'The name of the category' })
    @Column({ type: 'varchar', unique: true })
    name!: string;

    @ApiProperty({ example: 'http://example.com/image.jpg', description: 'The URL of the category image' })
    @Column({ type: 'varchar', nullable: true })
    image!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    createdBy!: User | null;

    @OneToMany(() => Product, (product) => product.category)
    products!: Product[];

    @ApiProperty({ description: 'The date and time the category was created' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ description: 'The date and time the category was last updated' })
    @UpdateDateColumn()
    updatedAt!: Date;
}