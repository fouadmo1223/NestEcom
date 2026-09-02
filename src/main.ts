import { types as pgTypes } from 'pg';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

// Our `timestamp` columns hold UTC (Neon's session TZ). The pg driver otherwise
// parses `timestamp without time zone` in the Node process's local zone, which
// shifts every value by the server's UTC offset. Force UTC on read.
// 1114 = timestamp without time zone, 1184 = timestamp with time zone.
pgTypes.setTypeParser(1114, (v: string | null) =>
  v === null ? null : new Date(`${v.replace(' ', 'T')}Z`),
);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
