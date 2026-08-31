import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';
import { VendorGuard } from '../vendors/vendor.guard';
import { CurrentVendor } from '../vendors/current-vendor.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AdminPayoutQueryDto,
  LedgerQueryDto,
  ProcessPayoutDto,
  RequestPayoutDto,
} from './dtos/money.dtos';
import type { Vendor } from '../vendors/entities/vendor.entity';

@ApiTags('Vendor · Money')
@ApiBearerAuth()
@Controller('vendors/me')
@UseGuards(JwtGuard, VendorGuard)
export class VendorMoneyController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('earnings')
  earnings(@CurrentVendor() vendor: Vendor) {
    return this.payouts.earnings(vendor.id);
  }

  @Get('ledger')
  ledger(@CurrentVendor() vendor: Vendor, @Query() query: LedgerQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return this.payouts.ledgerFor(vendor.id, page, limit);
  }

  @Get('payouts')
  myPayouts(@CurrentVendor() vendor: Vendor) {
    return this.payouts.listVendorPayouts(vendor.id);
  }

  @Post('payouts')
  request(@CurrentVendor() vendor: Vendor, @Body() dto: RequestPayoutDto) {
    return this.payouts.requestPayout(vendor.id, dto);
  }
}

@ApiTags('Admin · Payouts')
@ApiBearerAuth()
@Controller('admin/payouts')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class AdminPayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get()
  list(@Query() query: AdminPayoutQueryDto) {
    return this.payouts.listAll(query);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  process(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessPayoutDto,
    @CurrentUser() admin: { id: number },
  ) {
    return this.payouts.process(id, dto, admin.id);
  }
}
