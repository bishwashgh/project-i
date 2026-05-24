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
    host: 'postgres.railway.internal',
    port: 5432,
    username: 'postgres',
    password: 'sFOuHDMkVsQiivapQDLcnmxoesjzMIYC',
    database: 'railway',
    autoLoadEntities: true,
    synchronize:false,
  }), IamModule, BookingsModule, PaymentsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
