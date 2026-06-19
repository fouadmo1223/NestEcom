import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
}

@Entity({ name: 'coupons' })
export class Coupon {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', unique: true })
    code!: string;

    @Column({ type: 'enum', enum: DiscountType })
    discountType!: DiscountType;

    @Column('decimal', { precision: 10, scale: 2 })
    discountValue!: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    minOrderAmount!: number | null;

    @Column({ type: 'int', nullable: true })
    maxUses!: number | null;

    @Column({ type: 'int', default: 0 })
    usedCount!: number;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt!: Date | null;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
