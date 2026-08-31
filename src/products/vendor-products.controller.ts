import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtGuard } from '../auth/jwt.guard';
import { VendorGuard } from '../vendors/vendor.guard';
import { CurrentVendor } from '../vendors/current-vendor.decorator';
import { imageMulterOptions } from '../uploads/multer.config';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto, UpdateProductStatusDto } from './dtos/update-product.dto';
import { VendorProductsQueryDto } from './dtos/products-query.dto';
import { AdjustInventoryDto } from './dtos/adjust-inventory.dto';
import type { Vendor } from '../vendors/entities/vendor.entity';

@ApiTags('Vendor · Products')
@ApiBearerAuth()
@Controller('vendors/me/products')
@UseGuards(JwtGuard, VendorGuard)
export class VendorProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private uploadAll(files?: Express.Multer.File[]): Promise<string[]> {
    if (!files?.length) return Promise.resolve([]);
    return Promise.all(
      files.map((f) => this.cloudinary.uploadFile(f.buffer, 'products')),
    );
  }

  @Get()
  list(@CurrentVendor() vendor: Vendor, @Query() query: VendorProductsQueryDto) {
    return this.productsService.listForVendor(vendor.id, query);
  }

  @Get(':id')
  getOne(@CurrentVendor() vendor: Vendor, @Param('id', ParseIntPipe) id: number) {
    return this.productsService.getForVendor(vendor.id, id);
  }

  @Get(':id/inventory')
  inventory(@CurrentVendor() vendor: Vendor, @Param('id', ParseIntPipe) id: number) {
    return this.productsService.inventoryHistory(vendor.id, id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 8, imageMulterOptions))
  @ApiConsumes('multipart/form-data')
  async create(
    @CurrentVendor() vendor: Vendor,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const urls = await this.uploadAll(files);
    return this.productsService.createForVendor(vendor, dto, urls);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 8, imageMulterOptions))
  @ApiConsumes('multipart/form-data')
  async update(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const urls = await this.uploadAll(files);
    return this.productsService.updateForVendor(vendor.id, id, dto, urls);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  setStatus(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.setStatusForVendor(vendor.id, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentVendor() vendor: Vendor, @Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteForVendor(vendor.id, id);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 8, imageMulterOptions))
  @ApiConsumes('multipart/form-data')
  async addImages(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const urls = await this.uploadAll(files);
    return this.productsService.addImages(vendor.id, id, urls);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  removeImage(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.productsService.removeImage(vendor.id, id, imageId);
  }

  @Post(':id/inventory/adjust')
  @HttpCode(HttpStatus.OK)
  adjust(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.productsService.adjustInventory(vendor, id, dto);
  }
}
