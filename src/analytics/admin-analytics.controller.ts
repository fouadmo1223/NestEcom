import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDateRangeDto, RankedRangeDto } from './dtos/analytics-date-range.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';

@ApiTags('Admin · Analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analytics.platformOverview();
  }

  @Get('gmv')
  gmv(@Query() { startDate, endDate }: AnalyticsDateRangeDto) {
    return this.analytics.gmv(startDate, endDate);
  }

  @Get('commission')
  commission(@Query() { startDate, endDate }: AnalyticsDateRangeDto) {
    return this.analytics.commission(startDate, endDate);
  }

  @Get('top-vendors')
  topVendors(@Query() { limit, startDate, endDate }: RankedRangeDto) {
    return this.analytics.topVendors(limit ?? 10, startDate, endDate);
  }

  @Get('vendor-growth')
  vendorGrowth(@Query() { startDate, endDate }: AnalyticsDateRangeDto) {
    return this.analytics.vendorGrowth(startDate, endDate);
  }

  @Get('customer-growth')
  customerGrowth(@Query() { startDate, endDate }: AnalyticsDateRangeDto) {
    return this.analytics.getUserGrowth(startDate, endDate);
  }

  @Get('orders')
  ordersByStatus() {
    return this.analytics.getOrdersByStatus();
  }
}
