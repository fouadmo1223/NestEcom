import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { imageMulterOptions } from '../uploads/multer.config';

type CurrentUserPayload = { id: number; userType: UserType };

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    getAll(@Query() { page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        return this.categoriesService.findAll(p, l);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    create(
        @Body() dto: CreateCategoryDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file ? `/uploads/files/${file.filename}` : undefined;
        return this.categoriesService.create(dto, user.id, imageUrl);
    }

    @Patch(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCategoryDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file ? `/uploads/files/${file.filename}` : undefined;
        return this.categoriesService.update(id, dto, user, imageUrl);
    }

    @Delete(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.categoriesService.delete(id, user);
    }
}
