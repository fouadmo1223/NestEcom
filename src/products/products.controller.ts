import { Controller, Get } from "@nestjs/common";


@Controller('products')
export class ProductsController {
    @Get()
    getAll(){
        return [{id: 1, name: 'Product 1'}, {id: 2, name: 'Product 2'}, {id: 3, name: 'Product 3'}]
    }
}
