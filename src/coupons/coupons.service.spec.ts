import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CouponsService } from './coupons.service';
import { Coupon, DiscountType } from './coupon.entity';

describe('CouponsService', () => {
  let service: CouponsService;
  let repo: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    increment: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: repo },
      ],
    }).compile();

    service = module.get(CouponsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findOne throws when the coupon does not exist', async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });

  it('create normalizes nullable fields before saving', async () => {
    const dto = { code: 'SAVE10', discountValue: 10 } as any;
    const created = {
      ...dto,
      minOrderAmount: null,
      maxUses: null,
      expiresAt: null,
    };
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue({ id: 1, ...created });

    await expect(service.create(dto)).resolves.toEqual({ id: 1, ...created });
    expect(repo.create).toHaveBeenCalledWith(created);
  });

  it('validate rejects inactive or missing coupons', async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(service.validate('save10', 100)).rejects.toThrow(BadRequestException);
  });

  it('validate calculates percentage discounts and rounds the result', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 2,
      code: 'SAVE10',
      isActive: true,
      expiresAt: null,
      maxUses: null,
      usedCount: 0,
      minOrderAmount: null,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 12.345,
    });

    await expect(service.validate('save10', 80)).resolves.toEqual({
      coupon: expect.objectContaining({ code: 'SAVE10' }),
      discountAmount: 9.88,
    });
  });

  it('incrementUsage increments the coupon usage counter', async () => {
    repo.increment.mockResolvedValue({ affected: 1 });

    await service.incrementUsage(3);
    expect(repo.increment).toHaveBeenCalledWith({ id: 3 }, 'usedCount', 1);
  });
});
