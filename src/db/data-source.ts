import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

loadEnv();

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate / run / revert).
 * The running app builds its own options in db/database.config.ts — keep the
 * connection settings here in sync with that file.
 */
function buildOptions(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;

  const shared = {
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/db/migrations/*.ts'],
    synchronize: false,
    migrationsTableName: 'typeorm_migrations',
  };

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      ...shared,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...shared,
  };
}

export default new DataSource(buildOptions());
