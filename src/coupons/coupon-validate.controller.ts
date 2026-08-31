import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CartService } from '../cart/cart.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ValidateCouponDto } from './dtos/create-coupon.dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
@UseGuards(JwtGuard)
export class CouponValidateController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly cartService: CartService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview a coupon against the current cart' })
  async validate(@CurrentUser() user: { id: number }, @Body() dto: ValidateCouponDto) {
    const cart = await this.cartService.getCart(user.id);
    const groups = cart.groups.map((g) => ({ vendorId: g.vendor.id, subtotal: g.subtotal }));
    const { coupon, discountTotal, allocations } = await this.couponsService.evaluate(
      dto.code,
      groups,
    );

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      scope: coupon.scope,
      discountTotal,
      allocations,
      subtotal: cart.subtotal,
      total: Math.round((cart.subtotal - discountTotal) * 100) / 100,
    };
  }
}
