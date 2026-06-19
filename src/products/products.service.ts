import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductsQueryDto } from './dtos/products-query.dto';
import { UserType } from '../users/user.entity';
import { slugify } from '../utils/slugify';

type CurrentUser = { id: number; userType: UserType };

const AVG_RATING_SUBQUERY = `(
    SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)
    FROM reviews r
    WHERE r."productId" = product.id
)`;

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productsRepository: Repository<Product>,
    ) {}

    async findAll(currentUser: CurrentUser, query: ProductsQueryDto) {
        const page  = Math.max(1, Number(query.page)  || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

        const qb = this.productsRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.createdBy', 'createdBy')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.reviews', 'reviews')
            .addSelect(AVG_RATING_SUBQUERY, 'avgRating');

        if (currentUser.userType === UserType.ADMIN) {
            qb.andWhere('createdBy.id = :userId', { userId: currentUser.id });
        }

        const searchTerm = query.search ?? query.title;
        if (searchTerm) {
            qb.andWhere(
                '(product.title ILIKE :search OR product.description ILIKE :search)',
                { search: `%${searchTerm}%` },
            );
        }

        if (query.categoryId) {
            qb.andWhere('category.id = :categoryId', { categoryId: Number(query.categoryId) });
        }
        if (query.minPrice) {
            qb.andWhere('product.price >= :minPrice', { minPrice: Number(query.minPrice) });
        }
        if (query.maxPrice) {
            qb.andWhere('product.price <= :maxPrice', { maxPrice: Number(query.maxPrice) });
        }

        const sortOrder = query.sortOrder ?? 'DESC';
        if (query.sortBy === 'price') {
            qb.orderBy('product.price', sortOrder);
        } else if (query.sortBy === 'avgRating') {
            qb.orderBy(AVG_RATING_SUBQUERY, sortOrder);
        } else {
            qb.orderBy('product.createdAt', sortOrder);
        }

        const total = await qb.getCount();
        const { entities, raw } = await qb.skip((page - 1) * limit).take(limit).getRawAndEntities();

        const data = entities.map((entity, i) => ({
            ...entity,
            avgRating: parseFloat(raw[i]?.avgRating ?? '0'),
        }));

        return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Product & { avgRating: number }> {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: { createdBy: true, category: true, reviews: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return Object.assign(product, { avgRating: product.avgRating });
    }

    create(dto: CreateProductDto, userId: number, imageUrl: string): Promise<Product> {
        const { categoryId, ...rest } = dto;
        const product = this.productsRepository.create({
            ...rest,
            slug: slugify(dto.title),
            image: imageUrl,
            createdBy: { id: userId },
            ...(categoryId ? { category: { id: categoryId } } : {}),
        });
        return this.productsRepository.save(product);
    }

    async update(id: number, dto: UpdateProductDto, currentUser: CurrentUser, imageUrl?: string): Promise<Product> {
        const product = await this.findOne(id);
        this.checkOwnership(product, currentUser);
        if (dto.title) product.slug = slugify(dto.title);
        Object.assign(product, dto);
        if (imageUrl) product.image = imageUrl;
        return this.productsRepository.save(product);
    }

    async delete(id: number, currentUser: CurrentUser): Promise<Product> {
        const product = await this.findOne(id);
        this.checkOwnership(product, currentUser);
        return this.productsRepository.remove(product);
    }

    async decrementStock(productId: number, quantity: number): Promise<void> {
        await this.productsRepository.decrement({ id: productId }, 'stock', quantity);
    }

    private checkOwnership(product: Product, currentUser: CurrentUser): void {
        const isSuperAdmin = currentUser.userType === UserType.SUPER_ADMIN;
        const isOwner = product.createdBy?.id === currentUser.id;
        if (!isSuperAdmin && !isOwner) throw new ForbiddenException('Access denied');
    }
}
