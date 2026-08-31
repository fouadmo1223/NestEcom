import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * P6 — Engagement: in-app notifications + push tokens.
 * In local dev with DB_SYNC=true, synchronize applies the equivalent.
 */
export class P6Notifications1756900000000 implements MigrationInterface {
  name = 'P6Notifications1756900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int' },
          { name: 'type', type: 'varchar' },
          { name: 'title', type: 'varchar' },
          { name: 'body', type: 'varchar', length: '500' },
          { name: 'data', type: 'json', isNullable: true },
          { name: 'readAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndices('notifications', [
      new TableIndex({ name: 'IDX_notifications_user_read', columnNames: ['userId', 'readAt'] }),
      new TableIndex({ name: 'IDX_notifications_user_created', columnNames: ['userId', 'createdAt'] }),
    ]);

    await queryRunner.query(
      `CREATE TYPE "push_tokens_platform_enum" AS ENUM('ios','android')`,
    );
    await queryRunner.createTable(
      new Table({
        name: 'push_tokens',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int' },
          { name: 'token', type: 'varchar', isUnique: true },
          { name: 'platform', type: 'push_tokens_platform_enum' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'push_tokens',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'push_tokens',
      new TableIndex({ name: 'IDX_push_tokens_userId', columnNames: ['userId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('push_tokens', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "push_tokens_platform_enum"`);
    await queryRunner.dropTable('notifications', true);
  }
}
