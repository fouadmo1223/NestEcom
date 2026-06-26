import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { LoggerMiddleware } from './utils/middleware/logger.middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export async function configureApp(app: NestExpressApplication): Promise<void> {
  app.useStaticAssets(join(process.cwd(), 'src/uploads/files'), {
    prefix: '/uploads/files',
  });
  app.use(cookieParser());
  app.use(new LoggerMiddleware().use);
  app.use(helmet());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
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
}
