import { Controller, Get } from "@nestjs/common";


@Controller('reviews')
export class ReviewsController {
    @Get()
    getAll(){
        return [{id: 1, productId: 1, rating: 5, comment: 'Great product'}, {id: 2, productId: 2, rating: 4, comment: 'Good product'}, {id: 3, productId: 3, rating: 3, comment: 'Average product'}]
    }
}