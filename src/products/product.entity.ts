import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Review } from '../reviews/review.entity';
import { User } from '../users/user.entity';

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

    @ManyToOne(() => User, { onDelete: 'CASCADE', })
    createdBy!: User ;

    @OneToMany(() => Review, (review) => review.product)
    reviews!: Review[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
