import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P8 — performance indexes on hot query paths. Idempotent (IF NOT EXISTS).
 * In local dev with DB_SYNC=true, synchronize creates the equivalent from the
 * @Index decorators added to the entities.
 */
export class P8Indexes1757100000000 implements MigrationInterface {
  name = 'P8Indexes1757100000000';

  private readonly indexes: [string, string, string][] = [
    ['IDX_products_status_createdAt', 'products', '("status", "createdAt")'],
    ['IDX_products_vendor_status', 'products', '("vendorId", "status")'],
    ['IDX_reviews_product_status', 'reviews', '("productId", "status")'],
    ['IDX_customer_orders_user_placedAt', 'customer_orders', '("userId", "placedAt")'],
    ['IDX_customer_orders_status_placedAt', 'customer_orders', '("status", "placedAt")'],
    ['IDX_vendor_orders_vendor_status', 'vendor_orders', '("vendorId", "status")'],
    ['IDX_vendor_orders_vendor_createdAt', 'vendor_orders', '("vendorId", "createdAt")'],
    ['IDX_order_items_productId', 'order_items', '("productId")'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, table, cols] of this.indexes) {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" ${cols}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name] of this.indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`);
    }
  }
}
