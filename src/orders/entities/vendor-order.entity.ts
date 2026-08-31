import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { CustomerOrder } from './customer-order.entity';
import { OrderItem } from './order-item.entity';

export enum VendorOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/** The advancing lifecycle — each step may only move forward (or to cancelled). */
export const VENDOR_ORDER_FLOW: VendorOrderStatus[] = [
  VendorOrderStatus.PENDING,
  VendorOrderStatus.CONFIRMED,
  VendorOrderStatus.PROCESSING,
  VendorOrderStatus.SHIPPED,
  VendorOrderStatus.DELIVERED,
];

@Entity({ name: 'vendor_orders' })
@Index(['vendorId', 'status'])
@Index(['vendorId', 'createdAt'])
export class VendorOrder {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CustomerOrder, (co) => co.vendorOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerOrderId' })
  customerOrder!: CustomerOrder;

  @Column()
  customerOrderId!: number;

  @Index()
  @Column()
  vendorId!: number;

  @ApiProperty({ type: () => [OrderItem] })
  @OneToMany(() => OrderItem, (item) => item.vendorOrder, { cascade: true, eager: true })
  items!: OrderItem[];

  @ApiProperty({ enum: VendorOrderStatus })
  @Column({ type: 'enum', enum: VendorOrderStatus, default: VendorOrderStatus.PENDING })
  status!: VendorOrderStatus;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  discountAllocated!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  shippingAllocated!: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  total!: number;

  /** Frozen at checkout — later rate changes never rewrite history. */
  @Column('decimal', { precision: 5, scale: 4, transformer: decimalTransformer })
  commissionRate!: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  commissionAmount!: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  vendorEarnings!: number;

  @Column({ type: 'varchar', nullable: true })
  trackingNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  carrier!: string | null;

  @Column({ type: 'varchar', nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
