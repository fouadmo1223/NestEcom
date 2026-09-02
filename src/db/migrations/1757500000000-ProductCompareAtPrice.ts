import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `products.compareAtPrice` — the struck-through "was" price shown when a
 * product is on sale. Nullable; when set and greater than `price` the
 * storefront renders it as a discount.
 */
export class ProductCompareAtPrice1757500000000 implements MigrationInterface {
  name = 'ProductCompareAtPrice1757500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "compareAtPrice" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "compareAtPrice"`,
    );
  }
}
