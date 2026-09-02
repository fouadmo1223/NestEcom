import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bilingual content + a shared variant taxonomy:
 *  - products.titleAr / products.descriptionAr  (Arabic copies, nullable)
 *  - categories.nameAr
 *  - variant_attributes: platform-defined option types (Size, Color…) that
 *    every vendor can pull from when building product variants.
 */
export class BilingualAndVariantAttributes1757600000000
  implements MigrationInterface
{
  name = 'BilingualAndVariantAttributes1757600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "titleAr" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "descriptionAr" varchar(2000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "nameAr" varchar`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "variant_attributes" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar NOT NULL,
        "nameAr" varchar,
        "values" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdById" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "variant_attributes"`);
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "nameAr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "descriptionAr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "titleAr"`,
    );
  }
}
