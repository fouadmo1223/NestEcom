import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum InventoryReason {
  MANUAL = 'manual',
  RESTOCK = 'restock',
  ADJUSTMENT = 'adjustment',
  CHECKOUT = 'checkout',
  CANCEL = 'cancel',
  INITIAL = 'initial',
}

/** Append-only stock movement history. Every stock write goes through here. */
@Entity({ name: 'inventory_logs' })
@Index(['productId', 'createdAt'])
export class InventoryLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productId!: number;

  @Column({ type: 'int', nullable: true })
  vendorId!: number | null;

  /** Signed delta applied to stock (e.g. +10, -2). */
  @Column({ type: 'int' })
  change!: number;

  @Column({ type: 'int' })
  resultingStock!: number;

  @Column({ type: 'enum', enum: InventoryReason, default: InventoryReason.MANUAL })
  reason!: InventoryReason;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @Column({ type: 'int', nullable: true })
  actorId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
