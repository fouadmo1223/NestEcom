# API Documentation

Base URL: `http://localhost:3001`

All protected routes require: `Authorization: Bearer <accessToken>`

---

## Auth

### Register
`POST /auth/register`
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "secret123"
}
```
**Response 201** — user object. A 6-digit OTP is sent to the email.

---

### Login
`POST /auth/login`
```json
{ "email": "john@example.com", "password": "secret123" }
```
**Response 200**
```json
{ "accessToken": "...", "user": { "id": 1, "username": "john", ... } }
```
Refresh token is set as an HTTP-only cookie.

---

### Refresh Token
`POST /auth/refresh` — no body, uses the cookie.
**Response 200** `{ "accessToken": "..." }`

---

### Logout
`POST /auth/logout` — clears the cookie.
**Response 200** `{ "message": "Logged out successfully" }`

---

### Send Email Verification OTP  🔒
`POST /auth/send-verification-otp` — no body.
**Response 200** `{ "message": "Verification OTP sent to your email" }`
> Rate-limited: once every 5 minutes.

---

### Verify Email  🔒
`POST /auth/verify-email`
```json
{ "code": "493821" }
```
**Response 200** `{ "message": "Email verified successfully" }`

---

### Send Password Reset OTP
`POST /auth/send-reset-otp`
```json
{ "email": "john@example.com" }
```
**Response 200** `{ "message": "If an account exists with this email, a reset OTP has been sent" }`

---

### Reset Password
`POST /auth/reset-password`
```json
{
  "email": "john@example.com",
  "code": "382910",
  "newPassword": "newSecret123"
}
```
**Response 200** `{ "message": "Password reset successfully" }`

---

## Users

### Get My Profile  🔒
`GET /users/me`
**Response 200** — user object (no password).

---

### Upload Profile Image  🔒
`PATCH /users/me/profile-image` — `multipart/form-data` with field `image`.
**Response 200** — updated user object.

---

### Get User by ID
`GET /users/:id`
**Response 200** — public user object.

---

### Update User  🔒
`PATCH /users/:id`
```json
{ "username": "newName", "email": "new@example.com", "password": "newPass" }
```
All fields optional. Owner or SUPER_ADMIN only.

---

### Delete User  🔒
`DELETE /users/:id` — Owner or SUPER_ADMIN only.
**Response 200** — deleted user object.

---

### List All Users  🔒 SUPER_ADMIN
`GET /users?page=1&limit=10`
**Response 200**
```json
{
  "data": [...],
  "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

## Products

### List Products  🔒
`GET /products`

Query params:
| Param | Type | Description |
|---|---|---|
| `search` | string | Full-text search in title & description |
| `title` | string | Filter by title (alias for search) |
| `categoryId` | number | Filter by category |
| `minPrice` | number | Min price filter |
| `maxPrice` | number | Max price filter |
| `sortBy` | `price` \| `createdAt` \| `avgRating` | Sort field (default: `createdAt`) |
| `sortOrder` | `ASC` \| `DESC` | Sort direction (default: `DESC`) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response 200**
```json
{
  "data": [{ "id": 1, "title": "...", "price": 29.99, "avgRating": 4.5, "stock": 10, ... }],
  "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

---

### Get Product
`GET /products/:id`
**Response 200** — product with reviews and `avgRating`.

---

### Create Product  🔒 ADMIN / SUPER_ADMIN
`POST /products` — `multipart/form-data`
| Field | Type | Required |
|---|---|---|
| `image` | file | Yes |
| `title` | string | Yes |
| `price` | number | Yes |
| `description` | string | No |
| `categoryId` | number | No |
| `stock` | number | No (default 0) |

---

### Update Product  🔒 ADMIN / SUPER_ADMIN
`PATCH /products/:id` — `multipart/form-data`, all fields optional (same as create).

---

### Delete Product  🔒 ADMIN / SUPER_ADMIN
`DELETE /products/:id`

---

## Categories

### List Categories
`GET /categories?page=1&limit=10`

---

### Get Category
`GET /categories/:id`

---

### Create Category  🔒 ADMIN / SUPER_ADMIN
`POST /categories` — `multipart/form-data`
| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `image` | file | No |

---

### Update Category  🔒 ADMIN / SUPER_ADMIN
`PATCH /categories/:id` — `multipart/form-data`, all fields optional.

---

### Delete Category  🔒 ADMIN / SUPER_ADMIN
`DELETE /categories/:id`

---

## Reviews

### List Reviews
`GET /reviews?page=1&limit=10`

### List Reviews for a Product
`GET /reviews/product/:productId`

### Get Review
`GET /reviews/:id`

### Create Review  🔒
`POST /reviews`
```json
{ "productId": 5, "rating": 4, "comment": "Great product!" }
```
`rating` must be 1–5.

### Update Review  🔒
`PATCH /reviews/:id`
```json
{ "rating": 5, "comment": "Updated comment" }
```

### Delete Review  🔒
`DELETE /reviews/:id`

---

## Cart  🔒

### Get Cart
`GET /cart`
**Response 200**
```json
{
  "items": [{ "id": 1, "product": { ... }, "quantity": 2 }],
  "total": 59.98
}
```

### Add Item to Cart
`POST /cart/items`
```json
{ "productId": 3, "quantity": 2 }
```
If product already in cart, quantity is incremented.

### Update Cart Item Quantity
`PATCH /cart/items/:id`
```json
{ "quantity": 5 }
```

### Remove Cart Item
`DELETE /cart/items/:id`

### Clear Cart
`DELETE /cart`

---

## Wishlist  🔒

### Get Wishlist
`GET /wishlist`
**Response 200**
```json
{ "items": [{ "id": 1, "product": { ... } }], "total": 3 }
```

### Toggle Wishlist Item
`POST /wishlist/toggle/:productId`
**Response 200**
```json
{ "message": "Added to wishlist", "added": true }
```
Call again to remove: `{ "message": "Removed from wishlist", "added": false }`

### Remove Wishlist Item
`DELETE /wishlist/items/:id`

---

## Addresses  🔒

### List My Addresses
`GET /addresses`

### Get Address
`GET /addresses/:id`

### Create Address
`POST /addresses`
```json
{
  "fullName": "John Doe",
  "phone": "+201234567890",
  "street": "123 Main St",
  "city": "Cairo",
  "state": "Cairo",
  "postalCode": "11511",
  "country": "Egypt",
  "isDefault": true
}
```
Setting `isDefault: true` unsets any existing default address.

### Update Address
`PATCH /addresses/:id` — all fields optional.

### Delete Address
`DELETE /addresses/:id`

---

## Coupons  🔒 SUPER_ADMIN only

### List Coupons
`GET /coupons`

### Get Coupon
`GET /coupons/:id`

### Create Coupon
`POST /coupons`
```json
{
  "code": "SAVE20",
  "discountType": "percentage",
  "discountValue": 20,
  "minOrderAmount": 50,
  "maxUses": 100,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "isActive": true
}
```
`discountType`: `"percentage"` or `"fixed"`

### Deactivate Coupon
`PATCH /coupons/:id/deactivate` — no body.

### Delete Coupon
`DELETE /coupons/:id`

---

## Orders  🔒

### Checkout
`POST /orders/checkout`
```json
{
  "addressId": 2,
  "couponCode": "SAVE20",
  "notes": "Please leave at the door"
}
```
`couponCode` and `notes` are optional.

**What happens:**
1. Validates cart is not empty
2. Checks stock for every item
3. Applies coupon discount if provided
4. Creates order with price snapshot
5. Decrements product stock
6. Clears your cart
7. Sends order confirmation email

**Response 201** — full order object:
```json
{
  "id": 12,
  "status": "pending",
  "subtotal": 99.98,
  "discountAmount": 20.00,
  "shippingCost": 0,
  "total": 79.98,
  "couponCode": "SAVE20",
  "shippingAddress": { "fullName": "John Doe", "street": "...", ... },
  "items": [
    { "productId": 3, "productTitle": "...", "unitPrice": 49.99, "quantity": 2, "total": 99.98 }
  ],
  "createdAt": "2026-06-19T..."
}
```

---

### My Orders
`GET /orders/my?page=1&limit=10`

### Get Order by ID
`GET /orders/:id` — owner, ADMIN, or SUPER_ADMIN.

### List All Orders  🔒 ADMIN / SUPER_ADMIN
`GET /orders?page=1&limit=10`

### Update Order Status  🔒 ADMIN / SUPER_ADMIN
`PATCH /orders/:id/status`
```json
{
  "status": "shipped",
  "trackingNumber": "TRK123456789"
}
```
`status` values: `pending` | `confirmed` | `processing` | `shipped` | `delivered` | `cancelled`

> When status changes to `shipped`, a shipping notification email is sent to the customer automatically.

---

## Order Status Flow

```
pending → confirmed → processing → shipped → delivered
                                          ↘
                                        cancelled
```

---

## File Uploads

Static files are served at: `GET /uploads/files/:filename`

Max file size: **5 MB**. Allowed types: `jpg`, `jpeg`, `png`, `gif`, `webp`.

---

## Error Responses

All errors follow this shape:
```json
{
  "statusCode": 400,
  "message": "Email already in use",
  "error": "Bad Request"
}
```

| Code | Meaning |
|---|---|
| 400 | Validation error / bad input |
| 401 | Missing or invalid token |
| 403 | Not authorized to perform action |
| 404 | Resource not found |
| 500 | Server error |
