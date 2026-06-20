import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity({ name: 'order_items' })
export class OrderItem {
    @ApiProperty({ example: 1, description: 'The unique identifier of the order item' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    order!: Order;

    @ApiProperty({ example: 1, description: 'The ID of the product' })
    @Column({ type: 'int' })
    productId!: number;

    @ApiProperty({ example: 'Gaming Mouse', description: 'The title of the product' })
    @Column()
    productTitle!: string;

    @ApiProperty({ example: 'http://example.com/image.jpg', description: 'The URL of the product image' })
    @Column({ type: 'varchar', nullable: true })
    productImage!: string | null;

    @ApiProperty({ example: 49.99, description: 'The price of a single unit of the product' })
    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice!: number;

    @ApiProperty({ example: 2, description: 'The quantity of the product ordered' })
    @Column({ type: 'int' })
    quantity!: number;

    @ApiProperty({ example: 99.98, description: 'The total price for this order item (unitPrice * quantity)' })
    @Column('decimal', { precision: 10, scale: 2 })
    total!: number;
}