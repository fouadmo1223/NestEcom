import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { UserType } from '../users/user.entity';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: {
    findAll: jest.Mock;
    findByProduct: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findByProduct: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: service }],
    }).compile();

    controller = module.get(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll normalizes page and limit before delegating', () => {
    const result = { data: [], pagination: {} };
    service.findAll.mockReturnValue(result);

    expect(controller.getAll({ page: 0, limit: 1000 } as any)).toBe(result);
    expect(service.findAll).toHaveBeenCalledWith(1, 100);
  });

  it('getByProduct delegates to the service', () => {
    const result = [{ id: 1 }];
    service.findByProduct.mockReturnValue(result);

    expect(controller.getByProduct(5)).toBe(result);
    expect(service.findByProduct).toHaveBeenCalledWith(5);
  });

  it('getOne delegates to the service', () => {
    const result = { id: 1 };
    service.findOne.mockReturnValue(result);

    expect(controller.getOne(1)).toBe(result);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('create delegates to the service', () => {
    const dto = { productId: 2, rating: 5 } as any;
    const user = { id: 9, userType: UserType.USER };
    const result = { id: 1 };
    service.create.mockReturnValue(result);

    expect(controller.create(dto, user)).toBe(result);
    expect(service.create).toHaveBeenCalledWith(dto, 9);
  });

  it('update delegates to the service', () => {
    const dto = { comment: 'Updated' } as any;
    const user = { id: 9, userType: UserType.USER };
    const result = { id: 1 };
    service.update.mockReturnValue(result);

    expect(controller.update(1, dto, user)).toBe(result);
    expect(service.update).toHaveBeenCalledWith(1, dto, user);
  });

  it('delete delegates to the service', () => {
    const user = { id: 9, userType: UserType.USER };
    const result = { id: 1 };
    service.delete.mockReturnValue(result);

    expect(controller.delete(1, user)).toBe(result);
    expect(service.delete).toHaveBeenCalledWith(1, user);
  });
});
