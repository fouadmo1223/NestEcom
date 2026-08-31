import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductsQueryDto, VendorProductsQueryDto } from './dtos/products-query.dto';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtGuard } from '../auth/jwt.guard';
import { UserType } from '../users/user.entity';
import { Product } from './product.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseGuards(JwtOptionalGuard)
  @ApiOperation({ summary: 'List active products across the marketplace' })
  @ApiResponse({ status: 200, type: [Product] })
  list(@Query() query: ProductsQueryDto) {
    return this.productsService.findAllPublic(query);
  }

  @Get('admin')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List every product (any status/vendor) — super admin' })
  listAdmin(@Query() query: VendorProductsQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a single active product by id or slug' })
  getOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOnePublic(idOrSlug);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Related products (same category, top rated)' })
  getRelated(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findRelated(id);
  }
}
