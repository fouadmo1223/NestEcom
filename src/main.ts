import { NestFactory } from '@nestjs/core';
import { BadRequestException, ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { LoggerInterceptor } from './utils/interceptors/logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'src/uploads/files'), { prefix: '/uploads/files' });
  app.use(cookieParser());
  app.useGlobalInterceptors(new LoggerInterceptor(), new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Validation error',
          errors: errors.map((e) => ({
            key: e.property,
            message: Object.values(e.constraints ?? {}).join(', '),
          })),
        }),
    }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
