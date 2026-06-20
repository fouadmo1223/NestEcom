import { ApiProperty } from '@nestjs/swagger';
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
    @ApiProperty({ example: 1, description: 'The unique identifier of the order' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
    user!: User;

    @ApiProperty({ type: () => [OrderItem] })
    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
    items!: OrderItem[];

    @ApiProperty({ enum: OrderStatus, description: 'The current status of the order' })
    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status!: OrderStatus;

    @ApiProperty({ example: 99.98, description: 'The subtotal of the order before discounts and shipping' })
    @Column('decimal', { precision: 10, scale: 2 })
    subtotal!: number;

    @ApiProperty({ example: 10.0, description: 'The amount of discount applied to the order' })
    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    discountAmount!: number;

    @ApiProperty({ example: 5.0, description: 'The shipping cost for the order' })
    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    shippingCost!: number;

    @ApiProperty({ example: 94.98, description: 'The final total of the order' })
    @Column('decimal', { precision: 10, scale: 2 })
    total!: number;

    @ApiProperty({ example: 'SUMMER2024', description: 'The coupon code applied to the order' })
    @Column({ type: 'varchar', nullable: true })
    couponCode!: string | null;

    @ApiProperty({ description: 'The shipping address for the order' })
    @Column({ type: 'json' })
    shippingAddress!: Record<string, any>;

    @ApiProperty({ example: 'Please leave the package at the front door.', description: 'Notes for the order' })
    @Column({ type: 'varchar', nullable: true })
    notes!: string | null;

    @ApiProperty({ example: '1Z999AA10123456784', description: 'The tracking number for the shipment' })
    @Column({ type: 'varchar', nullable: true })
    trackingNumber!: string | null;

    @ApiProperty({ description: 'The date and time the order was created' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ description: 'The date and time the order was last updated' })
    @UpdateDateColumn()
    updatedAt!: Date;
}