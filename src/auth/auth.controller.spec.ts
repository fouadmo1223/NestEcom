import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshTokens: jest.Mock;
    generateTokensForUser: jest.Mock;
    issueGoogleAuthCode: jest.Mock;
    exchangeGoogleAuthCode: jest.Mock;
    sendVerificationOtp: jest.Mock;
    verifyEmail: jest.Mock;
    sendPasswordResetOtp: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      generateTokensForUser: jest.fn(),
      issueGoogleAuthCode: jest.fn(),
      exchangeGoogleAuthCode: jest.fn(),
      sendVerificationOtp: jest.fn(),
      verifyEmail: jest.fn(),
      sendPasswordResetOtp: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, def?: unknown) => def) },
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn(), verifyAsync: jest.fn(), sign: jest.fn(), signAsync: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  const webReq = () => ({ headers: {}, cookies: {} }) as any;

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register delegates to the users service', () => {
    const dto = { email: 'user@example.com' } as any;
    const result = { id: 1 };
    usersService.register.mockReturnValue(result);

    expect(controller.register(dto)).toBe(result);
    expect(usersService.register).toHaveBeenCalledWith(dto);
  });

  it('login sets the refresh cookie for web clients and returns the rest', async () => {
    const dto = { email: 'user@example.com', password: 'secret' } as any;
    const res = { cookie: jest.fn() } as any;
    usersService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
    });

    await expect(controller.login(dto, webReq(), res)).resolves.toEqual({
      accessToken: 'access-token',
      user: { id: 1 },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('login returns the refresh token in the body for native clients', async () => {
    const dto = { email: 'user@example.com', password: 'secret' } as any;
    const res = { cookie: jest.fn() } as any;
    const req = { headers: { 'x-client': 'mobile' }, cookies: {} } as any;
    usersService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
    });

    await expect(controller.login(dto, req, res)).resolves.toEqual({
      accessToken: 'access-token',
      user: { id: 1 },
      refreshToken: 'refresh-token',
    });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('refresh reads the cookie, rotates it, and returns the rest', async () => {
    const req = { headers: {}, cookies: { refresh_token: 'old-refresh' } } as any;
    const res = { cookie: jest.fn() } as any;
    usersService.refreshTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(controller.refresh({}, req, res)).resolves.toEqual({
      accessToken: 'new-access',
    });
    expect(usersService.refreshTokens).toHaveBeenCalledWith('old-refresh');
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('refresh accepts the token from the body for native clients', async () => {
    const req = { headers: { 'x-client': 'mobile' }, cookies: {} } as any;
    const res = { cookie: jest.fn() } as any;
    usersService.refreshTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(
      controller.refresh({ refreshToken: 'body-refresh' }, req, res),
    ).resolves.toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    expect(usersService.refreshTokens).toHaveBeenCalledWith('body-refresh');
  });

  it('logout clears the refresh token cookie', () => {
    const res = { clearCookie: jest.fn() } as any;
    expect(controller.logout(res)).toEqual({ message: 'Logged out successfully' });
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/' });
  });

  it('google/exchange swaps a one-time code for tokens', async () => {
    const res = { cookie: jest.fn() } as any;
    usersService.exchangeGoogleAuthCode.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 7 },
    });

    await expect(
      controller.googleExchange({ code: 'one-time' }, webReq(), res),
    ).resolves.toEqual({ accessToken: 'access-token', user: { id: 7 } });
    expect(usersService.exchangeGoogleAuthCode).toHaveBeenCalledWith('one-time');
  });
});
