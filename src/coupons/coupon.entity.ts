import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
}

@Entity({ name: 'coupons' })
export class Coupon {
    @ApiProperty({ example: 1, description: 'The unique identifier of the coupon' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: 'SUMMER2024', description: 'The coupon code' })
    @Column({ type: 'varchar', unique: true })
    code!: string;

    @ApiProperty({ enum: DiscountType, description: 'The type of discount' })
    @Column({ type: 'enum', enum: DiscountType })
    discountType!: DiscountType;

    @ApiProperty({ example: 10.0, description: 'The value of the discount' })
    @Column('decimal', { precision: 10, scale: 2 })
    discountValue!: number;

    @ApiProperty({ example: 50.0, description: 'The minimum order amount for the coupon to be valid' })
    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    minOrderAmount!: number | null;

    @ApiProperty({ example: 100, description: 'The maximum number of times the coupon can be used' })
    @Column({ type: 'int', nullable: true })
    maxUses!: number | null;

    @ApiProperty({ example: 10, description: 'The number of times the coupon has been used' })
    @Column({ type: 'int', default: 0 })
    usedCount!: number;

    @ApiProperty({ description: 'The expiration date of the coupon' })
    @Column({ type: 'timestamp', nullable: true })
    expiresAt!: Date | null;

    @ApiProperty({ example: true, description: 'Whether the coupon is active' })
    @Column({ default: true })
    isActive!: boolean;

    @ApiProperty({ description: 'The date and time the coupon was created' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ description: 'The date and time the coupon was last updated' })
    @UpdateDateColumn()
    updatedAt!: Date;
}