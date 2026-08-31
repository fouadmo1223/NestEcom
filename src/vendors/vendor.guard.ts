import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { VendorsService } from './vendors.service';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';

/**
 * Attaches the caller's approved Vendor to `req.vendor`, or rejects with
 * VENDOR_NOT_APPROVED. Must run after JwtGuard.
 */
@Injectable()
export class VendorGuard implements CanActivate {
  constructor(private readonly vendorsService: VendorsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: number }; vendor?: unknown }>();
    const userId = req.user?.id;
    if (!userId) {
      throw AppError.forbidden('Authentication required', ErrorCode.UNAUTHENTICATED);
    }

    const vendor = await this.vendorsService.findApprovedByUserId(userId);
    if (!vendor) {
      throw AppError.forbidden(
        'An approved vendor account is required',
        ErrorCode.VENDOR_NOT_APPROVED,
      );
    }
    req.vendor = vendor;
    return true;
  }
}
