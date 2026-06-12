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

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productsRepository: Repository<Product>,
    ) {}

    async findAll(currentUser: CurrentUser, query: ProductsQueryDto) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

        const qb = this.productsRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.createdBy', 'createdBy')
            .leftJoinAndSelect('product.category', 'category');

        if (currentUser.userType === UserType.ADMIN) {
            qb.andWhere('createdBy.id = :userId', { userId: currentUser.id });
        }

        if (query.title) {
            qb.andWhere('product.title ILIKE :title', { title: `%${query.title}%` });
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

        qb.skip((page - 1) * limit).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: { createdBy: true, category: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    create(dto: CreateProductDto, userId: number): Promise<Product> {
        const { categoryId, ...rest } = dto;
        const product = this.productsRepository.create({
            ...rest,
            slug: slugify(dto.title),
            createdBy: { id: userId },
            ...(categoryId ? { category: { id: categoryId } } : {}),
        });
        return this.productsRepository.save(product);
    }

    async update(id: number, dto: UpdateProductDto, currentUser: CurrentUser): Promise<Product> {
        const product = await this.findOne(id);
        this.checkOwnership(product, currentUser);
        if (dto.title) product.slug = slugify(dto.title);
        Object.assign(product, dto);
        return this.productsRepository.save(product);
    }

    async delete(id: number, currentUser: CurrentUser): Promise<Product> {
        const product = await this.findOne(id);
        this.checkOwnership(product, currentUser);
        return this.productsRepository.remove(product);
    }

    private checkOwnership(product: Product, currentUser: CurrentUser): void {
        const isSuperAdmin = currentUser.userType === UserType.SUPER_ADMIN;
        const isOwner = product.createdBy?.id === currentUser.id;
        if (!isSuperAdmin && !isOwner) throw new ForbiddenException('Access denied');
    }
}
