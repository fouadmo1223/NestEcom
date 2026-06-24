import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AddressesService } from './addresses.service';
import { Address } from './address.entity';

describe('AddressesService', () => {
  let service: AddressesService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: getRepositoryToken(Address), useValue: repo },
      ],
    }).compile();

    service = module.get(AddressesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll loads addresses for the given user', async () => {
    const result = [{ id: 1 }];
    repo.find.mockResolvedValue(result);

    await expect(service.findAll(3)).resolves.toBe(result as any);
    expect(repo.find).toHaveBeenCalledWith({ where: { user: { id: 3 } } });
  });

  it('findOne throws when the address does not exist', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne(1, 3)).rejects.toThrow(NotFoundException);
  });

  it('findOne throws when the user does not own the address', async () => {
    repo.findOne.mockResolvedValue({ id: 1, user: { id: 99 } });

    await expect(service.findOne(1, 3)).rejects.toThrow(ForbiddenException);
  });

  it('create clears existing defaults when creating a default address', async () => {
    const dto = { city: 'Cairo', isDefault: true } as any;
    const created = { ...dto, user: { id: 3 } };
    const saved = { id: 10, ...created };
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(saved);

    await expect(service.create(3, dto)).resolves.toBe(saved as any);
    expect(repo.update).toHaveBeenCalledWith({ user: { id: 3 } }, { isDefault: false });
    expect(repo.create).toHaveBeenCalledWith({ ...dto, user: { id: 3 } });
    expect(repo.save).toHaveBeenCalledWith(created);
  });

  it('remove deletes the address after ownership is validated', async () => {
    const address = { id: 1, user: { id: 3 } };
    repo.findOne.mockResolvedValue(address);
    repo.remove.mockResolvedValue(address);

    await expect(service.remove(1, 3)).resolves.toEqual({ message: 'Address deleted' });
    expect(repo.remove).toHaveBeenCalledWith(address);
  });
});
