import { Controller, Get, Post } from "@nestjs/common";


@Controller('products')
export class ProductsController {
    @Get()
    getAll(){
        return [{id: 1, name: 'Product 1'}, {id: 2, name: 'Product 2'}, {id: 3, name: 'Product 3'}]
    }

    @Post()
    create(){
        return 'create product'
    }
}
