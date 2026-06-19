import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
    imports: [TypeOrmModule.forFeature([Product]), AuthModule, CloudinaryModule],
    controllers: [ProductsController],
    providers: [ProductsService, JwtOptionalGuard],
    exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
