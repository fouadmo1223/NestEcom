import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { VendorOrder } from './vendor-order.entity';

@Entity({ name: 'order_items' })
@Index(['productId'])
export class OrderItem {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => VendorOrder, (vo) => vo.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorOrderId' })
  vendorOrder!: VendorOrder;

  @Column()
  vendorOrderId!: number;

  @Column()
  productId!: number;

  @Column()
  vendorId!: number;

  @Column()
  productTitle!: string;

  @Column({ type: 'varchar', nullable: true })
  productImage!: string | null;

  @Column('decimal', { precision: 10, scale: 2, transformer: decimalTransformer })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  lineTotal!: number;
}
