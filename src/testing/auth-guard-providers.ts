import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * Drop-in providers for unit tests whose controller/route is decorated with
 * `@UseGuards(JwtGuard)` / `JwtOptionalGuard`. Those guards inject `JwtService`
 * and `ConfigService`, so Nest needs them in the testing module's DI graph even
 * though guard `canActivate` never runs when a controller method is invoked
 * directly. `RolesGuard` only needs `Reflector`, which `Test` provides for free.
 *
 * Usage:
 *   providers: [{ provide: FooService, useValue: fooMock }, ...authGuardProviders]
 */
export const authGuardProviders = [
  {
    provide: JwtService,
    useValue: {
      verify: () => ({ id: 1, userType: 'super_admin' }),
      verifyAsync: async () => ({ id: 1, userType: 'super_admin' }),
      sign: () => 'test-token',
      signAsync: async () => 'test-token',
      decode: () => ({ id: 1, userType: 'super_admin' }),
    },
  },
  {
    provide: ConfigService,
    useValue: {
      get: (key: string) => process.env[key],
    },
  },
];
