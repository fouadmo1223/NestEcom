import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dtos/checkout.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Order } from './order.entity';

type CurrentUserPayload = { id: number; userType: UserType; email: string };

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post('checkout')
    @ApiOperation({ summary: 'Checkout', description: 'Creates a new order from the user\'s cart.' })
    @ApiResponse({ status: 201, description: 'The order has been successfully created.', type: Order })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    @ApiResponse({ status: 404, description: 'Cart not found or some products are not available.' })
    checkout(@CurrentUser() user: CurrentUserPayload, @Body() dto: CheckoutDto) {
        return this.ordersService.checkout(user.id, user.email, dto);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get my orders', description: 'Retrieves the orders of the current user.' })
    @ApiResponse({ status: 200, description: 'A list of the user\'s orders.', type: [Order] })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination.' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page.' })
    getMyOrders(@CurrentUser() user: CurrentUserPayload, @Query() pagination: PaginationDto) {
        return this.ordersService.findMyOrders(user.id, pagination);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one order', description: 'Retrieves a single order by its ID.' })
    @ApiResponse({ status: 200, description: 'The requested order.', type: Order })
    @ApiResponse({ status: 404, description: 'Order not found.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the order.' })
    getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.ordersService.findOne(id, user);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all orders (Admin)',
        description: 'Retrieves all orders. Requires Admin or Super Admin role.',
    })
    @ApiResponse({ status: 200, description: 'A list of all orders.', type: [Order] })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination.' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page.' })
    @UseGuards(RolesGuard)
    @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
    getAll(@Query() pagination: PaginationDto) {
        return this.ordersService.findAll(pagination);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel an order', description: 'Allows a user to cancel their own order.' })
    @ApiResponse({ status: 200, description: 'The order has been successfully cancelled.', type: Order })
    @ApiResponse({ status: 404, description: 'Order not found.' })
    @ApiResponse({ status: 400, description: 'Order cannot be cancelled.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the order to cancel.' })
    cancelOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
        return this.ordersService.cancelOrder(id, user.id);
    }

    @Patch(':id/status')
    @ApiOperation({
        summary: 'Update order status (Admin)',
        description: 'Updates the status of an order. Requires Admin or Super Admin role.',
    })
    @ApiResponse({ status: 200, description: 'The order status has been successfully updated.', type: Order })
    @ApiResponse({ status: 404, description: 'Order not found.' })
    @ApiParam({ name: 'id', type: Number, description: 'The ID of the order to update.' })
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