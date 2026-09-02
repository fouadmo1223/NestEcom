import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-shipment delivery fees. `platform_settings.defaultShippingFee` is the
 * marketplace default; `stores.shippingFee` (nullable) overrides it per store.
 * Applied at checkout to each vendor order and rolled into the order total.
 */
export class ShippingFees1757400000000 implements MigrationInterface {
  name = 'ShippingFees1757400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "shippingFee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "defaultShippingFee" numeric(10,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "shippingFee"`);
    await queryRunner.query(
      `ALTER TABLE "platform_settings" DROP COLUMN IF EXISTS "defaultShippingFee"`,
    );
  }
}
