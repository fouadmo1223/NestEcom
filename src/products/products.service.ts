import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Product, ProductStatus, type ProductVariant } from './product.entity';
import { ProductImage } from './entities/product-image.entity';
import { InventoryReason } from './entities/inventory-log.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductsQueryDto, VendorProductsQueryDto } from './dtos/products-query.dto';
import { AdjustInventoryDto } from './dtos/adjust-inventory.dto';
import { Vendor, VendorStatus } from '../vendors/entities/vendor.entity';
import { Store } from '../vendors/entities/store.entity';
import { InventoryService } from './inventory.service';
import { AuditService } from '../common/audit/audit.service';
import { AppError } from '../common/errors/app-exception';
import { slugify } from '../utils/slugify';

const AVG_RATING_SUBQUERY = `(
    SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)
    FROM reviews r
    WHERE r."productId" = product.id AND r.status = 'published'
)`;

const LIMIT_MAX = 100;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductImage) private readonly images: Repository<ProductImage>,
    private readonly inventory: InventoryService,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  // ─── Public storefront ────────────────────────────────────────────────

  async findAllPublic(query: ProductsQueryDto) {
    const { page, limit } = this.paginate(query);

    const qb = this.baseQuery()
      .andWhere('product.status = :active', { active: ProductStatus.ACTIVE })
      .andWhere('vendor.status = :approved', { approved: VendorStatus.APPROVED })
      .innerJoin('stores', 'store', 'store."vendorId" = product."vendorId" AND store."isActive" = true');

    if (query.vendorSlug) {
      qb.andWhere('store.slug = :vendorSlug', { vendorSlug: query.vendorSlug });
    }
    this.applyFilters(qb, query);
    this.applySort(qb, query);

    return this.paginateResult(qb, page, limit);
  }

  async findOnePublic(idOrSlug: string) {
    const qb = this.baseQuery()
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect(
        'product.reviews',
        'reviews',
        "reviews.status = 'published'",
      )
      .leftJoinAndSelect('reviews.user', 'reviewUser')
      .addOrderBy('reviews.createdAt', 'DESC');
    if (/^\d+$/.test(idOrSlug)) qb.where('product.id = :id', { id: Number(idOrSlug) });
    else qb.where('product.slug = :slug', { slug: idOrSlug });

    const { entities, raw } = await qb.getRawAndEntities();
    const product = entities[0];
    const rawRow = raw[0] as { avgRating?: string } | undefined;
    if (
      !product ||
      product.status !== ProductStatus.ACTIVE ||
      product.vendor?.status !== VendorStatus.APPROVED
    ) {
      throw AppError.notFound('Product not found');
    }

    const store = await this.dataSource
      .getRepository(Store)
      .findOne({ where: { vendorId: product.vendorId } });

    return Object.assign(this.mergeRating(product, rawRow), {
      store: store
        ? {
            name: store.name,
            slug: store.slug,
            logo: store.logo,
            rating: {
              average: product.vendor.ratingAverage,
              count: product.vendor.ratingCount,
            },
          }
        : null,
    });
  }

  async findRelated(id: number, limit = 6) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw AppError.notFound('Product not found');

    const qb = this.baseQuery()
      .andWhere('product.id != :id', { id })
      .andWhere('product.status = :active', { active: ProductStatus.ACTIVE })
      .andWhere('vendor.status = :approved', { approved: VendorStatus.APPROVED })
      .orderBy('"avgRating"', 'DESC')
      .limit(limit);

    if (product.category) {
      qb.andWhere('category.id = :categoryId', { categoryId: product.category.id });
    }
    const { entities, raw } = await qb.getRawAndEntities();
    return entities.map((e, i) => this.mergeRating(e, raw[i]));
  }

  // ─── Vendor-scoped ───────────────────────────────────────────────────

  async listForVendor(vendorId: number, query: VendorProductsQueryDto) {
    const { page, limit } = this.paginate(query);
    const qb = this.baseQuery().andWhere('product."vendorId" = :vendorId', { vendorId });

    if (query.status) qb.andWhere('product.status = :status', { status: query.status });
    if (query.lowStock) {
      qb.andWhere('product.stock <= :low', { low: Number(query.lowStock) });
    }
    this.applyDateRange(qb, query);
    this.applyFilters(qb, query);
    this.applySort(qb, query);
    return this.paginateResult(qb, page, limit);
  }

  async getForVendor(vendorId: number, id: number) {
    const { entities, raw } = await this.baseQuery()
      .leftJoinAndSelect('product.images', 'images')
      .where('product.id = :id', { id })
      .andWhere('product."vendorId" = :vendorId', { vendorId })
      .getRawAndEntities();
    if (!entities[0]) throw AppError.notFound('Product not found');
    return this.mergeRating(entities[0], raw[0]);
  }

  async createForVendor(vendor: Vendor, dto: CreateProductDto, uploadedUrls: string[]) {
    const urls = [...uploadedUrls, ...(dto.imageUrls ?? [])].filter(Boolean);

    const created = await this.dataSource.transaction(async (tx) => {
      const productRepo = tx.getRepository(Product);
      const imageRepo = tx.getRepository(ProductImage);

      const product = productRepo.create({
        title: dto.title.trim(),
        titleAr: dto.titleAr?.trim() || null,
        slug: await this.uniqueSlug(vendor.id, dto.title, tx.getRepository(Product)),
        price: dto.price,
        compareAtPrice: dto.compareAtPrice ?? null,
        description: dto.description ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        stock: 0,
        tags: dto.tags ?? null,
        status: dto.status ?? ProductStatus.DRAFT,
        vendorId: vendor.id,
        createdBy: { id: vendor.userId } as never,
        category: dto.categoryId ? ({ id: dto.categoryId } as never) : null,
        image: urls[0] ?? null,
        variants: this.normalizeVariants(dto.variants),
      });
      const saved = await productRepo.save(product);

      if (urls.length) {
        await imageRepo.save(
          urls.map((url, position) =>
            imageRepo.create({ productId: saved.id, url, position }),
          ),
        );
      }

      if (dto.stock && dto.stock > 0) {
        await this.inventory.applyChangeWithin(tx, saved.id, dto.stock, {
          reason: InventoryReason.INITIAL,
          actorId: vendor.userId,
        });
      }

      return productRepo.findOne({ where: { id: saved.id }, relations: { images: true } });
    });

    if (created) {
      await this.audit.record({
        actorId: vendor.userId,
        action: 'product.created',
        entityType: 'product',
        entityId: created.id,
        metadata: { title: created.title, price: created.price, status: created.status },
      });
    }
    return created;
  }

  async updateForVendor(
    vendorId: number,
    id: number,
    dto: UpdateProductDto,
    uploadedUrls: string[],
  ) {
    // Load WITHOUT the `images` relation. `Product.images` is `cascade: true`;
    // handing a loaded collection to `save()` makes TypeORM re-sync it, which
    // on the pooled Neon connection silently drops rows we just inserted.
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');

    if (dto.title !== undefined) {
      product.title = dto.title.trim();
      product.slug = await this.uniqueSlug(vendorId, dto.title, this.products, id);
    }
    if (dto.titleAr !== undefined) product.titleAr = dto.titleAr.trim() || null;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.compareAtPrice !== undefined) product.compareAtPrice = dto.compareAtPrice;
    if (dto.description !== undefined) product.description = dto.description || null;
    if (dto.descriptionAr !== undefined) product.descriptionAr = dto.descriptionAr || null;
    if (dto.tags !== undefined) product.tags = dto.tags;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.categoryId !== undefined) {
      product.category = dto.categoryId ? ({ id: dto.categoryId } as never) : null;
    }
    if (dto.variants !== undefined) {
      product.variants = this.normalizeVariants(dto.variants);
    }

    await this.products.save(product);

    const newUrls = [...uploadedUrls, ...(dto.imageUrls ?? [])].filter(Boolean);
    if (newUrls.length) {
      const [{ next }] = (await this.dataSource.query(
        'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM product_images WHERE "productId" = $1',
        [id],
      )) as [{ next: number }];
      let pos = Number(next);
      for (const url of newUrls) {
        await this.images.save(this.images.create({ productId: id, url, position: pos++ }));
      }
    }
    await this.resyncPrimaryImage(id);

    // Absolute stock edit from the form → book the difference through the
    // inventory ledger so history stays complete. `product.stock` here is still
    // the pre-save DB value (we never mutate it above).
    if (
      dto.stock !== undefined &&
      Number.isFinite(dto.stock) &&
      dto.stock !== product.stock
    ) {
      await this.inventory.applyChange(id, dto.stock - product.stock, {
        reason: InventoryReason.MANUAL,
        actorId: product.createdBy?.id ?? null,
        allowNegative: true,
      });
    }

    await this.audit.record({
      actorId: product.createdBy?.id ?? null,
      action: 'product.updated',
      entityType: 'product',
      entityId: id,
      metadata: {
        title: product.title,
        fields: Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined),
      },
    });
    return this.getForVendor(vendorId, id);
  }

  async setStatusForVendor(vendorId: number, id: number, status: ProductStatus) {
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');
    product.status = status;
    await this.products.save(product);
    await this.audit.record({
      action: 'product.status_changed',
      entityType: 'product',
      entityId: id,
      metadata: { title: product.title, status },
    });
    return this.getForVendor(vendorId, id);
  }

  async deleteForVendor(vendorId: number, id: number) {
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');
    const title = product.title;
    await this.products.remove(product);
    await this.audit.record({
      action: 'product.deleted',
      entityType: 'product',
      entityId: id,
      metadata: { title, by: 'vendor' },
    });
    return { message: 'Product deleted' };
  }

  /** Super-admin: remove any product regardless of owner. */
  async deleteAsAdmin(id: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw AppError.notFound('Product not found');
    const title = product.title;
    await this.products.remove(product);
    await this.audit.record({
      action: 'product.deleted',
      entityType: 'product',
      entityId: id,
      metadata: { title, by: 'admin' },
    });
    return { message: 'Product deleted' };
  }

  async addImages(vendorId: number, id: number, urls: string[]) {
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');
    const [{ next }] = (await this.dataSource.query(
      'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM product_images WHERE "productId" = $1',
      [id],
    )) as [{ next: number }];
    let pos = Number(next);
    for (const url of urls.filter(Boolean)) {
      await this.images.save(this.images.create({ productId: id, url, position: pos++ }));
    }
    await this.resyncPrimaryImage(id, true);
    return this.getForVendor(vendorId, id);
  }

  async removeImage(vendorId: number, id: number, imageId: number) {
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');
    const image = await this.images.findOne({ where: { id: imageId, productId: id } });
    if (!image) throw AppError.notFound('Image not found');
    await this.images.remove(image);

    const remaining = await this.images.find({
      where: { productId: id },
      order: { position: 'ASC' },
    });
    await Promise.all(
      remaining.map((img, i) =>
        img.position === i ? null : this.images.update(img.id, { position: i }),
      ),
    );
    await this.resyncPrimaryImage(id);
    return this.getForVendor(vendorId, id);
  }

  async adjustInventory(vendor: Vendor, productId: number, dto: AdjustInventoryDto) {
    const product = await this.products.findOne({
      where: { id: productId, vendorId: vendor.id },
    });
    if (!product) throw AppError.notFound('Product not found');
    const { product: updated } = await this.inventory.applyChange(productId, dto.change, {
      reason: dto.reason ?? InventoryReason.MANUAL,
      note: dto.note,
      actorId: vendor.userId,
    });
    return updated;
  }

  inventoryHistory(vendorId: number, productId: number) {
    return this.products
      .findOne({ where: { id: productId, vendorId } })
      .then((p) => {
        if (!p) throw AppError.notFound('Product not found');
        return this.inventory.history(productId);
      });
  }

  // ─── Admin (super) ───────────────────────────────────────────────────

  async findAllAdmin(query: VendorProductsQueryDto) {
    const { page, limit } = this.paginate(query);
    const qb = this.baseQuery();
    if (query.status) qb.andWhere('product.status = :status', { status: query.status });
    if (query.vendorId) {
      qb.andWhere('product."vendorId" = :fvid', { fvid: Number(query.vendorId) });
    }
    this.applyDateRange(qb, query);
    this.applyFilters(qb, query);
    this.applySort(qb, query);
    const result = await this.paginateResult(qb, page, limit);

    // attach each product's store name (admin list spans every vendor)
    const vendorIds = [...new Set(result.data.map((p) => p.vendorId))];
    if (vendorIds.length) {
      const stores = await this.dataSource
        .getRepository(Store)
        .find({ where: { vendorId: In(vendorIds) } });
      const byVendor = new Map(stores.map((s) => [s.vendorId, s]));
      result.data = result.data.map((p) => {
        const s = byVendor.get(p.vendorId);
        return Object.assign(p, {
          store: s ? { name: s.name, slug: s.slug } : null,
        });
      });
    }
    return result;
  }

  // ─── internals ───────────────────────────────────────────────────────

  private applyDateRange(
    qb: SelectQueryBuilder<Product>,
    query: { from?: string; to?: string },
  ) {
    if (query.from) qb.andWhere('product."createdAt" >= :cfrom', { cfrom: query.from });
    if (query.to) qb.andWhere('product."createdAt" <= :cto', { cto: `${query.to} 23:59:59` });
  }

  /**
   * Base for list/detail queries. Only ManyToOne relations are joined here —
   * never the `reviews` / `images` *collections*, because combining a
   * collection join with `take()` + `ORDER BY "avgRating"` makes Postgres
   * reject the DISTINCT-id pagination subquery. `avgRating` always comes from
   * the correlated subquery via `mergeRating`, not the entity getter.
   */
  private baseQuery(): SelectQueryBuilder<Product> {
    return this.products
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.createdBy', 'createdBy')
      .addSelect(AVG_RATING_SUBQUERY, 'avgRating');
  }

  private applyFilters(qb: SelectQueryBuilder<Product>, query: ProductsQueryDto) {
    const term = query.search ?? query.title;
    if (term) {
      qb.andWhere('(product.title ILIKE :s OR product.description ILIKE :s)', {
        s: `%${term}%`,
      });
    }
    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: Number(query.categoryId) });
    }
    if (query.minPrice) qb.andWhere('product.price >= :minPrice', { minPrice: Number(query.minPrice) });
    if (query.maxPrice) qb.andWhere('product.price <= :maxPrice', { maxPrice: Number(query.maxPrice) });
    if (query.tag) qb.andWhere('product.tags LIKE :tag', { tag: `%${query.tag}%` });
  }

  private applySort(qb: SelectQueryBuilder<Product>, query: ProductsQueryDto) {
    const dir = query.sortOrder ?? 'DESC';
    if (query.sortBy === 'price') qb.orderBy('product.price', dir);
    else if (query.sortBy === 'avgRating') qb.orderBy('"avgRating"', dir);
    else qb.orderBy('product.createdAt', dir);
  }

  private async paginateResult(
    qb: SelectQueryBuilder<Product>,
    page: number,
    limit: number,
  ) {
    const total = await qb.getCount();
    // baseQuery joins only ManyToOne relations (no row fan-out), so the raw
    // offset/limit is correct here and — unlike skip/take — it does not force
    // the DISTINCT-id subquery that conflicts with `ORDER BY "avgRating"`.
    const { entities, raw } = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawAndEntities();
    return {
      data: entities.map((e, i) => this.mergeRating(e, raw[i])),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private mergeRating(entity: Product, rawRow: { avgRating?: string } | undefined) {
    return { ...entity, avgRating: parseFloat(rawRow?.avgRating ?? '0') };
  }

  /** Coerce a raw variants payload into clean `ProductVariant[]` (or null). */
  private normalizeVariants(raw: unknown): ProductVariant[] | null {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const seen = new Set<string>();
    const clean = raw
      .map((v): ProductVariant | null => {
        if (!v || typeof v !== 'object') return null;
        const r = v as Record<string, unknown>;
        const name = String(r.name ?? '').trim();
        if (!name) return null;
        const nameAr = String(r.nameAr ?? '').trim();
        const image = String(r.image ?? '').trim();
        const price = Number(r.price);
        const cmp = Number(r.compareAtPrice);
        const stock = Number(r.stock);
        let id = String(r.id ?? '').trim() || slugify(name) || `v${seen.size + 1}`;
        while (seen.has(id)) id = `${id}-${seen.size}`;
        seen.add(id);
        const options =
          r.options && typeof r.options === 'object'
            ? Object.fromEntries(
                Object.entries(r.options as Record<string, unknown>).map(([k, val]) => [
                  String(k),
                  String(val),
                ]),
              )
            : undefined;
        return {
          id,
          name,
          ...(nameAr ? { nameAr } : {}),
          ...(image ? { image } : {}),
          price: Number.isFinite(price) && price >= 0 ? price : 0,
          ...(Number.isFinite(cmp) && cmp > 0 ? { compareAtPrice: cmp } : {}),
          stock: Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0,
          ...(options && Object.keys(options).length ? { options } : {}),
          ...(r.sku ? { sku: String(r.sku) } : {}),
        };
      })
      .filter((v): v is ProductVariant => v !== null);
    return clean.length ? clean : null;
  }

  /**
   * Keep `products.image` pointing at the first gallery image. When there are
   * no gallery rows we leave the existing primary alone (e.g. seeded products
   * that only carry a single `image` URL) unless `clearIfEmpty` is set — which
   * `removeImage` passes once the last gallery row is gone.
   */
  private async resyncPrimaryImage(productId: number, clearIfEmpty = false) {
    const primary = await this.images.findOne({
      where: { productId },
      order: { position: 'ASC' },
    });
    if (primary) {
      await this.products.update(productId, { image: primary.url });
    } else if (clearIfEmpty) {
      await this.products.update(productId, { image: null });
    }
  }

  private async uniqueSlug(
    vendorId: number,
    title: string,
    repo: Repository<Product>,
    excludeId?: number,
  ): Promise<string> {
    const base = slugify(title) || 'product';
    let candidate = base;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const clash = await repo.findOne({ where: { vendorId, slug: candidate } });
      if (!clash || clash.id === excludeId) return candidate;
      candidate = `${base}-${n++}`;
      if (n > 100) return `${base}-${Date.now().toString(36)}`;
    }
  }

  private paginate(query: { page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(LIMIT_MAX, Math.max(1, Number(query.limit) || 12));
    return { page, limit };
  }
}
