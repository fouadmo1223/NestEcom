import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationEvent } from './notification-events';
import type {
  OrderPlacedPayload,
  PayoutProcessedPayload,
  ProductLowStockPayload,
  ReviewCreatedPayload,
  VendorApplicationReviewedPayload,
  VendorOrderNewPayload,
  VendorOrderStatusPayload,
} from './notification-events';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(NotificationEvent.ORDER_PLACED)
  async onOrderPlaced(p: OrderPlacedPayload) {
    await this.notifications.notify({
      userId: p.userId,
      type: NotificationEvent.ORDER_PLACED,
      title: `Order #${p.orderId} placed`,
      body:
        p.vendorCount > 1
          ? `Your order will arrive in ${p.vendorCount} shipments. Total ${p.currency} ${p.total.toFixed(2)}.`
          : `We've sent your order to the store. Total ${p.currency} ${p.total.toFixed(2)}.`,
      data: { orderId: p.orderId, href: `/orders/${p.orderId}` },
    });
  }

  @OnEvent(NotificationEvent.VENDOR_ORDER_NEW)
  async onVendorOrderNew(p: VendorOrderNewPayload) {
    await this.notifications.notify({
      userId: p.vendorUserId,
      type: NotificationEvent.VENDOR_ORDER_NEW,
      title: 'New order to fulfil',
      body: `Shipment #${p.vendorOrderId} — ${p.itemCount} item(s) from order #${p.customerOrderId}.`,
      data: { vendorOrderId: p.vendorOrderId, href: '/orders' },
    });
  }

  @OnEvent(NotificationEvent.VENDOR_ORDER_SHIPPED)
  async onShipped(p: VendorOrderStatusPayload) {
    await this.notifications.notify({
      userId: p.userId,
      type: NotificationEvent.VENDOR_ORDER_SHIPPED,
      title: 'A shipment is on its way',
      body: p.trackingNumber
        ? `Order #${p.customerOrderId} shipped — tracking ${p.trackingNumber}.`
        : `Part of order #${p.customerOrderId} has shipped.`,
      data: { orderId: p.customerOrderId, href: `/orders/${p.customerOrderId}` },
    });
  }

  @OnEvent(NotificationEvent.VENDOR_ORDER_DELIVERED)
  async onDelivered(p: VendorOrderStatusPayload) {
    await this.notifications.notify({
      userId: p.userId,
      type: NotificationEvent.VENDOR_ORDER_DELIVERED,
      title: 'Delivered',
      body: `A shipment from order #${p.customerOrderId} was delivered.`,
      data: { orderId: p.customerOrderId, href: `/orders/${p.customerOrderId}` },
    });
  }

  @OnEvent(NotificationEvent.VENDOR_APPLICATION_REVIEWED)
  async onApplicationReviewed(p: VendorApplicationReviewedPayload) {
    await this.notifications.notify({
      userId: p.userId,
      type: NotificationEvent.VENDOR_APPLICATION_REVIEWED,
      title: p.approved ? 'Your store is approved 🎉' : 'About your vendor application',
      body: p.approved
        ? `${p.storeName} is live. Open the dashboard to set it up.`
        : `We couldn't approve your application${p.reason ? `: ${p.reason}` : '.'}`,
      data: { href: p.approved ? '/' : '/sell/apply' },
    });
  }

  @OnEvent(NotificationEvent.PAYOUT_PROCESSED)
  async onPayoutProcessed(p: PayoutProcessedPayload) {
    const label: Record<string, string> = {
      approved: 'approved',
      paid: 'paid out',
      rejected: 'rejected',
    };
    await this.notifications.notify({
      userId: p.vendorUserId,
      type: NotificationEvent.PAYOUT_PROCESSED,
      title: `Payout ${label[p.status] ?? p.status}`,
      body: `Your payout request of ${p.amount.toFixed(2)} was ${label[p.status] ?? p.status}.`,
      data: { payoutId: p.payoutId, href: '/payouts' },
    });
  }

  @OnEvent(NotificationEvent.REVIEW_CREATED)
  async onReviewCreated(p: ReviewCreatedPayload) {
    await this.notifications.notify({
      userId: p.vendorUserId,
      type: NotificationEvent.REVIEW_CREATED,
      title: `New ${p.rating}★ review`,
      body: `"${p.productTitle}" received a new review.`,
      data: { productId: p.productId, href: '/products' },
      push: false,
    });
  }

  @OnEvent(NotificationEvent.PRODUCT_LOW_STOCK)
  async onLowStock(p: ProductLowStockPayload) {
    await this.notifications.notify({
      userId: p.vendorUserId,
      type: NotificationEvent.PRODUCT_LOW_STOCK,
      title: 'Low stock',
      body: `"${p.productTitle}" is down to ${p.stock} left.`,
      data: { productId: p.productId, href: '/products' },
    });
  }
}
