import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { CartItem } from './cart-item.entity';

describe('CartService', () => {
  let service: CartService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartItem), useValue: repo },
      ],
    }).compile();

    service = module.get(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCart returns items and the computed total', async () => {
    repo.find.mockResolvedValue([
      { quantity: 2, product: { price: 10 } },
      { quantity: 1, product: { price: 5.5 } },
    ]);

    await expect(service.getCart(4)).resolves.toEqual({
      items: [
        { quantity: 2, product: { price: 10 } },
        { quantity: 1, product: { price: 5.5 } },
      ],
      total: 25.5,
    });
    expect(repo.find).toHaveBeenCalledWith({
      where: { user: { id: 4 } },
      relations: { product: true },
    });
  });

  it('addItem increases quantity when the product already exists in the cart', async () => {
    const existing = { id: 1, quantity: 2 };
    repo.findOne.mockResolvedValue(existing);
    repo.save.mockResolvedValue({ ...existing, quantity: 5 });

    await expect(service.addItem(4, { productId: 8, quantity: 3 } as any)).resolves.toEqual({ id: 1, quantity: 5 });
    expect(repo.save).toHaveBeenCalledWith({ id: 1, quantity: 5 });
  });

  it('updateItem throws when the cart item is missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.updateItem(4, 9, { quantity: 1 } as any)).rejects.toThrow(NotFoundException);
  });

  it('clearCart deletes all items for the user', async () => {
    repo.delete.mockResolvedValue({ affected: 2 });

    await expect(service.clearCart(4)).resolves.toEqual({ message: 'Cart cleared' });
    expect(repo.delete).toHaveBeenCalledWith({ user: { id: 4 } });
  });
});
