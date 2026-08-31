import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * P4 — Split order model.
 * Replaces the single `orders` table with `customer_orders → vendor_orders →
 * order_items`. Adds `scope` / `vendorId` to `coupons`.
 *
 * NOTE: legacy `orders` / `order_items` rows are NOT migrated — there is no
 * production order history at cut-over. If that changes, add a data step here.
 * In local dev with DB_SYNC=true, synchronize applies the equivalent.
 */
export class P4Orders1756700000000 implements MigrationInterface {
  name = 'P4Orders1756700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);

    await queryRunner.query(
      `CREATE TYPE "customer_orders_status_enum" AS ENUM('pending','partially_fulfilled','fulfilled','cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "customer_orders_paymentmethod_enum" AS ENUM('cod')`,
    );
    await queryRunner.query(
      `CREATE TYPE "customer_orders_paymentstatus_enum" AS ENUM('pending','collected','refunded')`,
    );
    await queryRunner.query(
      `CREATE TYPE "vendor_orders_status_enum" AS ENUM('pending','confirmed','processing','shipped','delivered','cancelled')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'customer_orders',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int' },
          { name: 'status', type: 'customer_orders_status_enum', default: `'pending'` },
          { name: 'paymentMethod', type: 'customer_orders_paymentmethod_enum', default: `'cod'` },
          { name: 'paymentStatus', type: 'customer_orders_paymentstatus_enum', default: `'pending'` },
          { name: 'subtotal', type: 'numeric', precision: 12, scale: 2 },
          { name: 'discountTotal', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'shippingTotal', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'taxTotal', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'grandTotal', type: 'numeric', precision: 12, scale: 2 },
          { name: 'currency', type: 'varchar', length: '8', default: `'EGP'` },
          { name: 'couponCode', type: 'varchar', isNullable: true },
          { name: 'shippingAddress', type: 'json' },
          { name: 'notes', type: 'varchar', isNullable: true },
          { name: 'idempotencyKey', type: 'varchar', isNullable: true },
          { name: 'placedAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'customer_orders',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'customer_orders',
      new TableIndex({ name: 'UQ_customer_orders_idempotency', columnNames: ['idempotencyKey'], isUnique: true }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'vendor_orders',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customerOrderId', type: 'int' },
          { name: 'vendorId', type: 'int' },
          { name: 'status', type: 'vendor_orders_status_enum', default: `'pending'` },
          { name: 'subtotal', type: 'numeric', precision: 12, scale: 2 },
          { name: 'discountAllocated', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'shippingAllocated', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'total', type: 'numeric', precision: 12, scale: 2 },
          { name: 'commissionRate', type: 'numeric', precision: 5, scale: 4 },
          { name: 'commissionAmount', type: 'numeric', precision: 12, scale: 2 },
          { name: 'vendorEarnings', type: 'numeric', precision: 12, scale: 2 },
          { name: 'trackingNumber', type: 'varchar', isNullable: true },
          { name: 'carrier', type: 'varchar', isNullable: true },
          { name: 'cancelReason', type: 'varchar', isNullable: true },
          { name: 'shippedAt', type: 'timestamp', isNullable: true },
          { name: 'deliveredAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'vendor_orders',
      new TableForeignKey({
        columnNames: ['customerOrderId'],
        referencedTableName: 'customer_orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'vendor_orders',
      new TableIndex({ name: 'IDX_vendor_orders_vendorId', columnNames: ['vendorId'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'vendorOrderId', type: 'int' },
          { name: 'productId', type: 'int' },
          { name: 'vendorId', type: 'int' },
          { name: 'productTitle', type: 'varchar' },
          { name: 'productImage', type: 'varchar', isNullable: true },
          { name: 'unitPrice', type: 'numeric', precision: 10, scale: 2 },
          { name: 'quantity', type: 'int' },
          { name: 'lineTotal', type: 'numeric', precision: 12, scale: 2 },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['vendorOrderId'],
        referencedTableName: 'vendor_orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.query(
      `CREATE TYPE "coupons_scope_enum" AS ENUM('platform','vendor')`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "scope" "coupons_scope_enum" NOT NULL DEFAULT 'platform'`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "vendorId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN IF EXISTS "vendorId"`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN IF EXISTS "scope"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "coupons_scope_enum"`);

    await queryRunner.dropTable('order_items', true);
    await queryRunner.dropTable('vendor_orders', true);
    await queryRunner.dropTable('customer_orders', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "vendor_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customer_orders_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customer_orders_paymentmethod_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customer_orders_status_enum"`);
  }
}
