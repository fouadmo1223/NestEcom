import { Body, Controller, Get, Post, Put, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    getAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateProductDto) {
        return this.productsService.create(dto);
    }

    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
        return this.productsService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.delete(id);
    }
}
