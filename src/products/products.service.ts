import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { UserType } from '../users/user.entity';
import { slugify } from '../utils/slugify';

type CurrentUser = { id: number; userType: UserType };

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productsRepository: Repository<Product>,
    ) {}

    findAll(currentUser: CurrentUser): Promise<Product[]> {
        if (currentUser.userType === UserType.ADMIN) {
            return this.productsRepository.find({
                where: { createdBy: { id: currentUser.id } },
                relations: { createdBy: true, reviews: true },
            });
        }
        return this.productsRepository.find({ relations: { createdBy: true, reviews: true } });
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: { createdBy: true, reviews: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    create(dto: CreateProductDto, userId: number): Promise<Product> {
        const product = this.productsRepository.create({
            ...dto,
            slug: slugify(dto.title),
            createdBy: { id: userId },
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
