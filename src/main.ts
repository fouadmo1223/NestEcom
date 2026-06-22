import { NestFactory } from '@nestjs/core';
import { BadRequestException, ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { LoggerInterceptor } from './utils/interceptors/logger.interceptor';
import { LoggerMiddleware } from './utils/middleware/logger.middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'src/uploads/files'), { prefix: '/uploads/files' });
  app.use(cookieParser());
  app.use(new LoggerMiddleware().use);
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
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('My App API')
    .setDescription('E-commerce platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
