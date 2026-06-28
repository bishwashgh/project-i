import { BadRequestException, Injectable, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateBookingDto } from './dto/create-booking.dto';
import { User } from 'src/users/entities/user.entity';
import { Venue } from 'src/venue/entities/venue.entity';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enum/bookingstatus.enum';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';
import { Role } from 'src/users/enums/role.enums';

//Actual Venue Booking logic
@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,

    @InjectRepository(Venue)
    private readonly venuesRepo: Repository<Venue>,
  ) {}

  private computeInclusiveDays(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);

    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      throw new BadRequestException('Invalid startDate/endDate');
    }

    const sUTC = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const eUTC = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());

    if (eUTC < sUTC) throw new BadRequestException('endDate must be >= startDate');

    const diffDays = Math.floor((eUTC - sUTC) / (24 * 60 * 60 * 1000));
    return diffDays + 1; 
  }

  async create(userId: number, dto: CreateBookingDto) {
    const venue = await this.venuesRepo.findOne({ where: { id: dto.venueId as any } });
    if (!venue) throw new NotFoundException('Venue not found');

    const days = this.computeInclusiveDays(dto.startDate, dto.endDate);

    const conflict = await this.bookingsRepo
    .createQueryBuilder('booking')
    .innerJoin('booking.venue', 'venue')
    .where('venue.id = :venueId', { venueId: dto.venueId })
    .andWhere('booking.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
    .andWhere('booking.startDate <= :endDate AND booking.endDate >= :startDate', {
      startDate: dto.startDate,
      endDate: dto.endDate,
    })
    .getOne();

    if (conflict) {
     throw new BadRequestException('Venue is already booked for the selected dates');
    }

    const basePrice = Number((venue as any).basePrice);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      throw new BadRequestException('Venue basePrice is invalid');
    }

    const amount = days * basePrice;

    const booking = this.bookingsRepo.create({
      user: { id: userId } as User,
      venue,
      startDate: dto.startDate,
      endDate: dto.endDate,
      days,
      amount,
      status: BookingStatus.PENDING_PAYMENT,
    });

    return this.bookingsRepo.save(booking);
  }
  async findOneForOwner(bookingId: number, userId: number) {
  const booking = await this.bookingsRepo.findOne({
    where: { id: bookingId, user: { id: userId } },
    relations: { venue: true,user:true }, 
  });

  if (!booking) throw new NotFoundException('Booking not found');
  return {
    id: booking.id,
    startDate: booking.startDate,
    endDate: booking.endDate,
    days: booking.days,
    amount: booking.amount,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,

    venue: booking.venue,

    user: {
      id: booking.user.id,
      name: booking.user.name,
      email: booking.user.email,
    },
  };
}

async findOneAdmin(bookingId: number) {
  const booking = await this.bookingsRepo.findOne({
    where: { id: bookingId },
    relations: { venue: true, user: true }, 
  });

  if (!booking) throw new NotFoundException('Booking not found');

 return {
    id: booking.id,
    startDate: booking.startDate,
    endDate: booking.endDate,
    days: booking.days,
    amount: booking.amount,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,

    venue: booking.venue,

    user: {
      id: booking.user.id,
      name: booking.user.name,
      email: booking.user.email,
    },
  };
}
async findAllForOwner(userId: number) {
    const bookings = await this.bookingsRepo.find({
      where: { user: { id: userId } },
      relations: { venue: true, user: true },
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      days: booking.days,
      amount: booking.amount,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      venue: booking.venue,
      user: {
        id: booking.user.id,
        name: booking.user.name,
        email: booking.user.email,
      },
    }));
  }

  // ✅ ADD THIS METHOD - Get all bookings for admin
  async findAllAdmin() {
    const bookings = await this.bookingsRepo.find({
      relations: { venue: true, user: true },
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      days: booking.days,
      amount: booking.amount,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      venue: booking.venue,
      user: {
        id: booking.user.id,
        name: booking.user.name,
        email: booking.user.email,
      },
    }));
  }
  
}