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
import { VendorsService } from './vendors.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import {
  AdminVendorListQueryDto,
  CreateVendorDto,
  ReviewApplicationDto,
  UpdateUserRoleDto,
  UpdateVendorAdminDto,
} from './dtos/vendor.dtos';

@ApiTags('Admin · Vendors')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class AdminVendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ─── Applications ─────────────────────────────────────────────────────

  @Get('vendor-applications')
  listApplications(@Query() query: AdminVendorListQueryDto) {
    return this.vendorsService.listApplications(query);
  }

  @Get('vendor-applications/:id')
  getApplication(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.getApplication(id);
  }

  @Patch('vendor-applications/:id')
  @HttpCode(HttpStatus.OK)
  reviewApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() admin: { id: number },
  ) {
    return this.vendorsService.reviewApplication(id, dto, admin.id);
  }

  // ─── Vendors ─────────────────────────────────────────────────────────

  @Get('vendors')
  listVendors(@Query() query: AdminVendorListQueryDto) {
    return this.vendorsService.listVendorsAdmin(query);
  }

  @Get('vendors/:id')
  getVendor(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.getVendorAdmin(id);
  }

  @Post('vendors')
  createVendor(@Body() dto: CreateVendorDto, @CurrentUser() admin: { id: number }) {
    return this.vendorsService.createVendorDirect(dto, admin.id);
  }

  @Patch('vendors/:id')
  @HttpCode(HttpStatus.OK)
  updateVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorAdminDto,
    @CurrentUser() admin: { id: number },
  ) {
    return this.vendorsService.updateVendorAdmin(id, dto, admin.id);
  }

  // ─── Roles ───────────────────────────────────────────────────────────

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  setUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() admin: { id: number },
  ) {
    return this.vendorsService.setUserRole(id, dto.role, admin.id);
  }
}
