import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'notifications' })
@Index(['userId', 'readAt'])
@Index(['userId', 'createdAt'])
export class Notification {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  /** e.g. order.placed, vendor_order.shipped, payout.paid, review.created */
  @Column()
  type!: string;

  @Column()
  title!: string;

  @Column({ type: 'varchar', length: 500 })
  body!: string;

  /** Routing hints for the client, e.g. { orderId: 12, href: '/orders/12' }. */
  @Column({ type: 'json', nullable: true })
  data!: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
