import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import {
  CustomerOrder,
  CustomerOrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './entities/customer-order.entity';
import { VendorOrder, VendorOrderStatus } from './entities/vendor-order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartItem } from '../cart/cart-item.entity';
import { Address } from '../addresses/address.entity';
import { Product, ProductStatus } from '../products/product.entity';
import { Vendor, VendorStatus } from '../vendors/entities/vendor.entity';
import { Store } from '../vendors/entities/store.entity';
import { InventoryService } from '../products/inventory.service';
import { InventoryReason } from '../products/entities/inventory-log.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CouponsService } from '../coupons/coupons.service';
import { LedgerService } from '../money/ledger.service';
import { MailService } from '../mail/mail.service';
import { NotificationEvent } from '../notifications/notification-events';
import { PlatformSettingsService } from '../platform/platform-settings.service';
import { UserType } from '../users/user.entity';
import { CheckoutDto } from './dtos/checkout.dto';
import { UpdateVendorOrderStatusDto } from './dtos/update-order-status.dto';
import {
  AdminOrdersQueryDto,
  MyOrdersQueryDto,
  VendorOrdersQueryDto,
} from './dtos/orders-query.dto';
import { rollupStatus, canTransition, PRE_SHIPMENT } from './order-status.util';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';
import { AuditService } from '../common/audit/audit.service';

type Actor = { id: number; userType: UserType; email?: string };
const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(CustomerOrder) private readonly orders: Repository<CustomerOrder>,
    @InjectRepository(VendorOrder) private readonly vendorOrders: Repository<VendorOrder>,
    @InjectRepository(CartItem) private readonly carts: Repository<CartItem>,
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(OrderItem) private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Store) private readonly stores: Repository<Store>,
    private readonly inventory: InventoryService,
    private readonly coupons: CouponsService,
    private readonly ledger: LedgerService,
    private readonly mail: MailService,
    private readonly events: EventEmitter2,
    private readonly settings: PlatformSettingsService,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  private get lowStockThreshold(): number {
    return this.settings.current().lowStockThreshold;
  }

  private get defaultCommissionRate(): number {
    const rate = this.settings.current().defaultCommissionRate;
    return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.1;
  }

  // ─── Checkout ─────────────────────────────────────────────────────────

  async checkout(userId: number, userEmail: string, dto: CheckoutDto): Promise<CustomerOrder> {
    if (dto.idempotencyKey) {
      const prior = await this.orders.findOne({
        where: { userId, idempotencyKey: dto.idempotencyKey },
      });
      if (prior) return this.findOneById(prior.id);
    }

    const cartItems = await this.carts.find({
      where: { user: { id: userId } },
      relations: { product: { vendor: true } },
      order: { createdAt: 'ASC' },
    });
    if (!cartItems.length) {
      throw AppError.badRequest('Your cart is empty', ErrorCode.EMPTY_CART);
    }

    for (const ci of cartItems) {
      const p = ci.product;
      if (p.status !== ProductStatus.ACTIVE || p.vendor?.status !== VendorStatus.APPROVED) {
        throw AppError.badRequest(`"${p.title}" is no longer available`, ErrorCode.BAD_REQUEST);
      }
      if (p.stock < ci.quantity) {
        throw AppError.badRequest(
          `Insufficient stock for "${p.title}" (have ${p.stock})`,
          ErrorCode.INSUFFICIENT_STOCK,
        );
      }
    }

    const address = await this.addresses.findOne({
      where: { id: dto.addressId, user: { id: userId } },
    });
    if (!address) throw AppError.notFound('Shipping address not found');

    // Group cart by vendor
    const byVendor = new Map<number, CartItem[]>();
    for (const ci of cartItems) {
      const list = byVendor.get(ci.product.vendorId) ?? [];
      list.push(ci);
      byVendor.set(ci.product.vendorId, list);
    }

    const groupSubtotals = [...byVendor.entries()].map(([vendorId, items]) => ({
      vendorId,
      subtotal: round(items.reduce((s, ci) => s + Number(ci.product.price) * ci.quantity, 0)),
    }));
    const subtotal = round(groupSubtotals.reduce((s, g) => s + g.subtotal, 0));

    let discountTotal = 0;
    let couponCode: string | null = null;
    let couponId: number | null = null;
    const allocationByVendor = new Map<number, number>();
    if (dto.couponCode) {
      const evalResult = await this.coupons.evaluate(dto.couponCode, groupSubtotals);
      discountTotal = evalResult.discountTotal;
      couponCode = evalResult.coupon.code;
      couponId = evalResult.coupon.id;
      for (const a of evalResult.allocations) allocationByVendor.set(a.vendorId, a.amount);
    }

    const rate = this.defaultCommissionRate;
    const settingsNow = this.settings.current();
    const currency = settingsNow.currency;

    // Per-shipment delivery fee: 0 when the marketplace is free-shipping,
    // otherwise the store's own fee, falling back to the platform default.
    const shippingByVendor = new Map<number, number>();
    if (!settingsNow.freeShippingEnabled) {
      const storeRows = await this.stores.find({
        where: { vendorId: In([...byVendor.keys()]) },
      });
      const feeByVendor = new Map(storeRows.map((s) => [s.vendorId, s.shippingFee]));
      for (const vId of byVendor.keys()) {
        const fee = feeByVendor.get(vId);
        shippingByVendor.set(
          vId,
          round(fee != null ? Number(fee) : settingsNow.defaultShippingFee),
        );
      }
    }
    const shippingTotal = round(
      [...shippingByVendor.values()].reduce((s, v) => s + v, 0),
    );
    const grandTotal = round(Math.max(0, subtotal - discountTotal) + shippingTotal);

    const shippingAddress = {
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };

    const vendorEvents: {
      vendorUserId: number;
      vendorOrderId: number;
      itemCount: number;
    }[] = [];
    const lowStockEvents: {
      vendorUserId: number;
      productId: number;
      productTitle: string;
      stock: number;
    }[] = [];

    const savedId = await this.dataSource.transaction(async (tx) => {
      const orderRepo = tx.getRepository(CustomerOrder);
      const vendorOrderRepo = tx.getRepository(VendorOrder);
      const vendorRepo = tx.getRepository(Vendor);

      const order = await orderRepo.save(
        orderRepo.create({
          userId,
          status: CustomerOrderStatus.PENDING,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          discountTotal,
          shippingTotal,
          taxTotal: 0,
          grandTotal,
          currency,
          couponCode,
          shippingAddress,
          notes: dto.notes ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
        }),
      );

      for (const [vendorId, items] of byVendor) {
        const group = groupSubtotals.find((g) => g.vendorId === vendorId)!;
        const vendor = await vendorRepo.findOneBy({ id: vendorId });
        const commissionRate = vendor?.commissionRate ?? rate;
        const discountAllocated = allocationByVendor.get(vendorId) ?? 0;
        const shippingAllocated = shippingByVendor.get(vendorId) ?? 0;
        const merchandiseTotal = round(group.subtotal - discountAllocated);
        // Commission is charged on merchandise only, not on the delivery fee.
        const commissionAmount = round(merchandiseTotal * commissionRate);
        const total = round(merchandiseTotal + shippingAllocated);
        const vendorEarnings = round(merchandiseTotal - commissionAmount + shippingAllocated);

        const savedVendorOrder = await vendorOrderRepo.save(
          vendorOrderRepo.create({
            customerOrderId: order.id,
            vendorId,
            status: VendorOrderStatus.PENDING,
            subtotal: group.subtotal,
            discountAllocated,
            shippingAllocated,
            total,
            commissionRate,
            commissionAmount,
            vendorEarnings,
            items: items.map((ci) => ({
              productId: ci.product.id,
              vendorId,
              productTitle: ci.product.title,
              productImage: ci.product.image,
              unitPrice: Number(ci.product.price),
              quantity: ci.quantity,
              lineTotal: round(Number(ci.product.price) * ci.quantity),
            })) as OrderItem[],
          }),
        );

        for (const ci of items) {
          const remaining = ci.product.stock - ci.quantity;
          await this.inventory.applyChangeWithin(tx, ci.product.id, -ci.quantity, {
            reason: InventoryReason.CHECKOUT,
            note: `Order #${order.id}`,
            actorId: userId,
          });
          if (vendor && remaining <= this.lowStockThreshold) {
            lowStockEvents.push({
              vendorUserId: vendor.userId,
              productId: ci.product.id,
              productTitle: ci.product.title,
              stock: Math.max(0, remaining),
            });
          }
        }

        await vendorRepo.increment({ id: vendorId }, 'pendingBalance', vendorEarnings);
        await vendorRepo.increment({ id: vendorId }, 'totalSales', total);

        if (vendor) {
          vendorEvents.push({
            vendorUserId: vendor.userId,
            vendorOrderId: savedVendorOrder.id,
            itemCount: items.reduce((n, ci) => n + ci.quantity, 0),
          });
        }
      }

      await tx.getRepository(CartItem).delete({ user: { id: userId } });
      return order.id;
    });

    if (couponId) await this.coupons.incrementUsage(couponId);

    const full = await this.findOneById(savedId);
    this.mail.sendCustomerOrderConfirmation(userEmail, full).catch(() => null);

    this.events.emit(NotificationEvent.ORDER_PLACED, {
      userId,
      orderId: full.id,
      total: Number(full.grandTotal),
      currency: full.currency,
      vendorCount: full.vendorOrders.length,
    });
    for (const ev of vendorEvents) {
      this.events.emit(NotificationEvent.VENDOR_ORDER_NEW, {
        ...ev,
        customerOrderId: full.id,
      });
    }
    for (const ev of lowStockEvents) {
      this.events.emit(NotificationEvent.PRODUCT_LOW_STOCK, ev);
    }

    await this.audit.record({
      actorId: userId,
      action: 'order.placed',
      entityType: 'order',
      entityId: full.id,
      metadata: {
        total: Number(full.grandTotal),
        currency: full.currency,
        vendors: full.vendorOrders.length,
        items: full.vendorOrders.reduce((s, vo) => s + (vo.items?.length ?? 0), 0),
      },
    });

    return full;
  }

  // ─── Customer reads ──────────────────────────────────────────────────

  async findMyOrders(userId: number, query: MyOrdersQueryDto) {
    const { page, limit } = this.paginate(query);
    // `find` (not a bare QueryBuilder) so the eager vendorOrders → items
    // relations load — the storefront list needs item / shipment counts.
    const [data, total] = await this.orders.findAndCount({
      where: {
        userId,
        ...(query.status
          ? { status: query.status as CustomerOrderStatus }
          : {}),
      },
      order: { placedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, pagination: this.meta(total, page, limit) };
  }

  async findOneForUser(id: number, actor: Actor): Promise<CustomerOrder> {
    const order = await this.findOneById(id);
    const isAdmin =
      actor.userType === UserType.ADMIN || actor.userType === UserType.SUPER_ADMIN;
    if (!isAdmin && order.userId !== actor.id) {
      throw AppError.forbidden('Access denied');
    }
    return order;
  }

  async cancelOrder(id: number, userId: number): Promise<CustomerOrder> {
    const order = await this.findOneById(id);
    if (order.userId !== userId) throw AppError.forbidden('Access denied');

    const cancellable = order.vendorOrders.every(
      (vo) => vo.status === VendorOrderStatus.PENDING,
    );
    if (!cancellable) {
      throw AppError.badRequest(
        'This order can no longer be cancelled — some items are already being prepared',
        ErrorCode.ORDER_NOT_CANCELLABLE,
      );
    }

    await this.dataSource.transaction(async (tx) => {
      for (const vo of order.vendorOrders) {
        await this.restoreVendorOrderStock(tx, vo, userId, `Order #${order.id} cancelled`);
        await tx
          .getRepository(VendorOrder)
          .update({ id: vo.id }, { status: VendorOrderStatus.CANCELLED });
        await this.reverseVendorBalances(tx, vo);
      }
      await tx
        .getRepository(CustomerOrder)
        .update({ id: order.id }, { status: CustomerOrderStatus.CANCELLED });
    });

    return this.findOneById(id);
  }

  // ─── Vendor fulfilment ───────────────────────────────────────────────

  async listVendorOrders(vendorId: number, query: VendorOrdersQueryDto) {
    const { page, limit } = this.paginate(query);
    const qb = this.vendorOrders
      .createQueryBuilder('vo')
      .leftJoinAndSelect('vo.customerOrder', 'co')
      .where('vo.vendorId = :vendorId', { vendorId })
      .orderBy('vo.createdAt', 'DESC');

    if (query.status) qb.andWhere('vo.status = :status', { status: query.status });
    if (query.from) qb.andWhere('vo.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('vo.createdAt <= :to', { to: query.to });
    if (query.search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('CAST(vo.id AS TEXT) = :s', { s: query.search }).orWhere(
            'EXISTS (SELECT 1 FROM order_items oi WHERE oi."vendorOrderId" = vo.id AND oi."productTitle" ILIKE :like)',
            { like: `%${query.search}%` },
          );
        }),
      );
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // items is a to-many collection — load it separately rather than joining
    // it into the paginated query (join + skip/take fans out rows).
    if (data.length) {
      const items = await this.orderItems.find({
        where: { vendorOrderId: In(data.map((vo) => vo.id)) },
      });
      const byShipment = new Map<number, OrderItem[]>();
      for (const it of items) {
        const list = byShipment.get(it.vendorOrderId) ?? [];
        list.push(it);
        byShipment.set(it.vendorOrderId, list);
      }
      for (const vo of data) vo.items = byShipment.get(vo.id) ?? [];
    }

    return { data, pagination: this.meta(total, page, limit) };
  }

  async getVendorOrder(vendorId: number, id: number): Promise<VendorOrder> {
    const vo = await this.vendorOrders.findOne({
      where: { id, vendorId },
      relations: { customerOrder: true },
    });
    if (!vo) throw AppError.notFound('Order not found');
    return vo;
  }

  async updateVendorOrderStatus(
    vendorId: number,
    id: number,
    dto: UpdateVendorOrderStatusDto,
    actorId?: number,
  ): Promise<VendorOrder> {
    const vo = await this.vendorOrders.findOne({
      where: { id, vendorId },
      relations: { customerOrder: { user: true } },
    });
    if (!vo) throw AppError.notFound('Order not found');

    if (!canTransition(vo.status, dto.status)) {
      throw AppError.badRequest(
        `Cannot move a ${vo.status} order to ${dto.status}`,
        ErrorCode.INVALID_STATUS_TRANSITION,
      );
    }

    vo.status = dto.status;
    if (dto.trackingNumber) vo.trackingNumber = dto.trackingNumber;
    if (dto.carrier) vo.carrier = dto.carrier;
    if (dto.status === VendorOrderStatus.SHIPPED) vo.shippedAt = new Date();
    if (dto.status === VendorOrderStatus.DELIVERED) vo.deliveredAt = new Date();
    await this.vendorOrders.save(vo);

    // COD is collected on delivery: settle this shipment's earnings.
    if (dto.status === VendorOrderStatus.DELIVERED) {
      await this.ledger.settleVendorOrder({
        id: vo.id,
        vendorId: vo.vendorId,
        vendorEarnings: vo.vendorEarnings,
      });
    }

    await this.recomputeRollup(vo.customerOrderId);

    const customerUserId = vo.customerOrder?.user?.id;
    if (dto.status === VendorOrderStatus.SHIPPED) {
      if (vo.customerOrder?.user?.email) {
        this.mail
          .sendVendorOrderShipped(vo.customerOrder.user.email, vo.customerOrder.id, vo)
          .catch(() => null);
      }
      if (customerUserId) {
        this.events.emit(NotificationEvent.VENDOR_ORDER_SHIPPED, {
          userId: customerUserId,
          customerOrderId: vo.customerOrderId,
          vendorOrderId: vo.id,
          trackingNumber: vo.trackingNumber,
        });
      }
    }
    if (dto.status === VendorOrderStatus.DELIVERED && customerUserId) {
      this.events.emit(NotificationEvent.VENDOR_ORDER_DELIVERED, {
        userId: customerUserId,
        customerOrderId: vo.customerOrderId,
        vendorOrderId: vo.id,
      });
    }

    await this.audit.record({
      actorId: actorId ?? null,
      action: 'order.status_changed',
      entityType: 'vendor_order',
      entityId: vo.id,
      metadata: {
        status: dto.status,
        customerOrderId: vo.customerOrderId,
        ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
      },
    });

    return this.getVendorOrder(vendorId, id);
  }

  async cancelVendorOrder(
    vendorId: number,
    id: number,
    reason: string | undefined,
    actorId: number,
  ): Promise<VendorOrder> {
    const vo = await this.vendorOrders.findOne({ where: { id, vendorId } });
    if (!vo) throw AppError.notFound('Order not found');
    if (!PRE_SHIPMENT.includes(vo.status)) {
      throw AppError.badRequest(
        'Only orders that have not shipped can be cancelled',
        ErrorCode.ORDER_NOT_CANCELLABLE,
      );
    }

    await this.dataSource.transaction(async (tx) => {
      await this.restoreVendorOrderStock(tx, vo, actorId, `Vendor order #${vo.id} cancelled`);
      await tx.getRepository(VendorOrder).update(
        { id: vo.id },
        { status: VendorOrderStatus.CANCELLED, cancelReason: reason ?? null },
      );
      await this.reverseVendorBalances(tx, vo);
    });

    await this.recomputeRollup(vo.customerOrderId);
    return this.getVendorOrder(vendorId, id);
  }

  // ─── Admin ───────────────────────────────────────────────────────────

  async findAllAdmin(query: AdminOrdersQueryDto) {
    const { page, limit } = this.paginate(query);
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'u')
      .orderBy('o.placedAt', query.sort === 'oldest' ? 'ASC' : 'DESC');

    if (query.rollupStatus) qb.andWhere('o.status = :rs', { rs: query.rollupStatus });
    if (query.from) qb.andWhere('o.placedAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('o.placedAt <= :to', { to: query.to });
    if (query.vendorId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM vendor_orders vo WHERE vo."customerOrderId" = o.id AND vo."vendorId" = :vid)',
        { vid: Number(query.vendorId) },
      );
    }
    if (query.minTotal) qb.andWhere('o."grandTotal" >= :minTotal', { minTotal: Number(query.minTotal) });
    if (query.maxTotal) qb.andWhere('o."grandTotal" <= :maxTotal', { maxTotal: Number(query.maxTotal) });
    if (query.search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('CAST(o.id AS TEXT) = :s', { s: query.search })
            .orWhere('u.email ILIKE :like', { like: `%${query.search}%` })
            .orWhere('u.username ILIKE :like', { like: `%${query.search}%` });
        }),
      );
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // attach each order's shipments (+ items) — eager relations don't load
    // through the QueryBuilder, and the admin list needs the store count.
    if (data.length) {
      const shipments = await this.vendorOrders.find({
        where: { customerOrderId: In(data.map((o) => o.id)) },
        relations: { items: true },
        order: { id: 'ASC' },
      });
      const byOrder = new Map<number, VendorOrder[]>();
      for (const vo of shipments) {
        const list = byOrder.get(vo.customerOrderId) ?? [];
        list.push(vo);
        byOrder.set(vo.customerOrderId, list);
      }
      for (const o of data) o.vendorOrders = byOrder.get(o.id) ?? [];
    }

    return { data, pagination: this.meta(total, page, limit) };
  }

  // ─── internals ───────────────────────────────────────────────────────

  private async findOneById(id: number): Promise<CustomerOrder> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw AppError.notFound('Order not found');
    return order;
  }

  private async recomputeRollup(customerOrderId: number): Promise<void> {
    const children = await this.vendorOrders.find({ where: { customerOrderId } });
    const rollup = rollupStatus(children.map((c) => c.status));
    const patch: { status: CustomerOrderStatus; paymentStatus?: PaymentStatus } = {
      status: rollup,
    };
    if (rollup === CustomerOrderStatus.FULFILLED) {
      patch.paymentStatus = PaymentStatus.COLLECTED; // COD collected on delivery
    }
    await this.orders.update({ id: customerOrderId }, patch);
  }

  private async restoreVendorOrderStock(
    tx: import('typeorm').EntityManager,
    vo: VendorOrder,
    actorId: number,
    note: string,
  ): Promise<void> {
    const items = vo.items ?? (await tx.getRepository(OrderItem).find({ where: { vendorOrderId: vo.id } }));
    for (const item of items) {
      await this.inventory.applyChangeWithin(tx, item.productId, item.quantity, {
        reason: InventoryReason.CANCEL,
        note,
        actorId,
        allowNegative: true,
      });
    }
  }

  private async reverseVendorBalances(
    tx: import('typeorm').EntityManager,
    vo: VendorOrder,
  ): Promise<void> {
    const vendorRepo = tx.getRepository(Vendor);
    await vendorRepo.decrement({ id: vo.vendorId }, 'pendingBalance', vo.vendorEarnings);
    await vendorRepo.decrement({ id: vo.vendorId }, 'totalSales', vo.total);
  }

  private paginate(q: { page?: string; limit?: string }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));
    return { page, limit };
  }

  private meta(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
