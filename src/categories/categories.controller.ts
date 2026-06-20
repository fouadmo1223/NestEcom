import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { imageMulterOptions } from '../uploads/multer.config';
import { Category } from './category.entity';

type CurrentUserPayload = { id: number; userType: UserType };

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService: CategoriesService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all categories', description: 'Retrieves all categories with pagination.' })
    @ApiQuery({ type: PaginationDto })
    @ApiResponse({ status: 200, description: 'Returns a list of categories.', type: [Category] })
    getAll(@Query() { page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        return this.categoriesService.findAll(p, l);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single category by ID', description: 'Retrieves a single category by its ID.' })
    @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Returns the category.', type: Category })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new category', description: 'Creates a new category. Requires admin privileges.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: CreateCategoryDto })
    @ApiResponse({ status: 201, description: 'Category created successfully.', type: Category })
    async create(
        @Body() dto: CreateCategoryDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file ? await this.cloudinaryService.uploadFile(file.buffer, 'categories') : undefined;
        return this.categoriesService.create(dto, user.id, imageUrl);
    }

    @Patch(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('image', imageMulterOptions))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a category', description: 'Updates an existing category. Requires admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateCategoryDto })
    @ApiResponse({ status: 200, description: 'Category updated successfully.', type: Category })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCategoryDto,
        @CurrentUser() user: CurrentUserPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file ? await this.cloudinaryService.uploadFile(file.buffer, 'categories') : undefined;
        return this.categoriesService.update(id, dto, user, imageUrl);
    }

    @Delete(':id')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a category', description: 'Deletes a category. Requires admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.categoriesService.delete(id, user);
    }
}