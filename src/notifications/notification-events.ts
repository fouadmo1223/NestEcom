/**
 * Domain events consumed by the notification layer. Services emit these via
 * EventEmitter2; NotificationsListener fans them out to in-app + push.
 */
export const NotificationEvent = {
  ORDER_PLACED: 'order.placed',
  VENDOR_ORDER_NEW: 'vendor_order.new',
  VENDOR_ORDER_SHIPPED: 'vendor_order.shipped',
  VENDOR_ORDER_DELIVERED: 'vendor_order.delivered',
  VENDOR_APPLICATION_REVIEWED: 'vendor.application_reviewed',
  PAYOUT_PROCESSED: 'payout.processed',
  REVIEW_CREATED: 'review.created',
  PRODUCT_LOW_STOCK: 'product.low_stock',
} as const;

export interface OrderPlacedPayload {
  userId: number;
  orderId: number;
  total: number;
  currency: string;
  vendorCount: number;
}

export interface VendorOrderNewPayload {
  vendorUserId: number;
  vendorOrderId: number;
  customerOrderId: number;
  itemCount: number;
}

export interface VendorOrderStatusPayload {
  userId: number; // customer
  customerOrderId: number;
  vendorOrderId: number;
  trackingNumber?: string | null;
}

export interface VendorApplicationReviewedPayload {
  userId: number; // applicant
  approved: boolean;
  storeName: string;
  reason?: string | null;
}

export interface PayoutProcessedPayload {
  vendorUserId: number;
  payoutId: number;
  status: string;
  amount: number;
}

export interface ReviewCreatedPayload {
  vendorUserId: number;
  productId: number;
  productTitle: string;
  rating: number;
}

export interface ProductLowStockPayload {
  vendorUserId: number;
  productId: number;
  productTitle: string;
  stock: number;
}
