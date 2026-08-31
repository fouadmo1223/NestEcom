import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../common/transformers/decimal.transformer';

/** Singleton row (id = 1) holding marketplace-wide configuration. */
@Entity({ name: 'platform_settings' })
export class PlatformSetting {
  @PrimaryColumn({ type: 'int', default: 1 })
  id!: number;

  @ApiProperty({ example: 0.1, description: 'Default commission rate (0–1)' })
  @Column('decimal', { precision: 5, scale: 4, default: 0.1, transformer: decimalTransformer })
  defaultCommissionRate!: number;

  @ApiProperty({ example: 'EGP' })
  @Column({ type: 'varchar', length: 8, default: 'EGP' })
  currency!: string;

  @ApiProperty({ example: 100, description: 'Minimum vendor payout amount' })
  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  minPayout!: number;

  @ApiProperty({ example: 5 })
  @Column({ type: 'int', default: 5 })
  lowStockThreshold!: number;

  @ApiProperty({ example: false })
  @Column({ default: false })
  reviewRequiresPurchase!: boolean;

  @ApiProperty({ example: true })
  @Column({ default: true })
  freeShippingEnabled!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}
