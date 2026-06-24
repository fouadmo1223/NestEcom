import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserType } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    getCurrentUser: jest.Mock;
    changePassword: jest.Mock;
    deleteMyAccount: jest.Mock;
    updateProfileImage: jest.Mock;
    banUser: jest.Mock;
    unbanUser: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let cloudinaryService: {
    uploadFile: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      getCurrentUser: jest.fn(),
      changePassword: jest.fn(),
      deleteMyAccount: jest.fn(),
      updateProfileImage: jest.fn(),
      banUser: jest.fn(),
      unbanUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    cloudinaryService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    controller = module.get(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll normalizes pagination before delegating', () => {
    const result = { data: [], pagination: {} };
    usersService.findAll.mockReturnValue(result);

    expect(controller.getAll({ page: 0, limit: 500 } as any)).toBe(result);
    expect(usersService.findAll).toHaveBeenCalledWith(1, 100);
  });

  it('getMe delegates to the service', () => {
    const result = { id: 1 };
    usersService.getCurrentUser.mockReturnValue(result);

    expect(controller.getMe({ id: 1 })).toBe(result);
    expect(usersService.getCurrentUser).toHaveBeenCalledWith(1);
  });

  it('changePassword delegates to the service', () => {
    const dto = { currentPassword: 'old', newPassword: 'new' } as any;
    const result = { message: 'Password changed successfully' };
    usersService.changePassword.mockReturnValue(result);

    expect(controller.changePassword({ id: 1 }, dto)).toBe(result);
    expect(usersService.changePassword).toHaveBeenCalledWith(1, 'old', 'new');
  });

  it('deleteMyAccount delegates to the service', () => {
    const result = { message: 'Account deleted successfully' };
    usersService.deleteMyAccount.mockReturnValue(result);

    expect(controller.deleteMyAccount({ id: 1 })).toBe(result);
    expect(usersService.deleteMyAccount).toHaveBeenCalledWith(1);
  });

  it('uploadProfileImage throws when no file is provided', async () => {
    await expect(controller.uploadProfileImage({ id: 1 }, undefined as any)).rejects.toThrow(BadRequestException);
    expect(usersService.updateProfileImage).not.toHaveBeenCalled();
  });

  it('uploadProfileImage uploads the file and delegates to the service', async () => {
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;
    const result = { id: 1, profileImage: 'https://cdn.example.com/profile.png' };
    cloudinaryService.uploadFile.mockResolvedValue('https://cdn.example.com/profile.png');
    usersService.updateProfileImage.mockResolvedValue(result);

    await expect(controller.uploadProfileImage({ id: 1 }, file)).resolves.toBe(result);
    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(file.buffer, 'profiles');
    expect(usersService.updateProfileImage).toHaveBeenCalledWith(1, 'https://cdn.example.com/profile.png');
  });

  it('banUser delegates to the service', () => {
    const result = { message: 'banned' };
    usersService.banUser.mockReturnValue(result);

    expect(controller.banUser(4)).toBe(result);
    expect(usersService.banUser).toHaveBeenCalledWith(4);
  });

  it('unbanUser delegates to the service', () => {
    const result = { message: 'unbanned' };
    usersService.unbanUser.mockReturnValue(result);

    expect(controller.unbanUser(4)).toBe(result);
    expect(usersService.unbanUser).toHaveBeenCalledWith(4);
  });

  it('getOne delegates to the service', () => {
    const result = { id: 2 };
    usersService.findOne.mockReturnValue(result);

    expect(controller.getOne(2)).toBe(result);
    expect(usersService.findOne).toHaveBeenCalledWith(2);
  });

  it('update delegates to the service', () => {
    const dto = { username: 'new-name' } as any;
    const currentUser = { id: 1, userType: UserType.USER };
    const result = { id: 1, username: 'new-name' };
    usersService.update.mockReturnValue(result);

    expect(controller.update(1, dto, currentUser)).toBe(result);
    expect(usersService.update).toHaveBeenCalledWith(1, dto, currentUser);
  });

  it('delete delegates to the service', () => {
    const currentUser = { id: 1, userType: UserType.USER };
    const result = { id: 1 };
    usersService.delete.mockReturnValue(result);

    expect(controller.delete(1, currentUser)).toBe(result);
    expect(usersService.delete).toHaveBeenCalledWith(1, currentUser);
  });
});
