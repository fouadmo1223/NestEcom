import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserType } from '../users/user.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    findRelated: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let cloudinaryService: {
    uploadFile: jest.Mock;
  };

  beforeEach(async () => {
    productsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findRelated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    cloudinaryService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    controller = module.get(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll delegates to the service and passes null when there is no current user', () => {
    const query = { page: 1, limit: 10 } as any;
    const result = { data: [], pagination: {} };
    productsService.findAll.mockReturnValue(result);

    expect(controller.getAll(undefined, query)).toBe(result);
    expect(productsService.findAll).toHaveBeenCalledWith(null, query);
  });

  it('getOne delegates to the service', () => {
    const result = { id: 2 };
    productsService.findOne.mockReturnValue(result);

    expect(controller.getOne(2)).toBe(result);
    expect(productsService.findOne).toHaveBeenCalledWith(2);
  });

  it('getRelated delegates to the service', () => {
    const result = [{ id: 3 }];
    productsService.findRelated.mockReturnValue(result);

    expect(controller.getRelated(2)).toBe(result);
    expect(productsService.findRelated).toHaveBeenCalledWith(2);
  });

  it('create throws when no file is provided', async () => {
    const dto = { title: 'Phone' } as any;
    const user = { id: 1, userType: UserType.ADMIN };

    await expect(controller.create(dto, user, undefined as any)).rejects.toThrow(BadRequestException);
    expect(productsService.create).not.toHaveBeenCalled();
  });

  it('create uploads the file and delegates to the service', async () => {
    const dto = { title: 'Phone' } as any;
    const user = { id: 1, userType: UserType.ADMIN };
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;
    const result = { id: 1 };
    cloudinaryService.uploadFile.mockResolvedValue('https://cdn.example.com/product.png');
    productsService.create.mockResolvedValue(result);

    await expect(controller.create(dto, user, file)).resolves.toBe(result);
    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(file.buffer, 'products');
    expect(productsService.create).toHaveBeenCalledWith(dto, 1, 'https://cdn.example.com/product.png');
  });

  it('update uploads the file when present and delegates to the service', async () => {
    const dto = { title: 'Phone 2' } as any;
    const user = { id: 1, userType: UserType.ADMIN };
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;
    const result = { id: 1 };
    cloudinaryService.uploadFile.mockResolvedValue('https://cdn.example.com/product-2.png');
    productsService.update.mockResolvedValue(result);

    await expect(controller.update(1, dto, user, file)).resolves.toBe(result);
    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(file.buffer, 'products');
    expect(productsService.update).toHaveBeenCalledWith(1, dto, user, 'https://cdn.example.com/product-2.png');
  });

  it('delete delegates to the service', () => {
    const user = { id: 1, userType: UserType.ADMIN };
    const result = { id: 1 };
    productsService.delete.mockReturnValue(result);

    expect(controller.delete(1, user)).toBe(result);
    expect(productsService.delete).toHaveBeenCalledWith(1, user);
  });
});
