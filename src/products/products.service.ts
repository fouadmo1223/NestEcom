import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

type Product = { id: number; name: string; price: number };

@Injectable()
export class ProductsService {
    private products: Product[] = [
        { id: 1, name: 'Product 1', price: 99.99 },
        { id: 2, name: 'Product 2', price: 149.99 },
        { id: 3, name: 'Product 3', price: 199.99 },
    ];

    findAll(): Product[] {
        return this.products;
    }

    findOne(id: number): Product {
        const product = this.products.find((p) => p.id === id);
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    create(dto: CreateProductDto): Product {
        const product = { id: this.products.length + 1, ...dto };
        this.products.push(product);
        return product;
    }

    update(id: number, dto: UpdateProductDto): Product {
        const product = this.findOne(id);
        Object.assign(product, dto);
        return product;
    }

    delete(id: number): Product {
        const index = this.products.findIndex((p) => p.id === id);
        if (index === -1) throw new NotFoundException('Product not found');
        return this.products.splice(index, 1)[0];
    }
}
