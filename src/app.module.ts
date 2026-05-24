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

@Module({
  imports: [ConfigModule.forRoot(
    {
      isGlobal: true ,
    }
  ),VenueModule, UsersModule,TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'dpg-d887jneq1p3s73br96r0-a',
    port: 5432,
    username: 'ems_db_t3mg_user',
    password: 'nNzmpJbgt2gyu7HOSGKV6QDI91q3y9Go',
    database: 'ems_db_t3mg',
    autoLoadEntities: true,
    synchronize:false,
  }), IamModule, BookingsModule, PaymentsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
