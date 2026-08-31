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
import { Vendor } from './vendor.entity';

export interface StorePolicies {
  returns?: string;
  shipping?: string;
}

@Entity({ name: 'stores' })
export class Store {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor!: Vendor;

  @Column()
  vendorId!: number;

  @ApiProperty({ example: 'Nordic Supply Co.' })
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @ApiProperty({ example: 'nordic-supply-co' })
  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ type: 'varchar', nullable: true })
  logo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  coverImage!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  supportEmail!: string | null;

  @Column({ type: 'varchar', nullable: true })
  supportPhone!: string | null;

  /** Ship-from address — used by the shipping engine in a later phase. */
  @Column({ type: 'json', nullable: true })
  originAddress!: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  policies!: StorePolicies | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
