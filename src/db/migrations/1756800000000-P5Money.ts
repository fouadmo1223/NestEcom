import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * P5 — Money: vendor ledger + payouts.
 * In local dev with DB_SYNC=true, synchronize applies the equivalent.
 */
export class P5Money1756800000000 implements MigrationInterface {
  name = 'P5Money1756800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "ledger_entries_type_enum" AS ENUM('earning','commission','refund','payout','adjustment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payouts_status_enum" AS ENUM('requested','approved','paid','rejected')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'ledger_entries',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'vendorId', type: 'int' },
          { name: 'vendorOrderId', type: 'int', isNullable: true },
          { name: 'type', type: 'ledger_entries_type_enum' },
          { name: 'amount', type: 'numeric', precision: 12, scale: 2 },
          { name: 'balanceAfter', type: 'numeric', precision: 12, scale: 2 },
          { name: 'note', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'ledger_entries',
      new TableForeignKey({
        columnNames: ['vendorId'],
        referencedTableName: 'vendors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'ledger_entries',
      new TableIndex({ name: 'IDX_ledger_vendor_createdAt', columnNames: ['vendorId', 'createdAt'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'payouts',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'vendorId', type: 'int' },
          { name: 'amount', type: 'numeric', precision: 12, scale: 2 },
          { name: 'status', type: 'payouts_status_enum', default: `'requested'` },
          { name: 'method', type: 'varchar', isNullable: true },
          { name: 'reference', type: 'varchar', isNullable: true },
          { name: 'note', type: 'varchar', isNullable: true },
          { name: 'processedBy', type: 'int', isNullable: true },
          { name: 'processedAt', type: 'timestamp', isNullable: true },
          { name: 'requestedAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'payouts',
      new TableForeignKey({
        columnNames: ['vendorId'],
        referencedTableName: 'vendors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'payouts',
      new TableIndex({ name: 'IDX_payouts_vendor_status', columnNames: ['vendorId', 'status'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payouts', true);
    await queryRunner.dropTable('ledger_entries', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "payouts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_entries_type_enum"`);
  }
}
