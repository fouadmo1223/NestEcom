import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CheckoutDto } from './dtos/checkout.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { CartItem } from '../cart/cart-item.entity';
import { Address } from '../addresses/address.entity';
import { Product } from '../products/product.entity';
import { CouponsService } from '../coupons/coupons.service';
import { MailService } from '../mail/mail.service';
import { UserType } from '../users/user.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';

type CurrentUser = { id: number; userType: UserType; email?: string };

const SHIPPING_COST = 0; // flat rate — adjust as needed

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,
        @InjectRepository(CartItem)
        private readonly cartRepo: Repository<CartItem>,
        @InjectRepository(Address)
        private readonly addressRepo: Repository<Address>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        private readonly couponsService: CouponsService,
        private readonly mailService: MailService,
    ) {}

    async checkout(userId: number, userEmail: string, dto: CheckoutDto): Promise<Order> {
        // 1. Load cart
        const cartItems = await this.cartRepo.find({
            where: { user: { id: userId } },
            relations: { product: true },
        });
        if (!cartItems.length) throw new BadRequestException('Your cart is empty');

        // 2. Validate stock
        for (const item of cartItems) {
            if (item.product.stock < item.quantity) {
                throw new BadRequestException(
                    `Insufficient stock for "${item.product.title}". Available: ${item.product.stock}`,
                );
            }
        }

        // 3. Load shipping address
        const address = await this.addressRepo.findOne({
            where: { id: dto.addressId, user: { id: userId } },
        });
        if (!address) throw new NotFoundException('Shipping address not found');

        // 4. Calculate subtotal
        const subtotal = cartItems.reduce(
            (sum, item) => sum + Number(item.product.price) * item.quantity,
            0,
        );

        // 5. Apply coupon
        let discountAmount = 0;
        let couponCode: string | null = null;
        let couponId: number | null = null;
        if (dto.couponCode) {
            const { coupon, discountAmount: disc } = await this.couponsService.validate(dto.couponCode, subtotal);
            discountAmount = disc;
            couponCode = coupon.code;
            couponId = coupon.id;
        }

        const total = Math.max(0, subtotal - discountAmount + SHIPPING_COST);

        // 6. Build order items (price snapshot)
        const orderItems: Partial<OrderItem>[] = cartItems.map((item) => ({
            productId: item.product.id,
            productTitle: item.product.title,
            productImage: item.product.image,
            unitPrice: Number(item.product.price),
            quantity: item.quantity,
            total: Number(item.product.price) * item.quantity,
        }));

        // 7. Snapshot shipping address
        const shippingAddress = {
            fullName: address.fullName,
            phone: address.phone,
            street: address.street,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
        };

        // 8. Save order
        const order = this.orderRepo.create({
            user: { id: userId },
            items: orderItems as OrderItem[],
            subtotal,
            discountAmount,
            shippingCost: SHIPPING_COST,
            total,
            couponCode,
            shippingAddress,
            notes: dto.notes ?? null,
            trackingNumber: null,
        });
        const saved = await this.orderRepo.save(order);

        // 9. Decrement stock
        for (const item of cartItems) {
            await this.productRepo.decrement({ id: item.product.id }, 'stock', item.quantity);
        }

        // 10. Increment coupon usage
        if (couponId) await this.couponsService.incrementUsage(couponId);

        // 11. Clear cart
        await this.cartRepo.delete({ user: { id: userId } });

        // 12. Send confirmation email (non-blocking)
        this.mailService.sendOrderConfirmation(userEmail, saved).catch(() => null);

        return saved;
    }

    async findMyOrders(userId: number, { page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        const [data, total] = await this.orderRepo.findAndCount({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            skip: (p - 1) * l,
            take: l,
        });
        return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
    }

    async findOne(id: number, currentUser: CurrentUser): Promise<Order> {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');
        const isAdmin = currentUser.userType === UserType.SUPER_ADMIN || currentUser.userType === UserType.ADMIN;
        if (!isAdmin && order.user.id !== currentUser.id) throw new ForbiddenException('Access denied');
        return order;
    }

    async findAll({ page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        const [data, total] = await this.orderRepo.findAndCount({
            order: { createdAt: 'DESC' },
            skip: (p - 1) * l,
            take: l,
        });
        return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
    }

    async cancelOrder(id: number, userId: number): Promise<Order> {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.user.id !== userId) throw new ForbiddenException('Access denied');
        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException('Only pending orders can be cancelled');
        }

        // Restore stock for each item
        for (const item of order.items) {
            await this.productRepo.increment({ id: item.productId }, 'stock', item.quantity);
        }

        order.status = OrderStatus.CANCELLED;
        return this.orderRepo.save(order);
    }

    async updateStatus(id: number, dto: UpdateOrderStatusDto, userEmail: string): Promise<Order> {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');

        const wasShipped = order.status !== OrderStatus.SHIPPED && dto.status === OrderStatus.SHIPPED;
        order.status = dto.status;
        if (dto.trackingNumber) order.trackingNumber = dto.trackingNumber;
        const saved = await this.orderRepo.save(order);

        if (wasShipped) {
            this.mailService.sendOrderShipped(userEmail, saved).catch(() => null);
        }

        return saved;
    }
}
