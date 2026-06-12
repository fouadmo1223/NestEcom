import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';

type CurrentUserPayload = { id: number; userType: UserType };

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    getAll() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    create(@Body() dto: CreateCategoryDto, @CurrentUser() user: CurrentUserPayload) {
        return this.categoriesService.create(dto, user.id);
    }

    @Patch(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCategoryDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.categoriesService.update(id, dto, user);
    }

    @Delete(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.categoriesService.delete(id, user);
    }
}
