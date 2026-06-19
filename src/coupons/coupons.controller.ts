import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';

@Controller('coupons')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) {}

    @Get()
    getAll() {
        return this.couponsService.findAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.couponsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateCouponDto) {
        return this.couponsService.create(dto);
    }

    @Patch(':id/deactivate')
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.couponsService.deactivate(id);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.couponsService.remove(id);
    }
}
