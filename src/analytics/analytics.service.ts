import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
        @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) {}

    async getRevenue(startDate?: string, endDate?: string) {
        const qb = this.orderRepo
            .createQueryBuilder('order')
            .select("DATE_TRUNC('day', order.createdAt)", 'date')
            .addSelect('SUM(order.total)', 'revenue')
            .addSelect('COUNT(order.id)', 'orders')
            .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
            .groupBy("DATE_TRUNC('day', order.createdAt)")
            .orderBy("DATE_TRUNC('day', order.createdAt)", 'ASC');

        if (startDate) qb.andWhere('order.createdAt >= :startDate', { startDate });
        if (endDate) qb.andWhere('order.createdAt <= :endDate', { endDate });

        const rows = await qb.getRawMany<{ date: string; revenue: string; orders: string }>();

        const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0);
        const totalOrders = rows.reduce((sum, r) => sum + parseInt(r.orders), 0);

        return {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalOrders,
            byDay: rows.map((r) => ({
                date: r.date,
                revenue: Math.round(parseFloat(r.revenue) * 100) / 100,
                orders: parseInt(r.orders),
            })),
        };
    }

    async getBestSelling(limit = 10) {
        const rows = await this.itemRepo
            .createQueryBuilder('item')
            .select('item.productId', 'productId')
            .addSelect('item.productTitle', 'productTitle')
            .addSelect('SUM(item.quantity)', 'totalSold')
            .addSelect('SUM(item.total)', 'totalRevenue')
            .innerJoin('item.order', 'order')
            .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
            .groupBy('item.productId')
            .addGroupBy('item.productTitle')
            .orderBy('SUM(item.quantity)', 'DESC')
            .limit(limit)
            .getRawMany<{ productId: string; productTitle: string; totalSold: string; totalRevenue: string }>();

        return rows.map((r) => ({
            productId: parseInt(r.productId),
            productTitle: r.productTitle,
            totalSold: parseInt(r.totalSold),
            totalRevenue: Math.round(parseFloat(r.totalRevenue) * 100) / 100,
        }));
    }

    async getOrdersByStatus() {
        const rows = await this.orderRepo
            .createQueryBuilder('order')
            .select('order.status', 'status')
            .addSelect('COUNT(order.id)', 'count')
            .groupBy('order.status')
            .getRawMany<{ status: string; count: string }>();

        const result: Record<string, number> = {};
        for (const status of Object.values(OrderStatus)) {
            result[status] = 0;
        }
        for (const row of rows) {
            result[row.status] = parseInt(row.count);
        }
        return result;
    }

    async getUserGrowth(startDate?: string, endDate?: string) {
        const qb = this.userRepo
            .createQueryBuilder('user')
            .select("DATE_TRUNC('day', user.createdAt)", 'date')
            .addSelect('COUNT(user.id)', 'newUsers')
            .groupBy("DATE_TRUNC('day', user.createdAt)")
            .orderBy("DATE_TRUNC('day', user.createdAt)", 'ASC');

        if (startDate) qb.andWhere('user.createdAt >= :startDate', { startDate });
        if (endDate) qb.andWhere('user.createdAt <= :endDate', { endDate });

        const rows = await qb.getRawMany<{ date: string; newUsers: string }>();

        const totalUsers = await this.userRepo.count();
        const totalNew = rows.reduce((sum, r) => sum + parseInt(r.newUsers), 0);

        return {
            totalUsers,
            newUsersInRange: totalNew,
            byDay: rows.map((r) => ({
                date: r.date,
                newUsers: parseInt(r.newUsers),
            })),
        };
    }
}
