import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Review, ReviewStatus } from './review.entity';
import { Product } from '../products/product.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { UserType } from '../users/user.entity';
import { NotificationEvent } from '../notifications/notification-events';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';
import { AuditService } from '../common/audit/audit.service';

type CurrentUser = { id: number; userType: UserType };
const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    page: number,
    limit: number,
    status?: string,
    search?: string,
    sort?: 'newest' | 'oldest',
  ) {
    const qb = this.reviews
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.product', 'product')
      .orderBy('r.createdAt', sort === 'oldest' ? 'ASC' : 'DESC');
    if (status) qb.andWhere('r.status = :status', { status });
    if (search) {
      qb.andWhere(
        '(product.title ILIKE :s OR user.username ILIKE :s OR user.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<Review> {
    const review = await this.reviews.findOne({
      where: { id },
      relations: { user: true, product: true },
    });
    if (!review) throw AppError.notFound('Review not found');
    return review;
  }

  findByProduct(productId: number): Promise<Review[]> {
    return this.reviews.find({
      where: { product: { id: productId }, status: ReviewStatus.PUBLISHED },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateReviewDto, userId: number): Promise<Review> {
    const product = await this.products.findOne({
      where: { id: dto.productId },
      relations: { vendor: true },
    });
    if (!product) throw AppError.notFound('Product not found');

    const existing = await this.reviews.findOne({
      where: { product: { id: dto.productId }, user: { id: userId } },
    });
    if (existing) {
      throw AppError.conflict('You have already reviewed this product', ErrorCode.CONFLICT);
    }

    const isVerifiedPurchase = await this.hasDeliveredPurchase(userId, dto.productId);

    const saved = await this.reviews.save(
      this.reviews.create({
        rating: dto.rating,
        comment: dto.comment ?? null,
        isVerifiedPurchase,
        product: { id: dto.productId },
        user: { id: userId },
      }),
    );

    if (product.vendorId) await this.recomputeVendorRating(product.vendorId);
    if (product.vendor?.userId) {
      this.events.emit(NotificationEvent.REVIEW_CREATED, {
        vendorUserId: product.vendor.userId,
        productId: product.id,
        productTitle: product.title,
        rating: dto.rating,
      });
    }
    return saved;
  }

  async update(id: number, dto: UpdateReviewDto, currentUser: CurrentUser): Promise<Review> {
    const review = await this.findOne(id);
    this.assertOwner(review, currentUser);
    Object.assign(review, dto);
    const saved = await this.reviews.save(review);
    if (review.product) await this.recomputeVendorRating(review.product.vendorId);
    return saved;
  }

  async delete(id: number, currentUser: CurrentUser): Promise<{ message: string }> {
    const review = await this.findOne(id);
    this.assertOwner(review, currentUser);
    const vendorId = review.product?.vendorId;
    await this.reviews.remove(review);
    if (vendorId) await this.recomputeVendorRating(vendorId);
    return { message: 'Review deleted' };
  }

  /** Vendor replies to a review on one of their own products. */
  async reply(id: number, vendorUserId: number, text: string): Promise<Review> {
    const review = await this.reviews.findOne({
      where: { id },
      relations: { product: { vendor: true } },
    });
    if (!review) throw AppError.notFound('Review not found');
    if (review.product?.vendor?.userId !== vendorUserId) {
      throw AppError.forbidden('You can only reply to reviews on your own products');
    }
    review.vendorReply = text.trim();
    review.vendorRepliedAt = new Date();
    return this.reviews.save(review);
  }

  /** Super-admin moderation. */
  async setStatus(id: number, status: ReviewStatus, actorId?: number): Promise<Review> {
    const review = await this.findOne(id);
    review.status = status;
    const saved = await this.reviews.save(review);
    if (review.product) await this.recomputeVendorRating(review.product.vendorId);
    await this.audit.record({
      actorId: actorId ?? null,
      action: 'review.moderated',
      entityType: 'review',
      entityId: id,
      metadata: { status, productId: review.product?.id ?? null },
    });
    return saved;
  }

  // ─── internals ───────────────────────────────────────────────────────

  private async hasDeliveredPurchase(userId: number, productId: number): Promise<boolean> {
    const row = await this.reviews.manager.query(
      `SELECT 1 FROM order_items oi
         JOIN vendor_orders vo ON vo.id = oi."vendorOrderId"
         JOIN customer_orders co ON co.id = vo."customerOrderId"
        WHERE oi."productId" = $1 AND co."userId" = $2 AND vo.status = 'delivered'
        LIMIT 1`,
      [productId, userId],
    );
    return Array.isArray(row) && row.length > 0;
  }

  private async recomputeVendorRating(vendorId: number | null | undefined): Promise<void> {
    if (!vendorId) return;
    const row = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .select('COALESCE(AVG(r.rating), 0)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('p."vendorId" = :vendorId AND r.status = :published', {
        vendorId,
        published: ReviewStatus.PUBLISHED,
      })
      .getRawOne<{ avg: string; count: string }>();

    await this.vendors.update(
      { id: vendorId },
      {
        ratingAverage: round(parseFloat(row?.avg ?? '0')),
        ratingCount: parseInt(row?.count ?? '0', 10),
      },
    );
  }

  private assertOwner(review: Review, currentUser: CurrentUser): void {
    const isSuperAdmin = currentUser.userType === UserType.SUPER_ADMIN;
    if (!isSuperAdmin && review.user?.id !== currentUser.id) {
      throw AppError.forbidden('Access denied');
    }
  }
}
