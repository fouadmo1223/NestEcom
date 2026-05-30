import { Controller, Get, Post } from "@nestjs/common";


@Controller('products')
export class ProductsController {

    private products = [{id: 1, name: 'Product 1'}, {id: 2, name: 'Product 2'}, {id: 3, name: 'Product 3'}]

    @Get()
    getAll(){
        return this.products
    }

    @Post()
    create(){
        return 'create product'
    }
}
