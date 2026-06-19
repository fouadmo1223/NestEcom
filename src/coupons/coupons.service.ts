import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, DiscountType } from './coupon.entity';
import { CreateCouponDto } from './dtos/create-coupon.dto';

@Injectable()
export class CouponsService {
    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepo: Repository<Coupon>,
    ) {}

    findAll(): Promise<Coupon[]> {
        return this.couponRepo.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: number): Promise<Coupon> {
        const coupon = await this.couponRepo.findOneBy({ id });
        if (!coupon) throw new NotFoundException('Coupon not found');
        return coupon;
    }

    async create(dto: CreateCouponDto): Promise<Coupon> {
        const coupon = this.couponRepo.create({
            ...dto,
            minOrderAmount: dto.minOrderAmount ?? null,
            maxUses: dto.maxUses ?? null,
            expiresAt: dto.expiresAt ?? null,
        });
        return this.couponRepo.save(coupon);
    }

    async deactivate(id: number): Promise<Coupon> {
        const coupon = await this.findOne(id);
        coupon.isActive = false;
        return this.couponRepo.save(coupon);
    }

    async remove(id: number): Promise<{ message: string }> {
        const coupon = await this.findOne(id);
        await this.couponRepo.remove(coupon);
        return { message: 'Coupon deleted' };
    }

    async validate(code: string, subtotal: number): Promise<{ coupon: Coupon; discountAmount: number }> {
        const coupon = await this.couponRepo.findOneBy({ code: code.toUpperCase() });

        if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or inactive coupon');
        if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon has expired');
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached');
        if (coupon.minOrderAmount !== null && subtotal < Number(coupon.minOrderAmount)) {
            throw new BadRequestException(`Minimum order amount for this coupon is ${coupon.minOrderAmount}`);
        }

        let discountAmount: number;
        if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = Math.min(subtotal, (subtotal * Number(coupon.discountValue)) / 100);
        } else {
            discountAmount = Math.min(subtotal, Number(coupon.discountValue));
        }

        return { coupon, discountAmount: Math.round(discountAmount * 100) / 100 };
    }

    async incrementUsage(couponId: number): Promise<void> {
        await this.couponRepo.increment({ id: couponId }, 'usedCount', 1);
    }
}
