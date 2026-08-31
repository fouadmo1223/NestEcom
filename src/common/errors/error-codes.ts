/**
 * Stable, machine-readable error identifiers returned in every error body as
 * `errorCode`. Frontends switch on these instead of pattern-matching `message`.
 * Add new codes here as features land — never repurpose an existing one.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_BANNED = 'ACCOUNT_BANNED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNPROCESSABLE = 'UNPROCESSABLE',
  INTERNAL = 'INTERNAL',

  // ─── Domain-specific ───────────────────────────────────────────────────────
  VENDOR_NOT_APPROVED = 'VENDOR_NOT_APPROVED',
  VENDOR_ALREADY_EXISTS = 'VENDOR_ALREADY_EXISTS',
  APPLICATION_ALREADY_PENDING = 'APPLICATION_ALREADY_PENDING',
  APPLICATION_ALREADY_REVIEWED = 'APPLICATION_ALREADY_REVIEWED',
  STORE_SLUG_TAKEN = 'STORE_SLUG_TAKEN',
  EMPTY_CART = 'EMPTY_CART',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  ORDER_NOT_CANCELLABLE = 'ORDER_NOT_CANCELLABLE',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
}

/** Marker exception payload so services can attach a specific code. */
export interface CodedErrorBody {
  message: string | string[];
  errorCode: ErrorCode;
  errors?: unknown;
}
