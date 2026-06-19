import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity({ name: 'categories' })
export class Category {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', unique: true })
    name!: string;

    @Column({ type: 'varchar', nullable: true })
    image!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    createdBy!: User | null;

    @OneToMany(() => Product, (product) => product.category)
    products!: Product[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
