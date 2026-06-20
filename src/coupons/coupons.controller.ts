import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';
import { Coupon } from './coupon.entity';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) {}

    @Get()
    @ApiOperation({ summary: 'Get all coupons', description: 'Retrieves all coupons. Requires super admin privileges.' })
    @ApiResponse({ status: 200, description: 'Returns a list of coupons.', type: [Coupon] })
    getAll() {
        return this.couponsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single coupon by ID', description: 'Retrieves a single coupon by its ID. Requires super admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Coupon ID' })
    @ApiResponse({ status: 200, description: 'Returns the coupon.', type: Coupon })
    @ApiResponse({ status: 404, description: 'Coupon not found.' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.couponsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new coupon', description: 'Creates a new coupon. Requires super admin privileges.' })
    @ApiBody({ type: CreateCouponDto })
    @ApiResponse({ status: 201, description: 'Coupon created successfully.', type: Coupon })
    create(@Body() dto: CreateCouponDto) {
        return this.couponsService.create(dto);
    }

    @Patch(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate a coupon', description: 'Deactivates a coupon. Requires super admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Coupon ID' })
    @ApiResponse({ status: 200, description: 'Coupon deactivated successfully.', type: Coupon })
    @ApiResponse({ status: 404, description: 'Coupon not found.' })
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.couponsService.deactivate(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a coupon', description: 'Deletes a coupon. Requires super admin privileges.' })
    @ApiParam({ name: 'id', type: Number, description: 'Coupon ID' })
    @ApiResponse({ status: 200, description: 'Coupon deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Coupon not found.' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.couponsService.remove(id);
    }
}