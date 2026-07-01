import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function parseCorsOrigins(value: string | undefined): string[] {
  const origins = String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }

  return ['http://localhost:6007', 'http://127.0.0.1:6007'];
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: parseCorsOrigins(process.env.CORS_ALLOWED_ORIGINS),
    credentials: true,
  });

  const uploadDir = process.env.UPLOAD_DIR
    ? process.env.UPLOAD_DIR
    : join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const portValue = process.env.BACKEND_PORT ?? process.env.PORT;
  if (!portValue) {
    throw new Error('BACKEND_PORT is required');
  }
  const port = Number(portValue);
  await app.listen(port);
}

void bootstrap();
