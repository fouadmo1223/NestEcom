import { CustomerOrderStatus } from './entities/customer-order.entity';
import { VENDOR_ORDER_FLOW, VendorOrderStatus } from './entities/vendor-order.entity';

/** Derive the customer-facing roll-up status from the child vendor orders. */
export function rollupStatus(statuses: VendorOrderStatus[]): CustomerOrderStatus {
  if (!statuses.length) return CustomerOrderStatus.PENDING;
  if (statuses.every((s) => s === VendorOrderStatus.CANCELLED)) {
    return CustomerOrderStatus.CANCELLED;
  }
  const active = statuses.filter((s) => s !== VendorOrderStatus.CANCELLED);
  if (active.length && active.every((s) => s === VendorOrderStatus.DELIVERED)) {
    return CustomerOrderStatus.FULFILLED;
  }
  if (
    active.some(
      (s) => s === VendorOrderStatus.DELIVERED || s === VendorOrderStatus.SHIPPED,
    )
  ) {
    return CustomerOrderStatus.PARTIALLY_FULFILLED;
  }
  return CustomerOrderStatus.PENDING;
}

/** A vendor may only advance forward along the flow (cancel is a separate path). */
export function canTransition(
  from: VendorOrderStatus,
  to: VendorOrderStatus,
): boolean {
  if (to === VendorOrderStatus.CANCELLED) return false; // use the cancel endpoint
  const fromIdx = VENDOR_ORDER_FLOW.indexOf(from);
  const toIdx = VENDOR_ORDER_FLOW.indexOf(to);
  return fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx;
}

export const PRE_SHIPMENT: VendorOrderStatus[] = [
  VendorOrderStatus.PENDING,
  VendorOrderStatus.CONFIRMED,
  VendorOrderStatus.PROCESSING,
];
