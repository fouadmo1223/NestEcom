import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createDatabaseOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const synchronize = config.get<string>('NODE_ENV') !== 'production';

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      autoLoadEntities: true,
      synchronize,
    };
  }

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
    autoLoadEntities: true,
    synchronize,
  };
}
