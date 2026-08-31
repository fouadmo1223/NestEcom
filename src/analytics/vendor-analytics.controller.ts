import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDateRangeDto } from './dtos/analytics-date-range.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { VendorGuard } from '../vendors/vendor.guard';
import { CurrentVendor } from '../vendors/current-vendor.decorator';
import type { Vendor } from '../vendors/entities/vendor.entity';

@ApiTags('Vendor · Analytics')
@ApiBearerAuth()
@Controller('vendors/me/analytics')
@UseGuards(JwtGuard, VendorGuard)
export class VendorAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentVendor() vendor: Vendor) {
    return this.analytics.vendorOverview(vendor.id);
  }

  @Get('revenue')
  revenue(@CurrentVendor() vendor: Vendor, @Query() { startDate, endDate }: AnalyticsDateRangeDto) {
    return this.analytics.vendorRevenue(vendor.id, startDate, endDate);
  }

  @Get('best-selling')
  bestSelling(
    @CurrentVendor() vendor: Vendor,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analytics.vendorBestSelling(vendor.id, limit);
  }

  @Get('orders')
  ordersByStatus(@CurrentVendor() vendor: Vendor) {
    return this.analytics.vendorOrdersByStatus(vendor.id);
  }
}
