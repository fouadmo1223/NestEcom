import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dtos/checkout.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';

type CurrentUserPayload = { id: number; userType: UserType; email: string };

@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post('checkout')
    checkout(@CurrentUser() user: CurrentUserPayload, @Body() dto: CheckoutDto) {
        return this.ordersService.checkout(user.id, user.email, dto);
    }

    @Get('my')
    getMyOrders(@CurrentUser() user: CurrentUserPayload, @Query() pagination: PaginationDto) {
        return this.ordersService.findMyOrders(user.id, pagination);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.ordersService.findOne(id, user);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    getAll(@Query() pagination: PaginationDto) {
        return this.ordersService.findAll(pagination);
    }

    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.ordersService.updateStatus(id, dto, user.email);
    }
}
