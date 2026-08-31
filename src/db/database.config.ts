import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createDatabaseOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const nodeEnv = config.get<string>('NODE_ENV');

  // `synchronize` stays on only in local dev until the baseline migration is
  // generated; then set DB_SYNC=false everywhere and rely on migrations.
  const synchronize =
    config.get<string>('DB_SYNC') === 'true' ||
    (config.get<string>('DB_SYNC') !== 'false' && nodeEnv !== 'production');

  const migrationsRun = config.get<string>('DB_MIGRATIONS_RUN') === 'true';

  const shared = {
    autoLoadEntities: true,
    synchronize,
    migrations: ['dist/db/migrations/*.js'],
    migrationsRun,
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
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
    ...shared,
  };
}
