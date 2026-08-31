import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

export enum VendorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'vendors' })
export class Vendor {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @ApiProperty({ enum: VendorStatus })
  @Column({ type: 'enum', enum: VendorStatus, default: VendorStatus.PENDING })
  status!: VendorStatus;

  /** Overrides the platform default commission rate (0–1). Null = use default. */
  @ApiProperty({ example: 0.12, nullable: true })
  @Column('decimal', {
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  commissionRate!: number | null;

  @ApiProperty({ example: 4.6 })
  @Column('decimal', { precision: 3, scale: 2, default: 0, transformer: decimalTransformer })
  ratingAverage!: number;

  @ApiProperty({ example: 128 })
  @Column({ type: 'int', default: 0 })
  ratingCount!: number;

  @ApiProperty({ example: 15230.5 })
  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  totalSales!: number;

  /** Settled earnings available to withdraw. */
  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  balance!: number;

  /** Earnings from orders not yet delivered/collected. */
  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  pendingBalance!: number;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  approvedBy!: number | null;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
