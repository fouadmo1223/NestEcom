import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { UserType } from '../users/user.entity';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: {
    checkout: jest.Mock;
    findMyOrders: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
    cancelOrder: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      checkout: jest.fn(),
      findMyOrders: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      cancelOrder: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();

    controller = module.get(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('checkout delegates to the service', () => {
    const user = { id: 4, email: 'user@example.com', userType: UserType.USER };
    const dto = { addressId: 2 } as any;
    const result = { id: 1 };
    service.checkout.mockReturnValue(result);

    expect(controller.checkout(user, dto)).toBe(result);
    expect(service.checkout).toHaveBeenCalledWith(4, 'user@example.com', dto);
  });

  it('getMyOrders delegates to the service', () => {
    const user = { id: 4, email: 'user@example.com', userType: UserType.USER };
    const pagination = { page: 2, limit: 5 } as any;
    const result = { data: [], pagination: {} };
    service.findMyOrders.mockReturnValue(result);

    expect(controller.getMyOrders(user, pagination)).toBe(result);
    expect(service.findMyOrders).toHaveBeenCalledWith(4, pagination);
  });

  it('getOne delegates to the service', () => {
    const user = { id: 4, email: 'user@example.com', userType: UserType.USER };
    const result = { id: 1 };
    service.findOne.mockReturnValue(result);

    expect(controller.getOne(1, user)).toBe(result);
    expect(service.findOne).toHaveBeenCalledWith(1, user);
  });

  it('getAll delegates to the service', () => {
    const pagination = { page: 1, limit: 10 } as any;
    const result = { data: [], pagination: {} };
    service.findAll.mockReturnValue(result);

    expect(controller.getAll(pagination)).toBe(result);
    expect(service.findAll).toHaveBeenCalledWith(pagination);
  });

  it('cancelOrder delegates to the service', () => {
    const user = { id: 4, email: 'user@example.com', userType: UserType.USER };
    const result = { id: 1, status: 'cancelled' };
    service.cancelOrder.mockReturnValue(result);

    expect(controller.cancelOrder(1, user)).toBe(result);
    expect(service.cancelOrder).toHaveBeenCalledWith(1, 4);
  });

  it('updateStatus delegates to the service', () => {
    const user = { id: 4, email: 'admin@example.com', userType: UserType.ADMIN };
    const dto = { status: 'shipped', trackingNumber: 'TRK123' } as any;
    const result = { id: 1, status: 'shipped' };
    service.updateStatus.mockReturnValue(result);

    expect(controller.updateStatus(1, dto, user)).toBe(result);
    expect(service.updateStatus).toHaveBeenCalledWith(1, dto, 'admin@example.com');
  });
});
