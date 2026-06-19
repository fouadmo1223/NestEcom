import { Controller, Get, ParseIntPipe, Query, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDateRangeDto } from './dtos/analytics-date-range.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';

@Controller('analytics')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('revenue')
    getRevenue(@Query() { startDate, endDate }: AnalyticsDateRangeDto) {
        return this.analyticsService.getRevenue(startDate, endDate);
    }

    @Get('best-selling')
    getBestSelling(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.analyticsService.getBestSelling(limit);
    }

    @Get('orders')
    getOrdersByStatus() {
        return this.analyticsService.getOrdersByStatus();
    }

    @Get('users')
    getUserGrowth(@Query() { startDate, endDate }: AnalyticsDateRangeDto) {
        return this.analyticsService.getUserGrowth(startDate, endDate);
    }
}
