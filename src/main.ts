import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Serve static files
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  // ✅ FIX: Correct domain spelling and add all Vercel URLs
  const allowed = (process.env.FRONTEND_URLS || 
    'https://eventmanagementsystem.bishwasghimire.com.np,' +
    'https://eventmanagementsystem.bishwasghimire.com.np.vercel.app,' +
    'https://emsfrontend-9bkghpnwe-blueberry10.vercel.app,' +
    'https://bishwasghimire.com.np')
    .split(',');
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser tools (Postman, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is allowed
      if (allowed.includes(origin)) {
        console.log(`✅ CORS allowed: ${origin}`);
        return callback(null, true);
      }
      
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 204,
  });
  
  // ✅ IMPORTANT: Add API prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📍 API URL: https://ems.bishwasghimire.com.np/api`);
  console.log(`🔗 Allowed origins:`, allowed);
}
bootstrap();
