import { Body, Controller, Get, Post } from "@nestjs/common";


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

    @Post()
    create(@Body() product: productType){
        return product
    }
}
