import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const service = {
    findAllPublic: jest.fn(),
    findAllAdmin: jest.fn(),
    findOnePublic: jest.fn(),
    findRelated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
    })
      .overrideGuard(require('../auth/jwt-optional.guard').JwtOptionalGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../auth/jwt.guard').JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../auth/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ProductsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('list delegates to findAllPublic', () => {
    service.findAllPublic.mockReturnValue('ok');
    expect(controller.list({} as never)).toBe('ok');
  });

  it('getOne delegates to findOnePublic', () => {
    service.findOnePublic.mockReturnValue('p');
    expect(controller.getOne('wireless-headphones')).toBe('p');
    expect(service.findOnePublic).toHaveBeenCalledWith('wireless-headphones');
  });

  it('getRelated delegates to findRelated', () => {
    service.findRelated.mockReturnValue([]);
    expect(controller.getRelated(5)).toEqual([]);
    expect(service.findRelated).toHaveBeenCalledWith(5);
  });
});
