import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING    = 'pending',
    CONFIRMED  = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED    = 'shipped',
    DELIVERED  = 'delivered',
    CANCELLED  = 'cancelled',
}

@Entity({ name: 'orders' })
export class Order {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
    user!: User;

    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
    items!: OrderItem[];

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status!: OrderStatus;

    @Column('decimal', { precision: 10, scale: 2 })
    subtotal!: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    discountAmount!: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    shippingCost!: number;

    @Column('decimal', { precision: 10, scale: 2 })
    total!: number;

    @Column({ type: 'varchar', nullable: true })
    couponCode!: string | null;

    @Column({ type: 'json' })
    shippingAddress!: Record<string, any>;

    @Column({ type: 'varchar', nullable: true })
    notes!: string | null;

    @Column({ type: 'varchar', nullable: true })
    trackingNumber!: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
