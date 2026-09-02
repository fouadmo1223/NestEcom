import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product variants — an optional jsonb array on `products`. Each element:
 * `{ id, name, price, stock, options?, sku? }`. Product-level price/stock
 * remain the default when no variant is chosen.
 */
export class ProductVariants1757300000000 implements MigrationInterface {
  name = 'ProductVariants1757300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "variants" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "variants"`);
  }
}
