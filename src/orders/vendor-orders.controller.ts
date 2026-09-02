import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { VendorOrdersQueryDto } from './dtos/orders-query.dto';
import {
  CancelVendorOrderDto,
  UpdateVendorOrderStatusDto,
} from './dtos/update-order-status.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { VendorGuard } from '../vendors/vendor.guard';
import { CurrentVendor } from '../vendors/current-vendor.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Vendor } from '../vendors/entities/vendor.entity';

@ApiTags('Vendor · Orders')
@ApiBearerAuth()
@Controller('vendors/me/orders')
@UseGuards(JwtGuard, VendorGuard)
export class VendorOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentVendor() vendor: Vendor, @Query() query: VendorOrdersQueryDto) {
    return this.ordersService.listVendorOrders(vendor.id, query);
  }

  @Get(':id')
  getOne(@CurrentVendor() vendor: Vendor, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getVendorOrder(vendor.id, id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorOrderStatusDto,
  ) {
    return this.ordersService.updateVendorOrderStatus(vendor.id, id, dto, vendor.userId);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentVendor() vendor: Vendor,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelVendorOrderDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.ordersService.cancelVendorOrder(vendor.id, id, dto.reason, user.id);
  }
}
