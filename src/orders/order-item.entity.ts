import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity({ name: 'order_items' })
export class OrderItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    order!: Order;

    @Column({ type: 'int' })
    productId!: number;

    @Column()
    productTitle!: string;

    @Column({ type: 'varchar', nullable: true })
    productImage!: string | null;

    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice!: number;

    @Column({ type: 'int' })
    quantity!: number;

    @Column('decimal', { precision: 10, scale: 2 })
    total!: number;
}
