import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export enum ReviewStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

@Entity({ name: 'reviews' })
@Index(['user', 'product'], { unique: true })
@Index(['product', 'status'])
export class Review {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 5 })
  @Column({ type: 'int' })
  rating!: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  comment!: string | null;

  @ApiProperty({ description: 'The reviewer bought and received this product' })
  @Column({ default: false })
  isVerifiedPurchase!: boolean;

  @ApiProperty({ enum: ReviewStatus })
  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PUBLISHED })
  status!: ReviewStatus;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  vendorReply!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  vendorRepliedAt!: Date | null;

  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  product!: Product;

  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  user!: User;

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}
