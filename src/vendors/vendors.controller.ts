import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApplyVendorDto, UpdateStoreDto, VendorListQueryDto } from './dtos/vendor.dtos';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ─── Authenticated: self ──────────────────────────────────────────────

  @Post('apply')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  apply(@CurrentUser() user: { id: number }, @Body() dto: ApplyVendorDto) {
    return this.vendorsService.apply(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  getMine(@CurrentUser() user: { id: number }) {
    return this.vendorsService.getMyVendor(user.id);
  }

  @Get('me/applications')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  myApplications(@CurrentUser() user: { id: number }) {
    return this.vendorsService.myApplications(user.id);
  }

  @Patch('me/store')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  updateMyStore(@CurrentUser() user: { id: number }, @Body() dto: UpdateStoreDto) {
    return this.vendorsService.updateMyStore(user.id, dto);
  }

  // ─── Public storefront ────────────────────────────────────────────────

  @Get()
  list(@Query() query: VendorListQueryDto) {
    return this.vendorsService.listPublicVendors(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.vendorsService.getPublicStore(slug);
  }
}
