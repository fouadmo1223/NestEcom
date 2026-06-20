import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductsQueryDto } from './dtos/products-query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { imageMulterOptions } from '../uploads/multer.config';
import { Product } from './product.entity';

type CurrentUserPayload = { id: number; userType: UserType };

@ApiTags('Products')
@Controller('products')
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    @Get()
    @UseGuards(JwtOptionalGuard)
    @ApiOperation({ summary: 'Get all products', description: 'Retrieves all products with optional filtering, sorting, and pagination.' })
    @ApiQuery({ type: ProductsQueryDto })
    @ApiResponse({ status: 200, description: 'Returns a list of products.', type: [Product] })
    getAll(@CurrentUser() user: CurrentUserPayload | undefined, @Query() query: ProductsQueryDto) {
        return this.productsService.findAll(user ?? null, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single product by ID', description: 'Retrieves a single product by its ID.' })
    @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Returns the product.', type: Product })
    @ApiResponse({ status: 404, description: 'Product not found.' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    @Get(':id/related')
    @ApiOperation({ summary: 'Get related products', description: 'Retrieves products related to a specific product.' })
    @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Returns a list of related products.', type: [Product] })
    getRelated(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findRelated(id);
    }

    @Post()
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new product', description: 'Creates a new product. Requires admin privileges.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: CreateProductDto })
    @ApiResponse({ status: 201, description: 'Product created successfully.', type: Product })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    async create(
        @Body() dto: CreateProductDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Product image is required');
        const imageUrl = await this.cloudinaryService.uploadFile(file.buffer, 'products');
        return this.productsService.create(dto, user.id, imageUrl);
    }

    @Patch(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a product', description: 'Updates an existing product. Requires admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateProductDto })
    @ApiResponse({ status: 200, description: 'Product updated successfully.', type: Product })
    @ApiResponse({ status: 404, description: 'Product not found.' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file ? await this.cloudinaryService.uploadFile(file.buffer, 'products') : undefined;
        return this.productsService.update(id, dto, user, imageUrl);
    }

    @Delete(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a product', description: 'Deletes a product. Requires admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Product not found.' })
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.productsService.delete(id, user);
    }
}