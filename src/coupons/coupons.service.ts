import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponScope, DiscountType } from './coupon.entity';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';
import { AuditService } from '../common/audit/audit.service';

export interface CartGroupInput {
  vendorId: number;
  subtotal: number;
}

export interface CouponEvaluation {
  coupon: Coupon;
  discountTotal: number;
  /** Per-vendor discount, pro-rata across eligible groups. */
  allocations: { vendorId: number; amount: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    private readonly audit: AuditService,
  ) {}

  findAll(): Promise<Coupon[]> {
    return this.couponRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Coupon> {
    const coupon = await this.couponRepo.findOneBy({ id });
    if (!coupon) throw AppError.notFound('Coupon not found');
    return coupon;
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const coupon = this.couponRepo.create({
      ...dto,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxUses: dto.maxUses ?? null,
      expiresAt: dto.expiresAt ?? null,
      scope: dto.scope ?? CouponScope.PLATFORM,
      vendorId: dto.scope === CouponScope.VENDOR ? (dto.vendorId ?? null) : null,
    });
    const saved = await this.couponRepo.save(coupon);
    await this.audit.record({
      action: 'coupon.created',
      entityType: 'coupon',
      entityId: saved.id,
      metadata: {
        code: saved.code,
        discountType: saved.discountType,
        discountValue: saved.discountValue,
      },
    });
    return saved;
  }

  async update(id: number, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);

    if (dto.code !== undefined && dto.code !== coupon.code) {
      const clash = await this.couponRepo.findOneBy({ code: dto.code });
      if (clash) {
        throw AppError.badRequest('A coupon with this code already exists', ErrorCode.BAD_REQUEST);
      }
      coupon.code = dto.code;
    }
    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined) coupon.discountValue = dto.discountValue;
    if (dto.minOrderAmount !== undefined) coupon.minOrderAmount = dto.minOrderAmount ?? null;
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses ?? null;
    if (dto.expiresAt !== undefined) coupon.expiresAt = dto.expiresAt ?? null;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

    if (
      coupon.discountType === DiscountType.PERCENTAGE &&
      Number(coupon.discountValue) > 100
    ) {
      throw AppError.badRequest(
        'Percentage discount cannot exceed 100',
        ErrorCode.BAD_REQUEST,
      );
    }

    const saved = await this.couponRepo.save(coupon);
    await this.audit.record({
      action: 'coupon.updated',
      entityType: 'coupon',
      entityId: id,
      metadata: {
        code: saved.code,
        discountType: saved.discountType,
        discountValue: saved.discountValue,
        minOrderAmount: saved.minOrderAmount,
        maxUses: saved.maxUses,
        expiresAt: saved.expiresAt,
      },
    });
    return saved;
  }

  async deactivate(id: number): Promise<Coupon> {
    const coupon = await this.findOne(id);
    coupon.isActive = false;
    const saved = await this.couponRepo.save(coupon);
    await this.audit.record({
      action: 'coupon.deactivated',
      entityType: 'coupon',
      entityId: id,
      metadata: { code: coupon.code },
    });
    return saved;
  }

  async remove(id: number): Promise<{ message: string }> {
    const coupon = await this.findOne(id);
    const code = coupon.code;
    await this.couponRepo.remove(coupon);
    await this.audit.record({
      action: 'coupon.deleted',
      entityType: 'coupon',
      entityId: id,
      metadata: { code },
    });
    return { message: 'Coupon deleted' };
  }

  /**
   * Validate a code against a set of per-vendor subtotals and compute the
   * discount plus its pro-rata allocation. This is the single source of truth
   * used by both `POST /coupons/validate` (preview) and checkout.
   */
  async evaluate(code: string, groups: CartGroupInput[]): Promise<CouponEvaluation> {
    const coupon = await this.couponRepo.findOneBy({ code: code.trim().toUpperCase() });
    if (!coupon || !coupon.isActive) {
      throw AppError.badRequest('Invalid or inactive coupon', ErrorCode.COUPON_EXPIRED);
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw AppError.badRequest('This coupon has expired', ErrorCode.COUPON_EXPIRED);
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw AppError.badRequest('This coupon has reached its usage limit', ErrorCode.COUPON_EXPIRED);
    }

    const eligible =
      coupon.scope === CouponScope.VENDOR
        ? groups.filter((g) => g.vendorId === coupon.vendorId)
        : groups;

    const eligibleSubtotal = round(eligible.reduce((s, g) => s + g.subtotal, 0));
    if (eligibleSubtotal <= 0) {
      throw AppError.badRequest('This coupon does not apply to your cart', ErrorCode.BAD_REQUEST);
    }
    if (coupon.minOrderAmount !== null && eligibleSubtotal < Number(coupon.minOrderAmount)) {
      throw AppError.badRequest(
        `Spend at least ${coupon.minOrderAmount} to use this coupon`,
        ErrorCode.BAD_REQUEST,
      );
    }

    const rawDiscount =
      coupon.discountType === DiscountType.PERCENTAGE
        ? (eligibleSubtotal * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);
    const discountTotal = round(Math.min(eligibleSubtotal, rawDiscount));

    // Pro-rata split; last eligible group absorbs the rounding remainder.
    const allocations: { vendorId: number; amount: number }[] = [];
    let allocated = 0;
    eligible.forEach((g, i) => {
      const amount =
        i === eligible.length - 1
          ? round(discountTotal - allocated)
          : round((g.subtotal / eligibleSubtotal) * discountTotal);
      allocated = round(allocated + amount);
      allocations.push({ vendorId: g.vendorId, amount });
    });

    return { coupon, discountTotal, allocations };
  }

  async incrementUsage(couponId: number): Promise<void> {
    await this.couponRepo.increment({ id: couponId }, 'usedCount', 1);
  }
}
