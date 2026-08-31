import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CustomerOrder, CustomerOrderStatus } from '../orders/entities/customer-order.entity';
import { VendorOrder, VendorOrderStatus } from '../orders/entities/vendor-order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { User } from '../users/user.entity';
import { Vendor, VendorStatus } from '../vendors/entities/vendor.entity';

const round = (n: number) => Math.round(n * 100) / 100;
const DAYS_30 = "NOW() - INTERVAL '30 days'";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CustomerOrder) private readonly orders: Repository<CustomerOrder>,
    @InjectRepository(VendorOrder) private readonly vendorOrders: Repository<VendorOrder>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
  ) {}

  // ─── Legacy platform (kept for /analytics) ───────────────────────────

  async getRevenue(startDate?: string, endDate?: string) {
    const qb = this.orders
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.placedAt)", 'date')
      .addSelect('SUM(order.grandTotal)', 'revenue')
      .addSelect('COUNT(order.id)', 'orders')
      .where('order.status != :cancelled', { cancelled: CustomerOrderStatus.CANCELLED })
      .groupBy("DATE_TRUNC('day', order.placedAt)")
      .orderBy("DATE_TRUNC('day', order.placedAt)", 'ASC');
    if (startDate) qb.andWhere('order.placedAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('order.placedAt <= :endDate', { endDate });

    const rows = await qb.getRawMany<{ date: string; revenue: string; orders: string }>();
    return {
      totalRevenue: round(rows.reduce((s, r) => s + parseFloat(r.revenue), 0)),
      totalOrders: rows.reduce((s, r) => s + parseInt(r.orders), 0),
      byDay: rows.map((r) => ({
        date: r.date,
        revenue: round(parseFloat(r.revenue)),
        orders: parseInt(r.orders),
      })),
    };
  }

  async getBestSelling(limit = 10) {
    const rows = await this.items
      .createQueryBuilder('item')
      .select('item.productId', 'productId')
      .addSelect('item.productTitle', 'productTitle')
      .addSelect('SUM(item.quantity)', 'totalSold')
      .addSelect('SUM(item.lineTotal)', 'totalRevenue')
      .innerJoin('item.vendorOrder', 'vo')
      .innerJoin('vo.customerOrder', 'order')
      .where('order.status != :cancelled', { cancelled: CustomerOrderStatus.CANCELLED })
      .groupBy('item.productId')
      .addGroupBy('item.productTitle')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; productTitle: string; totalSold: string; totalRevenue: string }>();
    return rows.map((r) => ({
      productId: parseInt(r.productId),
      productTitle: r.productTitle,
      totalSold: parseInt(r.totalSold),
      totalRevenue: round(parseFloat(r.totalRevenue)),
    }));
  }

  async getOrdersByStatus() {
    const rows = await this.orders
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();
    const result: Record<string, number> = {};
    for (const s of Object.values(CustomerOrderStatus)) result[s] = 0;
    for (const r of rows) result[r.status] = parseInt(r.count);
    return result;
  }

  async getUserGrowth(startDate?: string, endDate?: string) {
    const qb = this.users
      .createQueryBuilder('user')
      .select("DATE_TRUNC('day', user.createdAt)", 'date')
      .addSelect('COUNT(user.id)', 'newUsers')
      .groupBy("DATE_TRUNC('day', user.createdAt)")
      .orderBy("DATE_TRUNC('day', user.createdAt)", 'ASC');
    if (startDate) qb.andWhere('user.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('user.createdAt <= :endDate', { endDate });
    const rows = await qb.getRawMany<{ date: string; newUsers: string }>();
    return {
      totalUsers: await this.users.count(),
      newUsersInRange: rows.reduce((s, r) => s + parseInt(r.newUsers), 0),
      byDay: rows.map((r) => ({ date: r.date, newUsers: parseInt(r.newUsers) })),
    };
  }

  // ─── Platform (super-admin) ──────────────────────────────────────────

  async platformOverview() {
    const gmvRow = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'gmv')
      .addSelect('COUNT(o.id)', 'orders')
      .where('o.status != :c', { c: CustomerOrderStatus.CANCELLED })
      .andWhere(`o.placedAt >= ${DAYS_30}`)
      .getRawOne<{ gmv: string; orders: string }>();

    const commissionRow = await this.vendorOrders
      .createQueryBuilder('vo')
      .select('COALESCE(SUM(vo.commissionAmount), 0)', 'commission')
      .where('vo.status != :c', { c: VendorOrderStatus.CANCELLED })
      .andWhere(`vo.createdAt >= ${DAYS_30}`)
      .getRawOne<{ commission: string }>();

    const orders30 = parseInt(gmvRow?.orders ?? '0');
    const gmv30 = round(parseFloat(gmvRow?.gmv ?? '0'));
    return {
      gmv30d: gmv30,
      commission30d: round(parseFloat(commissionRow?.commission ?? '0')),
      orders30d: orders30,
      aov: orders30 ? round(gmv30 / orders30) : 0,
      customers: await this.users.count(),
      vendors: await this.vendors.count({ where: { status: VendorStatus.APPROVED } }),
    };
  }

  gmv(from?: string, to?: string) {
    return this.byDayMoney(this.orders.createQueryBuilder('o'), 'o', 'placedAt', 'grandTotal', {
      cancelled: CustomerOrderStatus.CANCELLED,
      from,
      to,
    });
  }

  commission(from?: string, to?: string) {
    return this.byDayMoney(
      this.vendorOrders.createQueryBuilder('vo'),
      'vo',
      'createdAt',
      'commissionAmount',
      {
        cancelled: VendorOrderStatus.CANCELLED,
        from,
        to,
        extraKey: 'vendorEarnings',
      },
    );
  }

  async topVendors(limit = 10) {
    const rows = await this.vendorOrders
      .createQueryBuilder('vo')
      .select('vo.vendorId', 'vendorId')
      .addSelect('SUM(vo.total)', 'gmv')
      .addSelect('SUM(vo.commissionAmount)', 'commission')
      .addSelect('COUNT(vo.id)', 'orders')
      .leftJoin('stores', 'store', 'store."vendorId" = vo.vendorId')
      .addSelect('store.name', 'storeName')
      .where('vo.status != :c', { c: VendorOrderStatus.CANCELLED })
      .groupBy('vo.vendorId')
      .addGroupBy('store.name')
      .orderBy('SUM(vo.total)', 'DESC')
      .limit(limit)
      .getRawMany<{
        vendorId: string;
        storeName: string;
        gmv: string;
        commission: string;
        orders: string;
      }>();
    return rows.map((r) => ({
      vendorId: parseInt(r.vendorId),
      storeName: r.storeName ?? `Vendor #${r.vendorId}`,
      gmv: round(parseFloat(r.gmv)),
      commission: round(parseFloat(r.commission)),
      orders: parseInt(r.orders),
    }));
  }

  async vendorGrowth(from?: string, to?: string) {
    const qb = this.vendors
      .createQueryBuilder('v')
      .select("DATE_TRUNC('day', v.approvedAt)", 'date')
      .addSelect('COUNT(v.id)', 'count')
      .where('v.approvedAt IS NOT NULL')
      .groupBy("DATE_TRUNC('day', v.approvedAt)")
      .orderBy("DATE_TRUNC('day', v.approvedAt)", 'ASC');
    if (from) qb.andWhere('v.approvedAt >= :from', { from });
    if (to) qb.andWhere('v.approvedAt <= :to', { to });
    const rows = await qb.getRawMany<{ date: string; count: string }>();
    return {
      totalVendors: await this.vendors.count({ where: { status: VendorStatus.APPROVED } }),
      byDay: rows.map((r) => ({ date: r.date, newVendors: parseInt(r.count) })),
    };
  }

  // ─── Vendor-scoped ──────────────────────────────────────────────────

  async vendorOverview(vendorId: number) {
    const revRow = await this.vendorOrders
      .createQueryBuilder('vo')
      .select('COALESCE(SUM(vo.total), 0)', 'revenue')
      .addSelect('COUNT(vo.id)', 'orders')
      .where('vo.vendorId = :vendorId AND vo.status != :c', {
        vendorId,
        c: VendorOrderStatus.CANCELLED,
      })
      .andWhere(`vo.createdAt >= ${DAYS_30}`)
      .getRawOne<{ revenue: string; orders: string }>();

    const pending = await this.vendorOrders.count({
      where: [
        { vendorId, status: VendorOrderStatus.PENDING },
        { vendorId, status: VendorOrderStatus.CONFIRMED },
        { vendorId, status: VendorOrderStatus.PROCESSING },
      ],
    });

    const lowStock = (await this.vendorOrders.manager.query(
      `SELECT COUNT(*)::int AS count FROM products WHERE "vendorId" = $1 AND status = 'active' AND stock <= 5`,
      [vendorId],
    )) as { count: number }[];

    const vendor = await this.vendors.findOneBy({ id: vendorId });
    const orders30 = parseInt(revRow?.orders ?? '0');
    const revenue30 = round(parseFloat(revRow?.revenue ?? '0'));
    return {
      revenue30d: revenue30,
      orders30d: orders30,
      aov: orders30 ? round(revenue30 / orders30) : 0,
      pendingOrders: pending,
      lowStockCount: lowStock?.[0]?.count ?? 0,
      rating: { average: Number(vendor?.ratingAverage ?? 0), count: vendor?.ratingCount ?? 0 },
      balance: Number(vendor?.balance ?? 0),
      pendingBalance: Number(vendor?.pendingBalance ?? 0),
    };
  }

  vendorRevenue(vendorId: number, from?: string, to?: string) {
    return this.byDayMoney(
      this.vendorOrders.createQueryBuilder('vo').where('vo.vendorId = :vendorId', { vendorId }),
      'vo',
      'createdAt',
      'total',
      { cancelled: VendorOrderStatus.CANCELLED, from, to },
    );
  }

  async vendorBestSelling(vendorId: number, limit = 10) {
    const rows = await this.items
      .createQueryBuilder('item')
      .select('item.productId', 'productId')
      .addSelect('item.productTitle', 'productTitle')
      .addSelect('SUM(item.quantity)', 'totalSold')
      .addSelect('SUM(item.lineTotal)', 'totalRevenue')
      .innerJoin('item.vendorOrder', 'vo')
      .where('vo.vendorId = :vendorId AND vo.status != :c', {
        vendorId,
        c: VendorOrderStatus.CANCELLED,
      })
      .groupBy('item.productId')
      .addGroupBy('item.productTitle')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; productTitle: string; totalSold: string; totalRevenue: string }>();
    return rows.map((r) => ({
      productId: parseInt(r.productId),
      productTitle: r.productTitle,
      totalSold: parseInt(r.totalSold),
      totalRevenue: round(parseFloat(r.totalRevenue)),
    }));
  }

  async vendorOrdersByStatus(vendorId: number) {
    const rows = await this.vendorOrders
      .createQueryBuilder('vo')
      .select('vo.status', 'status')
      .addSelect('COUNT(vo.id)', 'count')
      .where('vo.vendorId = :vendorId', { vendorId })
      .groupBy('vo.status')
      .getRawMany<{ status: string; count: string }>();
    const result: Record<string, number> = {};
    for (const s of Object.values(VendorOrderStatus)) result[s] = 0;
    for (const r of rows) result[r.status] = parseInt(r.count);
    return result;
  }

  // ─── helpers ────────────────────────────────────────────────────────

  private async byDayMoney(
    qb: SelectQueryBuilder<CustomerOrder | VendorOrder>,
    alias: string,
    dateField: string,
    moneyField: string,
    opts: { cancelled: string; from?: string; to?: string; extraKey?: string },
  ) {
    qb.select(`DATE_TRUNC('day', ${alias}.${dateField})`, 'date')
      .addSelect(`COALESCE(SUM(${alias}.${moneyField}), 0)`, 'amount')
      .addSelect(`COUNT(${alias}.id)`, 'count')
      .andWhere(`${alias}.status != :cancelled`, { cancelled: opts.cancelled })
      .groupBy(`DATE_TRUNC('day', ${alias}.${dateField})`)
      .orderBy(`DATE_TRUNC('day', ${alias}.${dateField})`, 'ASC');
    if (opts.extraKey) {
      qb.addSelect(`COALESCE(SUM(${alias}.${opts.extraKey}), 0)`, opts.extraKey);
    }
    if (opts.from) qb.andWhere(`${alias}.${dateField} >= :from`, { from: opts.from });
    if (opts.to) qb.andWhere(`${alias}.${dateField} <= :to`, { to: opts.to });

    const rows = await qb.getRawMany<Record<string, string>>();
    const total = round(rows.reduce((s, r) => s + parseFloat(r.amount), 0));
    const totalCount = rows.reduce((s, r) => s + parseInt(r.count), 0);
    const extraTotal = opts.extraKey
      ? round(rows.reduce((s, r) => s + parseFloat(r[opts.extraKey!] ?? '0'), 0))
      : undefined;

    return {
      total,
      totalCount,
      ...(extraTotal !== undefined ? { [`${opts.extraKey}Total`]: extraTotal } : {}),
      byDay: rows.map((r) => ({
        date: r.date,
        amount: round(parseFloat(r.amount)),
        count: parseInt(r.count),
        ...(opts.extraKey ? { [opts.extraKey]: round(parseFloat(r[opts.extraKey] ?? '0')) } : {}),
      })),
    };
  }
}
