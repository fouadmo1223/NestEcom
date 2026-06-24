import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

describe('AddressesController', () => {
  let controller: AddressesController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [{ provide: AddressesService, useValue: service }],
    }).compile();

    controller = module.get(AddressesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll delegates to the service with the current user id', () => {
    const result = [{ id: 1 }];
    service.findAll.mockReturnValue(result);

    expect(controller.getAll({ id: 7 })).toBe(result);
    expect(service.findAll).toHaveBeenCalledWith(7);
  });

  it('getOne delegates to the service', () => {
    const result = { id: 3 };
    service.findOne.mockReturnValue(result);

    expect(controller.getOne(3, { id: 7 })).toBe(result);
    expect(service.findOne).toHaveBeenCalledWith(3, 7);
  });

  it('create delegates to the service', () => {
    const dto = { city: 'Cairo' } as any;
    const result = { id: 2 };
    service.create.mockReturnValue(result);

    expect(controller.create({ id: 7 }, dto)).toBe(result);
    expect(service.create).toHaveBeenCalledWith(7, dto);
  });

  it('update delegates to the service', () => {
    const dto = { city: 'Alex' } as any;
    const result = { id: 2 };
    service.update.mockReturnValue(result);

    expect(controller.update(2, { id: 7 }, dto)).toBe(result);
    expect(service.update).toHaveBeenCalledWith(2, 7, dto);
  });

  it('remove delegates to the service', () => {
    const result = { message: 'Address deleted' };
    service.remove.mockReturnValue(result);

    expect(controller.remove(2, { id: 7 })).toBe(result);
    expect(service.remove).toHaveBeenCalledWith(2, 7);
  });
});
