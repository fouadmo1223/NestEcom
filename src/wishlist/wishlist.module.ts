import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistItem } from './wishlist-item.entity';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([WishlistItem]), AuthModule],
    controllers: [WishlistController],
    providers: [WishlistService],
})
export class WishlistModule {}
