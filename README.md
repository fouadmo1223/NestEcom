# E-Commerce API

A full-featured e-commerce REST API built with **NestJS**, **TypeORM**, and **PostgreSQL**.

## Features

- JWT authentication with refresh tokens (HTTP-only cookie)
- Email verification and password reset via OTP
- Role-based access control (USER / ADMIN / SUPER_ADMIN)
- Products with stock, images, categories, and avg rating
- Full-text search and sort by price / rating / newest
- Cart and Wishlist
- Orders & Checkout with stock validation
- Coupon / discount codes (percentage or fixed)
- User shipping addresses
- Transactional emails (OTP, order confirmed, order shipped)
- File uploads (product images, category images, profile images)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the root:

```env
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=nestjs-app

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your_app_password
```

### 3. Run

```bash
# development (watch mode)
npm run start:dev

# production
npm run start:prod
```

Server starts on **http://localhost:3001**

---

## API Reference

Base URL: `http://localhost:3001`

Protected routes are marked with 🔒 and require:
```
Authorization: Bearer <accessToken>
```

---

## Auth

### Register
```
POST /auth/register
```
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "secret123"
}
```
**Response 201** — user object. A verification OTP is sent to the email automatically.

---

### Login
```
POST /auth/login
```
```json
{ "email": "john@example.com", "password": "secret123" }
```
**Response 200**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": 1, "username": "john", "email": "john@example.com", "isAccountVerified": false }
}
```
Refresh token is set as an HTTP-only cookie.

---

### Refresh Token
```
POST /auth/refresh
```
No body — uses the `refresh_token` cookie.

**Response 200** `{ "accessToken": "eyJ..." }`

---

### Logout
```
POST /auth/logout
```
Clears the refresh token cookie.

**Response 200** `{ "message": "Logged out successfully" }`

---

### Send Email Verification OTP 🔒
```
POST /auth/send-verification-otp
```
No body required. Rate-limited to once every **5 minutes**.

**Response 200** `{ "message": "Verification OTP sent to your email" }`

---

### Verify Email 🔒
```
POST /auth/verify-email
```
```json
{ "code": "493821" }
```
**Response 200** `{ "message": "Email verified successfully" }`

---

### Send Password Reset OTP
```
POST /auth/send-reset-otp
```
```json
{ "email": "john@example.com" }
```
**Response 200** `{ "message": "If an account exists with this email, a reset OTP has been sent" }`

---

### Reset Password
```
POST /auth/reset-password
```
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

### Get My Profile 🔒
```
GET /users/me
```
**Response 200** — user object without password.

---

### Upload Profile Image 🔒
```
PATCH /users/me/profile-image
```
`multipart/form-data` with field `image` (jpg/jpeg/png/gif/webp, max 5MB).

**Response 200** — updated user object.

---

### Get User by ID
```
GET /users/:id
```

---

### Update User 🔒
```
PATCH /users/:id
```
```json
{ "username": "newName", "email": "new@example.com", "password": "newPass" }
```
All fields optional. Owner or SUPER_ADMIN only.

---

### Delete User 🔒
```
DELETE /users/:id
```
Owner or SUPER_ADMIN only.

---

### List All Users 🔒 `SUPER_ADMIN`
```
GET /users?page=1&limit=10
```
**Response 200**
```json
{
  "data": [...],
  "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

## Products

### List Products
```
GET /products
```
Public endpoint — no token required. If a valid token is provided, ADMIN users will only see their own products.

| Query Param | Type | Description |
|---|---|---|
| `search` | string | Search title and description |
| `categoryId` | number | Filter by category |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `sortBy` | `price` \| `createdAt` \| `avgRating` | Sort field (default: `createdAt`) |
| `sortOrder` | `ASC` \| `DESC` | Sort direction (default: `DESC`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Wireless Headphones",
      "price": "49.99",
      "stock": 25,
      "avgRating": 4.3,
      "image": "/uploads/files/...",
      "category": { "id": 2, "name": "Electronics" },
      "reviews": [...]
    }
  ],
  "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

---

### Get Product
```
GET /products/:id
```
Returns product with all reviews and `avgRating`.

---

### Create Product 🔒 `ADMIN / SUPER_ADMIN`
```
POST /products
```
`multipart/form-data`:

| Field | Type | Required |
|---|---|---|
| `image` | file | Yes |
| `title` | string | Yes |
| `price` | number | Yes |
| `description` | string | No |
| `categoryId` | number | No |
| `stock` | number | No (default: 0) |

---

### Update Product 🔒 `ADMIN / SUPER_ADMIN`
```
PATCH /products/:id
```
Same fields as create, all optional. Owner or SUPER_ADMIN only.

---

### Delete Product 🔒 `ADMIN / SUPER_ADMIN`
```
DELETE /products/:id
```

---

## Categories

### List Categories
```
GET /categories?page=1&limit=10
```

---

### Get Category
```
GET /categories/:id
```

---

### Create Category 🔒 `ADMIN / SUPER_ADMIN`
```
POST /categories
```
`multipart/form-data`:

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `image` | file | No |

---

### Update Category 🔒 `ADMIN / SUPER_ADMIN`
```
PATCH /categories/:id
```
Same fields, all optional.

---

### Delete Category 🔒 `ADMIN / SUPER_ADMIN`
```
DELETE /categories/:id
```

---

## Reviews

### List All Reviews
```
GET /reviews?page=1&limit=10
```

### Reviews for a Product
```
GET /reviews/product/:productId
```

### Get Review
```
GET /reviews/:id
```

### Create Review 🔒
```
POST /reviews
```
```json
{ "productId": 5, "rating": 4, "comment": "Great product!" }
```
`rating` must be between 1 and 5.

### Update Review 🔒
```
PATCH /reviews/:id
```
```json
{ "rating": 5, "comment": "Even better than I thought!" }
```
Owner or SUPER_ADMIN only.

### Delete Review 🔒
```
DELETE /reviews/:id
```

---

## Cart 🔒

All cart endpoints require authentication.

### Get Cart
```
GET /cart
```
**Response 200**
```json
{
  "items": [
    { "id": 1, "product": { "id": 3, "title": "...", "price": "29.99" }, "quantity": 2 }
  ],
  "total": 59.98
}
```

---

### Add Item to Cart
```
POST /cart/items
```
```json
{ "productId": 3, "quantity": 2 }
```
If the product is already in the cart, the quantity is **incremented**.

---

### Update Cart Item Quantity
```
PATCH /cart/items/:id
```
```json
{ "quantity": 5 }
```

---

### Remove Cart Item
```
DELETE /cart/items/:id
```

---

### Clear Cart
```
DELETE /cart
```
**Response 200** `{ "message": "Cart cleared" }`

---

## Wishlist 🔒

### Get Wishlist
```
GET /wishlist
```
**Response 200**
```json
{ "items": [{ "id": 1, "product": { ... } }], "total": 3 }
```

---

### Toggle Wishlist Item
```
POST /wishlist/toggle/:productId
```
Adds the product if not in the list, removes it if already there.

**Response 200**
```json
{ "message": "Added to wishlist", "added": true }
```
or
```json
{ "message": "Removed from wishlist", "added": false }
```

---

### Remove Wishlist Item by ID
```
DELETE /wishlist/items/:id
```

---

## Addresses 🔒

### List My Addresses
```
GET /addresses
```

### Get Address
```
GET /addresses/:id
```

### Create Address
```
POST /addresses
```
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
Setting `isDefault: true` automatically unsets any other default address.

### Update Address
```
PATCH /addresses/:id
```
All fields optional.

### Delete Address
```
DELETE /addresses/:id
```

---

## Coupons 🔒 `SUPER_ADMIN`

### List Coupons
```
GET /coupons
```

### Get Coupon
```
GET /coupons/:id
```

### Create Coupon
```
POST /coupons
```
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

| Field | Type | Description |
|---|---|---|
| `code` | string | Unique coupon code (auto-uppercased) |
| `discountType` | `percentage` \| `fixed` | Type of discount |
| `discountValue` | number | Amount or percentage to deduct |
| `minOrderAmount` | number | Optional minimum subtotal required |
| `maxUses` | number | Optional usage limit |
| `expiresAt` | ISO date | Optional expiry date |
| `isActive` | boolean | Default: `true` |

### Deactivate Coupon
```
PATCH /coupons/:id/deactivate
```

### Delete Coupon
```
DELETE /coupons/:id
```

---

## Orders 🔒

### Checkout
```
POST /orders/checkout
```
```json
{
  "addressId": 2,
  "couponCode": "SAVE20",
  "notes": "Leave at the door"
}
```
`couponCode` and `notes` are optional.

**What happens automatically:**
1. Validates cart is not empty
2. Checks stock for every item
3. Validates and applies coupon discount
4. Snapshots prices at time of purchase
5. Creates the order
6. Decrements stock for each product
7. Clears your cart
8. Sends an order confirmation email

**Response 201**
```json
{
  "id": 12,
  "status": "pending",
  "subtotal": 99.98,
  "discountAmount": 20.00,
  "shippingCost": 0,
  "total": 79.98,
  "couponCode": "SAVE20",
  "shippingAddress": {
    "fullName": "John Doe",
    "street": "123 Main St",
    "city": "Cairo",
    "country": "Egypt"
  },
  "items": [
    {
      "productId": 3,
      "productTitle": "Wireless Headphones",
      "unitPrice": "49.99",
      "quantity": 2,
      "total": "99.98"
    }
  ],
  "createdAt": "2026-06-19T14:00:00.000Z"
}
```

---

### My Orders
```
GET /orders/my?page=1&limit=10
```

### Get Order by ID
```
GET /orders/:id
```
Owner, ADMIN, or SUPER_ADMIN only.

### List All Orders 🔒 `ADMIN / SUPER_ADMIN`
```
GET /orders?page=1&limit=10
```

### Update Order Status 🔒 `ADMIN / SUPER_ADMIN`
```
PATCH /orders/:id/status
```
```json
{
  "status": "shipped",
  "trackingNumber": "TRK123456789"
}
```
`trackingNumber` is optional.

**Status values:** `pending` → `confirmed` → `processing` → `shipped` → `delivered` | `cancelled`

> Changing status to `shipped` automatically sends a shipping notification email to the customer.

---

## File Uploads

Static files served at:
```
GET /uploads/files/:filename
```

Limits: max **5 MB**, allowed types: `jpg`, `jpeg`, `png`, `gif`, `webp`.

---

## Error Format

```json
{
  "statusCode": 400,
  "message": "Email already in use",
  "error": "Bad Request"
}
```

| Code | Meaning |
|---|---|
| 400 | Bad input / validation error |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 429 | Rate limit hit (OTP) |
| 500 | Internal server error |

---

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL + TypeORM
- **Auth:** JWT (access + refresh) + bcrypt
- **Email:** Nodemailer (Gmail SMTP)
- **File uploads:** Multer
