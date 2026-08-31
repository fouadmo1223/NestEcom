import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { CustomerOrder, CustomerOrderStatus } from '../orders/entities/customer-order.entity';
import { VendorOrder } from '../orders/entities/vendor-order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { User } from '../users/user.entity';
import { Vendor } from '../vendors/entities/vendor.entity';

const createQueryBuilderMock = () => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let orderRepo: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let vendorOrderRepo: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let itemRepo: { createQueryBuilder: jest.Mock };
  let userRepo: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let vendorRepo: { createQueryBuilder: jest.Mock; count: jest.Mock; findOneBy: jest.Mock };

  beforeEach(async () => {
    orderRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
    vendorOrderRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
    itemRepo = { createQueryBuilder: jest.fn() };
    userRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
    vendorRepo = { createQueryBuilder: jest.fn(), count: jest.fn(), findOneBy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(CustomerOrder), useValue: orderRepo },
        { provide: getRepositoryToken(VendorOrder), useValue: vendorOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: itemRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Vendor), useValue: vendorRepo },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getRevenue aggregates rows and applies optional date filters', async () => {
    const qb = createQueryBuilderMock();
    qb.getRawMany.mockResolvedValue([
      { date: '2024-01-01', revenue: '10.25', orders: '2' },
      { date: '2024-01-02', revenue: '5.50', orders: '1' },
    ]);
    orderRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.getRevenue('2024-01-01', '2024-01-31')).resolves.toEqual({
      totalRevenue: 15.75,
      totalOrders: 3,
      byDay: [
        { date: '2024-01-01', revenue: 10.25, orders: 2 },
        { date: '2024-01-02', revenue: 5.5, orders: 1 },
      ],
    });
    expect(qb.andWhere).toHaveBeenNthCalledWith(1, 'order.placedAt >= :startDate', {
      startDate: '2024-01-01',
    });
    expect(qb.andWhere).toHaveBeenNthCalledWith(2, 'order.placedAt <= :endDate', {
      endDate: '2024-01-31',
    });
  });

  it('getBestSelling maps raw query rows to numeric values', async () => {
    const qb = createQueryBuilderMock();
    qb.getRawMany.mockResolvedValue([
      { productId: '7', productTitle: 'Phone', totalSold: '4', totalRevenue: '99.99' },
    ]);
    itemRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.getBestSelling(5)).resolves.toEqual([
      { productId: 7, productTitle: 'Phone', totalSold: 4, totalRevenue: 99.99 },
    ]);
    expect(qb.limit).toHaveBeenCalledWith(5);
  });

  it('getOrdersByStatus returns zero for statuses missing from the query result', async () => {
    const qb = createQueryBuilderMock();
    qb.getRawMany.mockResolvedValue([{ status: CustomerOrderStatus.PENDING, count: '3' }]);
    orderRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getOrdersByStatus();

    expect(result[CustomerOrderStatus.PENDING]).toBe(3);
    expect(result[CustomerOrderStatus.CANCELLED]).toBe(0);
  });
});
