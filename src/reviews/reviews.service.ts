import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { Product } from '../products/product.entity';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { UserType } from '../users/user.entity';

type CurrentUser = { id: number; userType: UserType };

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private readonly reviewsRepository: Repository<Review>,
        @InjectRepository(Product)
        private readonly productsRepository: Repository<Product>,
    ) {}

    findAll(): Promise<Review[]> {
        return this.reviewsRepository.find({ relations: { user: true, product: true } });
    }

    async findOne(id: number): Promise<Review> {
        const review = await this.reviewsRepository.findOne({
            where: { id },
            relations: { user: true, product: true },
        });
        if (!review) throw new NotFoundException('Review not found');
        return review;
    }

    findByProduct(productId: number): Promise<Review[]> {
        return this.reviewsRepository.find({
            where: { product: { id: productId } },
            relations: { user: true },
        });
    }

    async create(dto: CreateReviewDto, userId: number): Promise<Review> {
        const product = await this.productsRepository.findOneBy({ id: dto.productId });
        if (!product) throw new NotFoundException('Product not found');

        const review = this.reviewsRepository.create({
            rating: dto.rating,
            comment: dto.comment,
            product: { id: dto.productId },
            user: { id: userId },
        });
        return this.reviewsRepository.save(review);
    }

    async update(id: number, dto: UpdateReviewDto, currentUser: CurrentUser): Promise<Review> {
        const review = await this.findOne(id);
        this.checkOwnership(review, currentUser);
        Object.assign(review, dto);
        return this.reviewsRepository.save(review);
    }

    async delete(id: number, currentUser: CurrentUser): Promise<Review> {
        const review = await this.findOne(id);
        this.checkOwnership(review, currentUser);
        return this.reviewsRepository.remove(review);
    }

    private checkOwnership(review: Review, currentUser: CurrentUser): void {
        const isSuperAdmin = currentUser.userType === UserType.SUPER_ADMIN;
        const isOwner = review.user?.id === currentUser.id;
        if (!isSuperAdmin && !isOwner) throw new ForbiddenException('Access denied');
    }
}
