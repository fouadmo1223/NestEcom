import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Vendor } from './entities/vendor.entity';

/** Resolves the Vendor attached by VendorGuard. */
export const CurrentVendor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Vendor => {
    return ctx.switchToHttp().getRequest().vendor as Vendor;
  },
);
