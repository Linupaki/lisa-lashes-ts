import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BufferedLogger } from './health/logger.service';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new BufferedLogger(),
  });

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
