import { Injectable, NotFoundException } from '@nestjs/common';

type Review = { id: number; productId: number; rating: number; comment: string };

@Injectable()
export class ReviewsService {
    private reviews: Review[] = [
        { id: 1, productId: 1, rating: 5, comment: 'Great product' },
        { id: 2, productId: 2, rating: 4, comment: 'Good product' },
        { id: 3, productId: 3, rating: 3, comment: 'Average product' },
    ];

    findAll(): Review[] {
        return this.reviews;
    }

    findOne(id: number): Review {
        const review = this.reviews.find((r) => r.id === id);
        if (!review) throw new NotFoundException('Review not found');
        return review;
    }

    findByProduct(productId: number): Review[] {
        return this.reviews.filter((r) => r.productId === productId);
    }
}
