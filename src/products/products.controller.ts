import { Body, Controller, Get, Post, Put, Delete, Param, NotFoundException, ParseIntPipe } from "@nestjs/common";
import { CreateProductDto } from "./dtos/create-product.dto";
import { UpdateProductDto } from "./dtos/update-product.dto";

type productType = {
    id?: number,
    name: string,
    price: number
}

@Controller('products')
export class ProductsController {

    private products: productType[]= [
        {id: 1, name: 'Product 1', price: 99.99},
        {id: 2, name: 'Product 2', price: 149.99},
        {id: 3, name: 'Product 3', price: 199.99}
    ]

    @Get()
    getAll(){
        return this.products
    }

    @Get(':id')
    getOne(@Param('id',ParseIntPipe) id: number){
        const product = this.products.find(p => p.id === id)
        if (!product) throw new NotFoundException('Product not found')
        return product
    }

    @Post()
    create(@Body() product: CreateProductDto){
        const newProduct = {
            id: this.products.length + 1,
            ...product
        }
        this.products.push(newProduct)
        return newProduct
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateProduct: UpdateProductDto){
        const product = this.products.find(p => p.id === +id)
        if (!product) throw new NotFoundException('Product not found')
        Object.assign(product, updateProduct)
        return product
    }

    @Delete(':id')
    delete(@Param('id') id: string){
        const index = this.products.findIndex(p => p.id === +id)
        if (index === -1) throw new NotFoundException('Product not found')
        const deleted = this.products.splice(index, 1)
        return deleted[0]
    }
}
