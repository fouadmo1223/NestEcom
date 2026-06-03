import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
