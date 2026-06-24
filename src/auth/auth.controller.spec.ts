import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshTokens: jest.Mock;
    generateTokensForUser: jest.Mock;
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
      sendVerificationOtp: jest.fn(),
      verifyEmail: jest.fn(),
      sendPasswordResetOtp: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(AuthController);
  });

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

  it('login stores the refresh token in a cookie and returns the remaining payload', async () => {
    const dto = { email: 'user@example.com', password: 'secret' } as any;
    const res = { cookie: jest.fn() } as any;
    usersService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
    });

    await expect(controller.login(dto, res)).resolves.toEqual({
      accessToken: 'access-token',
      user: { id: 1 },
    });
    expect(usersService.login).toHaveBeenCalledWith(dto);
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('refresh reads the cookie, rotates it, and returns the rest of the tokens', async () => {
    const req = { cookies: { refresh_token: 'old-refresh' } } as any;
    const res = { cookie: jest.fn() } as any;
    usersService.refreshTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(controller.refresh(req, res)).resolves.toEqual({ accessToken: 'new-access' });
    expect(usersService.refreshTokens).toHaveBeenCalledWith('old-refresh');
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('logout clears the refresh token cookie', () => {
    const res = { clearCookie: jest.fn() } as any;

    expect(controller.logout(res)).toEqual({ message: 'Logged out successfully' });
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
  });

  it('googleCallback stores the generated refresh token and returns the rest', () => {
    const req = { user: { id: 1, email: 'user@example.com' } } as any;
    const res = { cookie: jest.fn() } as any;
    usersService.generateTokensForUser.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
    });

    expect(controller.googleCallback(req, res)).toEqual({
      accessToken: 'access-token',
      user: { id: 1 },
    });
    expect(usersService.generateTokensForUser).toHaveBeenCalledWith(req.user);
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('sendVerificationOtp delegates to the users service', () => {
    const result = { message: 'sent' };
    usersService.sendVerificationOtp.mockReturnValue(result);

    expect(controller.sendVerificationOtp({ id: 4 })).toBe(result);
    expect(usersService.sendVerificationOtp).toHaveBeenCalledWith(4);
  });

  it('verifyEmail delegates to the users service', () => {
    const result = { message: 'verified' };
    usersService.verifyEmail.mockReturnValue(result);

    expect(controller.verifyEmail({ id: 4 }, { code: '123456' } as any)).toBe(result);
    expect(usersService.verifyEmail).toHaveBeenCalledWith(4, '123456');
  });

  it('sendResetOtp delegates to the users service', () => {
    const result = { message: 'sent' };
    usersService.sendPasswordResetOtp.mockReturnValue(result);

    expect(controller.sendResetOtp({ email: 'user@example.com' } as any)).toBe(result);
    expect(usersService.sendPasswordResetOtp).toHaveBeenCalledWith('user@example.com');
  });

  it('resetPassword delegates to the users service', () => {
    const result = { message: 'reset' };
    usersService.resetPassword.mockReturnValue(result);

    expect(
      controller.resetPassword({ email: 'user@example.com', code: '123456', newPassword: 'secret' } as any),
    ).toBe(result);
    expect(usersService.resetPassword).toHaveBeenCalledWith('user@example.com', '123456', 'secret');
  });
});
