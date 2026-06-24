import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;
  let service: {
    getCart: jest.Mock;
    addItem: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
    clearCart: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getCart: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: service }],
    }).compile();

    controller = module.get(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getCart delegates to the service', () => {
    const result = { items: [], total: 0 };
    service.getCart.mockReturnValue(result);

    expect(controller.getCart({ id: 8 })).toBe(result);
    expect(service.getCart).toHaveBeenCalledWith(8);
  });

  it('addItem delegates to the service', () => {
    const dto = { productId: 3, quantity: 2 } as any;
    const result = { id: 1 };
    service.addItem.mockReturnValue(result);

    expect(controller.addItem({ id: 8 }, dto)).toBe(result);
    expect(service.addItem).toHaveBeenCalledWith(8, dto);
  });

  it('updateItem delegates to the service', () => {
    const dto = { quantity: 5 } as any;
    const result = { id: 1 };
    service.updateItem.mockReturnValue(result);

    expect(controller.updateItem({ id: 8 }, 11, dto)).toBe(result);
    expect(service.updateItem).toHaveBeenCalledWith(8, 11, dto);
  });

  it('removeItem delegates to the service', () => {
    const result = { message: 'removed' };
    service.removeItem.mockReturnValue(result);

    expect(controller.removeItem({ id: 8 }, 11)).toBe(result);
    expect(service.removeItem).toHaveBeenCalledWith(8, 11);
  });

  it('clearCart delegates to the service', () => {
    const result = { message: 'cleared' };
    service.clearCart.mockReturnValue(result);

    expect(controller.clearCart({ id: 8 })).toBe(result);
    expect(service.clearCart).toHaveBeenCalledWith(8);
  });
});
