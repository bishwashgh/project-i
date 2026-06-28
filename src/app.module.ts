import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VenueModule } from './venue/venue.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from './iam/iam.module';
import { ConfigModule } from '@nestjs/config';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import * as dotenv from 'dotenv';

dotenv.config();
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = isProduction 
  ? process.env.PROD_DATABASE_URL 
  : process.env.DATABASE_URL;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VenueModule,
    UsersModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl ,
      autoLoadEntities: true,
      synchronize: true,
    }),
    IamModule,
    BookingsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}