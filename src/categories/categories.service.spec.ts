import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { UserType } from '../users/user.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns data with pagination metadata', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 1 }], 11]);

    await expect(service.findAll(2, 5)).resolves.toEqual({
      data: [{ id: 1 }],
      pagination: { total: 11, page: 2, limit: 5, totalPages: 3 },
    });
  });

  it('findOne throws when the category is missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });

  it('create assigns the creator and optional image', async () => {
    const dto = { name: 'Phones' } as any;
    const created = { ...dto, image: 'https://cdn.example.com/cat.png', createdBy: { id: 3 } };
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue({ id: 1, ...created });

    await expect(service.create(dto, 3, 'https://cdn.example.com/cat.png')).resolves.toEqual({ id: 1, ...created });
    expect(repo.create).toHaveBeenCalledWith({
      ...dto,
      image: 'https://cdn.example.com/cat.png',
      createdBy: { id: 3 },
    });
  });

  it('update throws when a non-owner non-super-admin tries to update the category', async () => {
    repo.findOne.mockResolvedValue({ id: 1, createdBy: { id: 99 } });

    await expect(
      service.update(1, { name: 'Updated' } as any, { id: 3, userType: UserType.ADMIN }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('update saves the new data when the current user owns the category', async () => {
    const category = { id: 1, name: 'Phones', image: null, createdBy: { id: 3 } };
    repo.findOne.mockResolvedValue(category);
    repo.save.mockResolvedValue({ ...category, name: 'Updated', image: 'image-url' });

    await expect(
      service.update(1, { name: 'Updated' } as any, { id: 3, userType: UserType.ADMIN }, 'image-url'),
    ).resolves.toEqual({ ...category, name: 'Updated', image: 'image-url' });
    expect(repo.save).toHaveBeenCalledWith({ ...category, name: 'Updated', image: 'image-url' });
  });
});
