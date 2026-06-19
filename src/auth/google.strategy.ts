import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { UsersService } from '../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        config: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3001/auth/google/callback'),
            scope: ['email', 'profile'],
        });
    }

    async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || profile.name?.givenName || 'User';

        if (!email) return done(new Error('No email returned from Google'), undefined);

        const user = await this.usersService.findOrCreateGoogleUser({ email, name });
        done(null, user);
    }
}
