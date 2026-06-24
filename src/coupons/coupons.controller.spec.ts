import { Test, TestingModule } from '@nestjs/testing';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

describe('CouponsController', () => {
  let controller: CouponsController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    deactivate: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      deactivate: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [{ provide: CouponsService, useValue: service }],
    }).compile();

    controller = module.get(CouponsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll delegates to the service', () => {
    const result = [{ id: 1 }];
    service.findAll.mockReturnValue(result);

    expect(controller.getAll()).toBe(result);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('getOne delegates to the service', () => {
    const result = { id: 1 };
    service.findOne.mockReturnValue(result);

    expect(controller.getOne(1)).toBe(result);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('create delegates to the service', () => {
    const dto = { code: 'SAVE10' } as any;
    const result = { id: 1 };
    service.create.mockReturnValue(result);

    expect(controller.create(dto)).toBe(result);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('deactivate delegates to the service', () => {
    const result = { id: 1, isActive: false };
    service.deactivate.mockReturnValue(result);

    expect(controller.deactivate(1)).toBe(result);
    expect(service.deactivate).toHaveBeenCalledWith(1);
  });

  it('remove delegates to the service', () => {
    const result = { message: 'Coupon deleted' };
    service.remove.mockReturnValue(result);

    expect(controller.remove(1)).toBe(result);
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
