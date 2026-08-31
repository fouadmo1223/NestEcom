import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

export enum PayoutStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
}

@Entity({ name: 'payouts' })
@Index(['vendorId', 'status'])
export class Payout {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  vendorId!: number;

  @ApiProperty({ example: 250.0 })
  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @ApiProperty({ enum: PayoutStatus })
  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.REQUESTED })
  status!: PayoutStatus;

  /** Free-form payout method the vendor supplied (bank / wallet reference). */
  @Column({ type: 'varchar', nullable: true })
  method!: string | null;

  /** Set by the admin when marking paid (transfer reference). */
  @Column({ type: 'varchar', nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @Column({ type: 'int', nullable: true })
  processedBy!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn()
  requestedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
