import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Venue } from 'src/venue/entities/venue.entity';
import { IamModule } from 'src/iam/iam.module';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Venue]),
   IamModule],
  controllers: [BookingsController],
  providers: [BookingsService,AccessTokenGuard],
  exports: [BookingsService],
})
export class BookingsModule {}