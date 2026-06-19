import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductsQueryDto } from './dtos/products-query.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { imageMulterOptions } from '../uploads/multer.config';

type CurrentUserPayload = { id: number; userType: UserType };

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    @UseGuards(JwtOptionalGuard)
    getAll(@CurrentUser() user: CurrentUserPayload | undefined, @Query() query: ProductsQueryDto) {
        return this.productsService.findAll(user ?? null, query);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    @Get(':id/related')
    getRelated(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findRelated(id);
    }

    @Post()
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    create(
        @Body() dto: CreateProductDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Product image is required');
        return this.productsService.create(dto, user.id, `/uploads/files/${file.filename}`);
    }

    @Patch(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.productsService.update(id, dto, user, file ? `/uploads/files/${file.filename}` : undefined);
    }

    @Delete(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.productsService.delete(id, user);
    }
}
