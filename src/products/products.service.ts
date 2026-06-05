import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productsRepository: Repository<Product>,
    ) {}

    findAll(): Promise<Product[]> {
        return this.productsRepository.find();
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productsRepository.findOneBy({ id });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    create(dto: CreateProductDto): Promise<Product> {
        const product = this.productsRepository.create(dto);
        return this.productsRepository.save(product);
    }

    async update(id: number, dto: UpdateProductDto): Promise<Product> {
        const product = await this.findOne(id);
        Object.assign(product, dto);
        return this.productsRepository.save(product);
    }

    async delete(id: number): Promise<Product> {
        const product = await this.findOne(id);
        return this.productsRepository.remove(product);
    }
}
