import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * P2 — Catalog.
 * - products: + vendorId (FK vendors), + status; slug uniqueness moves from
 *   global to per-vendor.
 * - new: product_images, inventory_logs.
 * Prereq: P1 (vendors, stores). In local dev with DB_SYNC=true, synchronize
 * applies the equivalent.
 */
export class P2Catalog1756600000000 implements MigrationInterface {
  name = 'P2Catalog1756600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "products_status_enum" AS ENUM('draft','active','archived')`,
    );

    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "vendorId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "status" "products_status_enum" NOT NULL DEFAULT 'active'`,
    );

    // Backfill vendorId from the product's creator, where that user is a vendor.
    await queryRunner.query(`
      UPDATE "products" p
      SET "vendorId" = v."id"
      FROM "vendors" v
      WHERE v."userId" = p."createdById" AND p."vendorId" IS NULL
    `);

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['vendorId'],
        referencedTableName: 'vendors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // slug: drop the old global unique constraint, add per-vendor uniqueness.
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "UQ_464f927ae360106b783ed0b4106"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_slug"`,
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'IDX_products_vendor_slug',
        columnNames: ['vendorId', 'slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_images',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'productId', type: 'int' },
          { name: 'url', type: 'varchar' },
          { name: 'position', type: 'int', default: 0 },
          { name: 'alt', type: 'varchar', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'product_images',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'product_images',
      new TableIndex({ name: 'IDX_product_images_product_position', columnNames: ['productId', 'position'] }),
    );

    await queryRunner.query(
      `CREATE TYPE "inventory_logs_reason_enum" AS ENUM('manual','restock','adjustment','checkout','cancel','initial')`,
    );
    await queryRunner.createTable(
      new Table({
        name: 'inventory_logs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'productId', type: 'int' },
          { name: 'vendorId', type: 'int', isNullable: true },
          { name: 'change', type: 'int' },
          { name: 'resultingStock', type: 'int' },
          { name: 'reason', type: 'inventory_logs_reason_enum', default: `'manual'` },
          { name: 'note', type: 'varchar', isNullable: true },
          { name: 'actorId', type: 'int', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'inventory_logs',
      new TableIndex({ name: 'IDX_inventory_logs_product_createdAt', columnNames: ['productId', 'createdAt'] }),
    );

    // Backfill an "initial" inventory log for products that already hold stock.
    await queryRunner.query(`
      INSERT INTO "inventory_logs" ("productId","vendorId","change","resultingStock","reason")
      SELECT p."id", p."vendorId", p."stock", p."stock", 'initial'
      FROM "products" p WHERE p."stock" > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('inventory_logs', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_logs_reason_enum"`);
    await queryRunner.dropTable('product_images', true);
    await queryRunner.dropIndex('products', 'IDX_products_vendor_slug');
    const table = await queryRunner.getTable('products');
    const fk = table?.foreignKeys.find((f) => f.columnNames.includes('vendorId'));
    if (fk) await queryRunner.dropForeignKey('products', fk);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "vendorId"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_status_enum"`);
  }
}
