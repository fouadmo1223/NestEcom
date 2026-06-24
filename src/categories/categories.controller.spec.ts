import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserType } from '../users/user.entity';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let cloudinaryService: {
    uploadFile: jest.Mock;
  };

  beforeEach(async () => {
    categoriesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    cloudinaryService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: categoriesService },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    controller = module.get(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll normalizes page and limit before delegating', () => {
    const result = { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    categoriesService.findAll.mockReturnValue(result);

    expect(controller.getAll({ page: 0, limit: 500 } as any)).toBe(result);
    expect(categoriesService.findAll).toHaveBeenCalledWith(1, 100);
  });

  it('getOne delegates to the service', () => {
    const result = { id: 1 };
    categoriesService.findOne.mockReturnValue(result);

    expect(controller.getOne(1)).toBe(result);
    expect(categoriesService.findOne).toHaveBeenCalledWith(1);
  });

  it('create uploads the file when present and delegates to the service', async () => {
    const dto = { name: 'Phones' } as any;
    const user = { id: 3, userType: UserType.ADMIN };
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;
    const result = { id: 1 };
    cloudinaryService.uploadFile.mockResolvedValue('https://cdn.example.com/category.png');
    categoriesService.create.mockResolvedValue(result);

    await expect(controller.create(dto, user, file)).resolves.toBe(result);
    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(file.buffer, 'categories');
    expect(categoriesService.create).toHaveBeenCalledWith(dto, 3, 'https://cdn.example.com/category.png');
  });

  it('create skips upload when no file is provided', async () => {
    const dto = { name: 'Phones' } as any;
    const user = { id: 3, userType: UserType.ADMIN };
    const result = { id: 1 };
    categoriesService.create.mockResolvedValue(result);

    await expect(controller.create(dto, user)).resolves.toBe(result);
    expect(cloudinaryService.uploadFile).not.toHaveBeenCalled();
    expect(categoriesService.create).toHaveBeenCalledWith(dto, 3, undefined);
  });

  it('update uploads the file when present and delegates to the service', async () => {
    const dto = { name: 'Updated' } as any;
    const user = { id: 3, userType: UserType.ADMIN };
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;
    const result = { id: 1 };
    cloudinaryService.uploadFile.mockResolvedValue('https://cdn.example.com/updated.png');
    categoriesService.update.mockResolvedValue(result);

    await expect(controller.update(1, dto, user, file)).resolves.toBe(result);
    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(file.buffer, 'categories');
    expect(categoriesService.update).toHaveBeenCalledWith(1, dto, user, 'https://cdn.example.com/updated.png');
  });

  it('delete delegates to the service', () => {
    const user = { id: 3, userType: UserType.ADMIN };
    const result = { id: 1 };
    categoriesService.delete.mockReturnValue(result);

    expect(controller.delete(1, user)).toBe(result);
    expect(categoriesService.delete).toHaveBeenCalledWith(1, user);
  });
});
