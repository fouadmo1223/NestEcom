import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  type NestExpressApplication,
} from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const server = express();
let appPromise: Promise<typeof server> | null = null;

async function bootstrapServer() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );

  configureApp(app);
  await app.init();

  return server;
}

export default async function handler(req: Request, res: Response) {
  if (!appPromise) {
    appPromise = bootstrapServer();
  }

  const app = await appPromise;
  app(req, res);
}
