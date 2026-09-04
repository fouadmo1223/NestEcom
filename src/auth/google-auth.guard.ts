import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * Wraps the `google` passport strategy so `GET /auth/google?client=mobile`
 * carries that flag through Google's redirect round-trip via the OAuth
 * `state` param — passport-google-oauth20 echoes it back verbatim on
 * `req.query.state` in the callback, letting us pick the right redirect
 * target (web app vs. the mobile app's custom scheme).
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<Request>();
        const state = req.query.client === 'mobile' ? 'mobile' : 'web';
        return { state };
    }
}
