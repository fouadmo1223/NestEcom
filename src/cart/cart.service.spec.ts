import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { CartItem } from './cart-item.entity';
import { Product, ProductStatus } from '../products/product.entity';
import { Store } from '../vendors/entities/store.entity';
import { VendorStatus } from '../vendors/entities/vendor.entity';

const sellableProduct = (over: Partial<Product> = {}): Product =>
  ({
    id: 8,
    title: 'Phone',
    price: 10,
    stock: 5,
    vendorId: 1,
    status: ProductStatus.ACTIVE,
    vendor: { id: 1, status: VendorStatus.APPROVED },
    ...over,
  }) as unknown as Product;

describe('CartService', () => {
  let service: CartService;
  let cartRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    delete: jest.Mock;
  };
  let productRepo: { find: jest.Mock; findOne: jest.Mock };
  let storeRepo: { find: jest.Mock };

  beforeEach(async () => {
    cartRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };
    productRepo = { find: jest.fn(), findOne: jest.fn() };
    storeRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartItem), useValue: cartRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Store), useValue: storeRepo },
      ],
    }).compile();

    service = module.get(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCart groups items by vendor and computes the subtotal', async () => {
    cartRepo.find.mockResolvedValue([
      { id: 1, quantity: 2, product: sellableProduct({ price: 10 }) },
      { id: 2, quantity: 1, product: sellableProduct({ id: 9, price: 5.5 }) },
    ]);
    storeRepo.find.mockResolvedValue([
      { vendorId: 1, name: 'Acme', slug: 'acme', isActive: true },
    ]);

    const cart = await service.getCart(4);

    expect(cart.subtotal).toBe(25.5);
    expect(cart.total).toBe(25.5);
    expect(cart.itemCount).toBe(3);
    expect(cart.groups).toHaveLength(1);
    expect(cart.groups[0].vendor).toMatchObject({ id: 1, name: 'Acme', slug: 'acme' });
    expect(cart.items[0].available).toBe(true);
    expect(cartRepo.find).toHaveBeenCalledWith({
      where: { user: { id: 4 } },
      relations: { product: { vendor: true } },
      order: { createdAt: 'ASC' },
    });
  });

  it('addItem rejects quantities beyond available stock', async () => {
    productRepo.findOne.mockResolvedValue(sellableProduct({ stock: 2 }));
    cartRepo.findOne.mockResolvedValue(null);

    await expect(
      service.addItem(4, { productId: 8, quantity: 3 } as any),
    ).rejects.toThrow(BadRequestException);
    expect(cartRepo.save).not.toHaveBeenCalled();
  });

  it('addItem accumulates quantity for an item already in the cart', async () => {
    productRepo.findOne.mockResolvedValue(sellableProduct({ stock: 10 }));
    cartRepo.findOne.mockResolvedValue({ id: 1, quantity: 2 });

    await service.addItem(4, { productId: 8, quantity: 3 } as any);

    expect(cartRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, quantity: 5 }));
  });

  it('updateItem throws when the cart item is missing', async () => {
    cartRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateItem(4, 9, { quantity: 1 } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('clearCart deletes all items for the user', async () => {
    cartRepo.delete.mockResolvedValue({ affected: 2 });

    await expect(service.clearCart(4)).resolves.toEqual({ message: 'Cart cleared' });
    expect(cartRepo.delete).toHaveBeenCalledWith({ user: { id: 4 } });
  });
});
