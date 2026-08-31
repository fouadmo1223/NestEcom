import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dtos/checkout.dto';
import { AdminOrdersQueryDto, MyOrdersQueryDto } from './dtos/orders-query.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';

type Actor = { id: number; userType: UserType; email: string };

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Place an order from the current cart (Cash on Delivery)' })
  checkout(
    @CurrentUser() user: Actor,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') headerKey?: string,
  ) {
    return this.ordersService.checkout(user.id, user.email, {
      ...dto,
      idempotencyKey: dto.idempotencyKey ?? headerKey,
    });
  }

  @Get('my')
  getMyOrders(@CurrentUser() user: Actor, @Query() query: MyOrdersQueryDto) {
    return this.ordersService.findMyOrders(user.id, query);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List every customer order (filters) — admin' })
  getAllAdmin(@Query() query: AdminOrdersQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Actor) {
    return this.ordersService.findOneForUser(id, user);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel your order while every item is still pending' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Actor) {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
