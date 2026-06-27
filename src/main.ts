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
  
  // ✅ CORS Configuration - Allow all frontend origins + localhost for development
  const allowed = (process.env.FRONTEND_URLS || 
    'https://emsfrontend-mu.vercel.app,' +
    'https://emsfrontend-9bkghpnwe-blueberry10.vercel.app,' +
    'https://eventmanagementsystem.bishwasghimire.com.np,' +
    'https://bishwasghimire.com.np')
    .split(',')
    .map(url => url.trim());
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without origin (e.g., Postman, curl, mobile apps, same-domain)
      if (!origin) {
        console.log('✅ CORS allowed (no origin - likely non-browser or same-domain)');
        return callback(null, true);
      }
      
      // Check if origin is in whitelist
      if (allowed.some(allowedOrigin => 
        origin === allowedOrigin || 
        origin.startsWith(allowedOrigin) ||
        // Allow any subdomain for development
        (process.env.NODE_ENV !== 'production' && origin.includes('localhost'))
      )) {
        console.log(`✅ CORS allowed: ${origin}`);
        return callback(null, true);
      }
      
      console.log(`❌ CORS blocked: ${origin}`);
      console.log(`📋 Allowed origins:`, allowed);
      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 3600, // Cache preflight requests for 1 hour
  });
  
  // ✅ Global API prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces, not just localhost
  console.log(`🚀 Backend running on http://0.0.0.0:${port}`);
  console.log(`📍 API URL: http://localhost:${port}/api`);
  console.log(`🔗 Allowed origins:`, allowed);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
