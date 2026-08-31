import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { ProductImage } from './entities/product-image.entity';
import { InventoryReason } from './entities/inventory-log.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductsQueryDto, VendorProductsQueryDto } from './dtos/products-query.dto';
import { AdjustInventoryDto } from './dtos/adjust-inventory.dto';
import { Vendor, VendorStatus } from '../vendors/entities/vendor.entity';
import { Store } from '../vendors/entities/store.entity';
import { InventoryService } from './inventory.service';
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
    const qb = this.baseQuery().leftJoinAndSelect('product.images', 'images');
    if (/^\d+$/.test(idOrSlug)) qb.where('product.id = :id', { id: Number(idOrSlug) });
    else qb.where('product.slug = :slug', { slug: idOrSlug });

    const product = await qb.getOne();
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

    return Object.assign(this.withRating(product), {
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
      .orderBy(AVG_RATING_SUBQUERY, 'DESC')
      .take(limit);

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
    this.applyFilters(qb, query);
    this.applySort(qb, query);
    return this.paginateResult(qb, page, limit);
  }

  async getForVendor(vendorId: number, id: number) {
    const product = await this.baseQuery()
      .leftJoinAndSelect('product.images', 'images')
      .where('product.id = :id', { id })
      .andWhere('product."vendorId" = :vendorId', { vendorId })
      .getOne();
    if (!product) throw AppError.notFound('Product not found');
    return this.withRating(product);
  }

  async createForVendor(vendor: Vendor, dto: CreateProductDto, uploadedUrls: string[]) {
    const urls = [...uploadedUrls, ...(dto.imageUrls ?? [])].filter(Boolean);

    return this.dataSource.transaction(async (tx) => {
      const productRepo = tx.getRepository(Product);
      const imageRepo = tx.getRepository(ProductImage);

      const product = productRepo.create({
        title: dto.title.trim(),
        slug: await this.uniqueSlug(vendor.id, dto.title, tx.getRepository(Product)),
        price: dto.price,
        description: dto.description ?? null,
        stock: 0,
        tags: dto.tags ?? null,
        status: dto.status ?? ProductStatus.DRAFT,
        vendorId: vendor.id,
        createdBy: { id: vendor.userId } as never,
        category: dto.categoryId ? ({ id: dto.categoryId } as never) : null,
        image: urls[0] ?? null,
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
  }

  async updateForVendor(
    vendorId: number,
    id: number,
    dto: UpdateProductDto,
    uploadedUrls: string[],
  ) {
    const product = await this.products.findOne({
      where: { id, vendorId },
      relations: { images: true },
    });
    if (!product) throw AppError.notFound('Product not found');

    if (dto.title !== undefined) {
      product.title = dto.title.trim();
      product.slug = await this.uniqueSlug(vendorId, dto.title, this.products, id);
    }
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.description !== undefined) product.description = dto.description || null;
    if (dto.tags !== undefined) product.tags = dto.tags;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.categoryId !== undefined) {
      product.category = dto.categoryId ? ({ id: dto.categoryId } as never) : null;
    }

    const newUrls = [...uploadedUrls, ...(dto.imageUrls ?? [])].filter(Boolean);
    if (newUrls.length) {
      const startPos = product.images?.length ?? 0;
      await this.images.save(
        newUrls.map((url, i) =>
          this.images.create({ productId: id, url, position: startPos + i }),
        ),
      );
    }

    await this.products.save(product);
    await this.resyncPrimaryImage(id);
    return this.getForVendor(vendorId, id);
  }

  async setStatusForVendor(vendorId: number, id: number, status: ProductStatus) {
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');
    product.status = status;
    await this.products.save(product);
    return this.getForVendor(vendorId, id);
  }

  async deleteForVendor(vendorId: number, id: number) {
    const product = await this.products.findOne({ where: { id, vendorId } });
    if (!product) throw AppError.notFound('Product not found');
    await this.products.remove(product);
    return { message: 'Product deleted' };
  }

  async addImages(vendorId: number, id: number, urls: string[]) {
    const product = await this.products.findOne({
      where: { id, vendorId },
      relations: { images: true },
    });
    if (!product) throw AppError.notFound('Product not found');
    const start = product.images?.length ?? 0;
    await this.images.save(
      urls.map((url, i) => this.images.create({ productId: id, url, position: start + i })),
    );
    await this.resyncPrimaryImage(id);
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
    this.applyFilters(qb, query);
    this.applySort(qb, query);
    return this.paginateResult(qb, page, limit);
  }

  // ─── internals ───────────────────────────────────────────────────────

  private baseQuery(): SelectQueryBuilder<Product> {
    return this.products
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.reviews', 'reviews')
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
    else if (query.sortBy === 'avgRating') qb.orderBy(AVG_RATING_SUBQUERY, dir);
    else qb.orderBy('product.createdAt', dir);
  }

  private async paginateResult(
    qb: SelectQueryBuilder<Product>,
    page: number,
    limit: number,
  ) {
    const total = await qb.getCount();
    const { entities, raw } = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();
    return {
      data: entities.map((e, i) => this.mergeRating(e, raw[i])),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private mergeRating(entity: Product, rawRow: { avgRating?: string } | undefined) {
    return { ...entity, avgRating: parseFloat(rawRow?.avgRating ?? '0') };
  }

  private withRating(product: Product) {
    return Object.assign(product, { avgRating: product.avgRating });
  }

  private async resyncPrimaryImage(productId: number) {
    const primary = await this.images.findOne({
      where: { productId },
      order: { position: 'ASC' },
    });
    await this.products.update(productId, { image: primary?.url ?? null });
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
