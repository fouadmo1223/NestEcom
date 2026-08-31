import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * P1 — Vendor domain.
 * Adds: vendors, stores, vendor_applications, audit_logs.
 * Prerequisite: the baseline migration (existing e-commerce schema) has run.
 * In local dev with DB_SYNC=true these tables are created by synchronize instead.
 */
export class P1VendorDomain1756500000000 implements MigrationInterface {
  name = 'P1VendorDomain1756500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "vendors_status_enum" AS ENUM('pending','approved','rejected','suspended')`,
    );
    await queryRunner.query(
      `CREATE TYPE "vendor_applications_status_enum" AS ENUM('pending','approved','rejected')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'vendors',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int', isUnique: true },
          { name: 'status', type: 'vendors_status_enum', default: `'pending'` },
          { name: 'commissionRate', type: 'numeric', precision: 5, scale: 4, isNullable: true },
          { name: 'ratingAverage', type: 'numeric', precision: 3, scale: 2, default: 0 },
          { name: 'ratingCount', type: 'int', default: 0 },
          { name: 'totalSales', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'balance', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'pendingBalance', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'approvedAt', type: 'timestamp', isNullable: true },
          { name: 'approvedBy', type: 'int', isNullable: true },
          { name: 'rejectionReason', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'vendors',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'stores',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'vendorId', type: 'int', isUnique: true },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'slug', type: 'varchar', isUnique: true },
          { name: 'logo', type: 'varchar', isNullable: true },
          { name: 'coverImage', type: 'varchar', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'supportEmail', type: 'varchar', isNullable: true },
          { name: 'supportPhone', type: 'varchar', isNullable: true },
          { name: 'originAddress', type: 'json', isNullable: true },
          { name: 'policies', type: 'json', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'stores',
      new TableForeignKey({
        columnNames: ['vendorId'],
        referencedTableName: 'vendors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'vendor_applications',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int' },
          { name: 'proposedStoreName', type: 'varchar', length: '120' },
          { name: 'contactPhone', type: 'varchar' },
          { name: 'contactEmail', type: 'varchar', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'documents', type: 'json', default: `'[]'` },
          { name: 'status', type: 'vendor_applications_status_enum', default: `'pending'` },
          { name: 'reviewedBy', type: 'int', isNullable: true },
          { name: 'reviewNote', type: 'varchar', isNullable: true },
          { name: 'reviewedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'vendor_applications',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'vendor_applications',
      new TableIndex({ name: 'IDX_vendor_applications_status', columnNames: ['status'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'actorId', type: 'int', isNullable: true },
          { name: 'action', type: 'varchar' },
          { name: 'entityType', type: 'varchar' },
          { name: 'entityId', type: 'varchar', isNullable: true },
          { name: 'metadata', type: 'json', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndices('audit_logs', [
      new TableIndex({ name: 'IDX_audit_logs_action', columnNames: ['action'] }),
      new TableIndex({ name: 'IDX_audit_logs_entityType', columnNames: ['entityType'] }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs', true);
    await queryRunner.dropTable('vendor_applications', true);
    await queryRunner.dropTable('stores', true);
    await queryRunner.dropTable('vendors', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "vendor_applications_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vendors_status_enum"`);
  }
}
