# Database migrations & schema management

The schema is now owned by the migrations in [`src/db/migrations`](src/db/migrations).
`synchronize` is **off** in every environment (`DB_SYNC=false`). Never turn it
back on against a shared database.

## Migration set (the baseline)

| Order | File | What it establishes |
|------|------|---------------------|
| 1 | `1756500000000-P1VendorDomain.ts` | `vendors`, `stores`, `vendor_applications`, `audit_logs` |
| 2 | `1756600000000-P2Catalog.ts` | `products.vendorId` / `products.status`, per‑vendor slug uniqueness, `product_images`, `inventory_logs` |
| 3 | `1756700000000-P4Orders.ts` | drops the legacy monolithic `orders`/`order_items`; adds `customer_orders → vendor_orders → order_items`; `coupons.scope` / `coupons.vendorId` |
| 4 | `1756800000000-P5Money.ts` | `ledger_entries`, `payouts` |
| 5 | `1756900000000-P6Notifications.ts` | `notifications`, `push_tokens` |
| 6 | `1757000000000-P7TrustInsight.ts` | review moderation columns + `platform_settings` (seeded singleton row) |
| 7 | `1757100000000-P8Indexes.ts` | performance indexes on the hot order/catalog query paths |

> The legacy e‑commerce tables (`users`, `categories`, `products`, `reviews`,
> `coupons`, `cart_items`, `wishlist_items`, `addresses`, `otps`) are assumed to
> already exist — they are the pre‑marketplace baseline. P4 intentionally drops
> `orders`/`order_items` because there is **no production order history** at
> cut‑over. If that ever changes, add a data‑copy step to P4 before running it.

## First run against an existing database

```bash
cd backend
cp .env.example .env      # then fill in real values; DB_SYNC stays false
npm ci
npm run build
npm run migration:show    # every row should be [ ] (pending)
npm run migration:run     # applies P1 → P8 in order
npm run migration:show    # every row should now be [X]
npm run seed              # OPTIONAL: truncates + loads marketplace sample data
```

`npm run seed` provisions 5 approved vendors + stores, assigns every product a
`vendorId`, and reloads categories/reviews. Run it only on dev / staging, never
on a database with real customer data.

## Everyday workflow

* Changed an entity? Generate a migration, review it, commit it:
  ```bash
  npm run migration:generate -- src/db/migrations/DescribeTheChange
  npm run migration:run
  ```
* Roll back the last migration: `npm run migration:revert`
* CI / deploy: run `npm run migration:run` as a release step **before** the new
  app version starts. Do not rely on `DB_MIGRATIONS_RUN=true` on serverless
  (Vercel) — a cold start racing a long DDL is how you corrupt a schema.

## Known drift

* `products.vendorId` is created **nullable** by P2 (the column is populated by a
  backfill and by every write path, and the entity treats it as required). Tighten
  it with a follow‑up migration once all rows are guaranteed non‑null:
  `ALTER TABLE "products" ALTER COLUMN "vendorId" SET NOT NULL;`
* Index names differ between the hand‑written migrations (`IDX_vendor_orders_vendorId`)
  and what `migration:generate` would emit from the `@Index` decorators
  (hashed names). Harmless; don't "fix" it with a churn migration.

## Deploy checklist (Vercel)

1. `npm run migration:run` against the production `DATABASE_URL` (from a trusted
   machine or a one‑off job — the pooled Neon URL works).
2. Set project env vars: `DB_SYNC=false`, `DB_MIGRATIONS_RUN=false`, the rotated
   `JWT_SECRET` / `JWT_REFRESH_SECRET`, and the rotated third‑party credentials
   (see `SECURITY.md`).
3. Redeploy (push to `main` triggers it if the Git integration is on).
