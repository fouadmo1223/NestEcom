import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../products/product.entity';
import { Store } from '../vendors/entities/store.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CartItem, Product, Store]), AuthModule],
    controllers: [CartController],
    providers: [CartService],
    exports: [CartService],
})
export class CartModule {}
