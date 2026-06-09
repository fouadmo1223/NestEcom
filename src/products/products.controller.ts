import { Body, Controller, Get, Post, Patch, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';

type CurrentUserPayload = { id: number; userType: UserType };

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    @UseGuards(JwtGuard)
    getAll(@CurrentUser() user: CurrentUserPayload) {
        return this.productsService.findAll(user);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    create(@Body() dto: CreateProductDto, @CurrentUser() user: CurrentUserPayload) {
        return this.productsService.create(dto, user.id);
    }

    @Patch(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.productsService.update(id, dto, user);
    }

    @Delete(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.productsService.delete(id, user);
    }
}
