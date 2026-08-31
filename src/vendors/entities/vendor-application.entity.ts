import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum VendorApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ApplicationDocument {
  url: string;
  label: string;
}

@Entity({ name: 'vendor_applications' })
export class VendorApplication {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @ApiProperty({ example: 'Nordic Supply Co.' })
  @Column({ type: 'varchar', length: 120 })
  proposedStoreName!: string;

  @ApiProperty({ example: '+201234567890' })
  @Column()
  contactPhone!: string;

  @Column({ type: 'varchar', nullable: true })
  contactEmail!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @Column({ type: 'json', default: () => "'[]'" })
  documents!: ApplicationDocument[];

  @ApiProperty({ enum: VendorApplicationStatus })
  @Column({
    type: 'enum',
    enum: VendorApplicationStatus,
    default: VendorApplicationStatus.PENDING,
  })
  status!: VendorApplicationStatus;

  @Column({ type: 'int', nullable: true })
  reviewedBy!: number | null;

  @Column({ type: 'varchar', nullable: true })
  reviewNote!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
