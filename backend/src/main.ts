import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const frontendUrl = config.get<string>('FRONTEND_URL') || (isProduction ? 'https://mint.roboking.in' : 'http://localhost:3001');
  const jwtSecret = config.get<string>('JWT_SECRET');

  if (isProduction && (!jwtSecret || jwtSecret === 'change_this_long_random_secret' || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET must be set to a strong unique value in production.');
  }

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  const allowedOrigins = isProduction
    ? [frontendUrl]
    : Array.from(new Set([frontendUrl, 'http://localhost:3000', 'http://localhost:3001']));
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));

  const port = Number(config.get('PORT') || 5000);
  await app.listen(port);
  console.log(`RoboKing CRM API running on port ${port} with /api prefix`);
}
bootstrap();
