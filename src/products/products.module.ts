import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { VendorProductsController } from './vendor-products.controller';
import { ProductsService } from './products.service';
import { InventoryService } from './inventory.service';
import { Product } from './product.entity';
import { ProductImage } from './entities/product-image.entity';
import { InventoryLog } from './entities/inventory-log.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, InventoryLog]),
    AuthModule,
    CloudinaryModule,
    VendorsModule,
  ],
  controllers: [ProductsController, VendorProductsController],
  providers: [ProductsService, InventoryService, JwtOptionalGuard],
  exports: [ProductsService, InventoryService, TypeOrmModule],
})
export class ProductsModule {}
