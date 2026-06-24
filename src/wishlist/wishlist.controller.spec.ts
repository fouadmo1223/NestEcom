import { Test, TestingModule } from '@nestjs/testing';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

describe('WishlistController', () => {
  let controller: WishlistController;
  let service: {
    getWishlist: jest.Mock;
    toggle: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getWishlist: jest.fn(),
      toggle: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [{ provide: WishlistService, useValue: service }],
    }).compile();

    controller = module.get(WishlistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getWishlist delegates to the service', () => {
    const result = { items: [], total: 0 };
    service.getWishlist.mockReturnValue(result);

    expect(controller.getWishlist({ id: 5 })).toBe(result);
    expect(service.getWishlist).toHaveBeenCalledWith(5);
  });

  it('toggle delegates to the service', () => {
    const result = { message: 'Added to wishlist', added: true };
    service.toggle.mockReturnValue(result);

    expect(controller.toggle({ id: 5 }, 8)).toBe(result);
    expect(service.toggle).toHaveBeenCalledWith(5, 8);
  });

  it('remove delegates to the service', () => {
    const result = { message: 'Removed from wishlist' };
    service.remove.mockReturnValue(result);

    expect(controller.remove({ id: 5 }, 2)).toBe(result);
    expect(service.remove).toHaveBeenCalledWith(5, 2);
  });
});
