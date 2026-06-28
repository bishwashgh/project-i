import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ CRITICAL: Enable CORS FIRST, before any other middleware
  const allowedOrigins = (process.env.FRONTEND_URLS || 
    'http://localhost:5173,' +
    'http://localhost:3000,' +
    'https://emsfrontend-mu.vercel.app,' +
    'https://emsfrontend-9bkghpnwe-blueberry10.vercel.app,' +
    'https://eventmanagementsystem.bishwasghimire.com.np,' +
    'https://bishwasghimire.com.np,' +
    'https://ems.bishwasghimire.com.np,' +
    'https://www.ems.bishwasghimire.com.np')
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0);
  
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      
      const isAllowed = allowedOrigins.some(allowed => 
        origin === allowed ||
        (process.env.NODE_ENV !== 'production' && origin.includes('localhost'))
      );
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      console.error(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
  });

  // Handle preflight requests globally
  // app.options('*');
  
  // Serve static files
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  // Global API prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log('\n🚀 ================================');
  console.log(`✅ Backend running on port ${port}`);
  console.log('🚀 ================================');
  console.log(`📍 Dev: http://localhost:${port}/api`);
  console.log(`📍 Prod: https://www.ems.bishwasghimire.com.np/api`);
  console.log(`🔗 Allowed CORS origins:`);
  allowedOrigins.forEach(origin => console.log(`   ✓ ${origin}`));
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 ================================\n');
}
bootstrap();
