import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * P7 — Trust & insight: review moderation fields + platform settings.
 * In local dev with DB_SYNC=true, synchronize applies the equivalent.
 */
export class P7TrustInsight1757000000000 implements MigrationInterface {
  name = 'P7TrustInsight1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reviews_status_enum" AS ENUM('published','hidden')`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "isVerifiedPurchase" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "status" "reviews_status_enum" NOT NULL DEFAULT 'published'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "vendorReply" character varying(1000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "vendorRepliedAt" TIMESTAMP`,
    );
    // One review per (user, product). Drop dupes defensively before the index.
    await queryRunner.query(`
      DELETE FROM "reviews" a USING "reviews" b
      WHERE a.id > b.id AND a."userId" = b."userId" AND a."productId" = b."productId"
    `);
    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'UQ_reviews_user_product',
        columnNames: ['userId', 'productId'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_settings',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, default: 1 },
          { name: 'defaultCommissionRate', type: 'numeric', precision: 5, scale: 4, default: 0.1 },
          { name: 'currency', type: 'varchar', length: '8', default: `'EGP'` },
          { name: 'minPayout', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'lowStockThreshold', type: 'int', default: 5 },
          { name: 'reviewRequiresPurchase', type: 'boolean', default: false },
          { name: 'freeShippingEnabled', type: 'boolean', default: true },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.query(
      `INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('platform_settings', true);
    await queryRunner.dropIndex('reviews', 'UQ_reviews_user_product');
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "vendorRepliedAt"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "vendorReply"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "isVerifiedPurchase"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reviews_status_enum"`);
  }
}
