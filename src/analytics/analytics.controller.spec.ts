import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: {
    getRevenue: jest.Mock;
    getBestSelling: jest.Mock;
    getOrdersByStatus: jest.Mock;
    getUserGrowth: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getRevenue: jest.fn(),
      getBestSelling: jest.fn(),
      getOrdersByStatus: jest.fn(),
      getUserGrowth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: service }],
    }).compile();

    controller = module.get(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getRevenue delegates to the service', () => {
    const result = { totalRevenue: 10 };
    service.getRevenue.mockReturnValue(result);

    expect(controller.getRevenue({ startDate: '2024-01-01', endDate: '2024-01-31' } as any)).toBe(result);
    expect(service.getRevenue).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
  });

  it('getBestSelling delegates to the service', () => {
    const result = [{ productId: 1 }];
    service.getBestSelling.mockReturnValue(result);

    expect(controller.getBestSelling(5)).toBe(result);
    expect(service.getBestSelling).toHaveBeenCalledWith(5);
  });

  it('getOrdersByStatus delegates to the service', () => {
    const result = { pending: 2 };
    service.getOrdersByStatus.mockReturnValue(result);

    expect(controller.getOrdersByStatus()).toBe(result);
    expect(service.getOrdersByStatus).toHaveBeenCalled();
  });

  it('getUserGrowth delegates to the service', () => {
    const result = { totalUsers: 3 };
    service.getUserGrowth.mockReturnValue(result);

    expect(controller.getUserGrowth({ startDate: '2024-02-01', endDate: '2024-02-10' } as any)).toBe(result);
    expect(service.getUserGrowth).toHaveBeenCalledWith('2024-02-01', '2024-02-10');
  });
});
