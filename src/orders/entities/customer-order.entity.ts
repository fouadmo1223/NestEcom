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
import { User } from '../../users/user.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { VendorOrder } from './vendor-order.entity';

/** Roll-up status derived from the child VendorOrders. */
export enum CustomerOrderStatus {
  PENDING = 'pending',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  COD = 'cod',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  REFUNDED = 'refunded',
}

@Entity({ name: 'customer_orders' })
@Index(['userId', 'placedAt'])
@Index(['status', 'placedAt'])
export class CustomerOrder {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @ApiProperty({ type: () => [VendorOrder] })
  @OneToMany(() => VendorOrder, (vo) => vo.customerOrder, { cascade: true, eager: true })
  vendorOrders!: VendorOrder[];

  @ApiProperty({ enum: CustomerOrderStatus })
  @Column({ type: 'enum', enum: CustomerOrderStatus, default: CustomerOrderStatus.PENDING })
  status!: CustomerOrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.COD })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  discountTotal!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  shippingTotal!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  taxTotal!: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  grandTotal!: number;

  @Column({ type: 'varchar', length: 8, default: 'EGP' })
  currency!: string;

  @Column({ type: 'varchar', nullable: true })
  couponCode!: string | null;

  @Column({ type: 'json' })
  shippingAddress!: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  notes!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn()
  placedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
