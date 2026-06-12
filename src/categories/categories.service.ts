import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { UserType } from '../users/user.entity';

type CurrentUser = { id: number; userType: UserType };

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoriesRepository: Repository<Category>,
    ) {}

    async findAll(page: number, limit: number) {
        const [data, total] = await this.categoriesRepository.findAndCount({
            relations: { createdBy: true },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: number): Promise<Category> {
        const category = await this.categoriesRepository.findOne({
            where: { id },
            relations: { createdBy: true },
        });
        if (!category) throw new NotFoundException('Category not found');
        return category;
    }

    create(dto: CreateCategoryDto, userId: number): Promise<Category> {
        const category = this.categoriesRepository.create({ ...dto, createdBy: { id: userId } });
        return this.categoriesRepository.save(category);
    }

    async update(id: number, dto: UpdateCategoryDto, currentUser: CurrentUser): Promise<Category> {
        const category = await this.findOne(id);
        this.checkOwnership(category, currentUser);
        Object.assign(category, dto);
        return this.categoriesRepository.save(category);
    }

    async delete(id: number, currentUser: CurrentUser): Promise<Category> {
        const category = await this.findOne(id);
        this.checkOwnership(category, currentUser);
        return this.categoriesRepository.remove(category);
    }

    private checkOwnership(category: Category, currentUser: CurrentUser): void {
        const isSuperAdmin = currentUser.userType === UserType.SUPER_ADMIN;
        const isOwner = category.createdBy?.id === currentUser.id;
        if (!isSuperAdmin && !isOwner) throw new ForbiddenException('Access denied');
    }
}
