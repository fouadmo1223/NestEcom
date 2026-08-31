import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

export enum LedgerEntryType {
  EARNING = 'earning',
  COMMISSION = 'commission',
  REFUND = 'refund',
  PAYOUT = 'payout',
  ADJUSTMENT = 'adjustment',
}

/**
 * Append-only record of every movement of a vendor's *available* balance.
 * `balanceAfter` is the vendor balance immediately after this entry.
 */
@Entity({ name: 'ledger_entries' })
@Index(['vendorId', 'createdAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  vendorId!: number;

  @Column({ type: 'int', nullable: true })
  vendorOrderId!: number | null;

  @Column({ type: 'enum', enum: LedgerEntryType })
  type!: LedgerEntryType;

  /** Signed — credits are positive, debits (payouts) negative. */
  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  balanceAfter!: number;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
