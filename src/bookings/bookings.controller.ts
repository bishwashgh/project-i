import { Controller, Get, Param, ParseIntPipe, Post, Body, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';
import { Role } from 'src/users/enums/role.enums';

@UseGuards(AccessTokenGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@ActiveUser('sub') userId: number, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto);
  }

  @Get(':id')
  async findOne(
    @ActiveUser('sub') userId: number,
    @ActiveUser('role') role: Role,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (role === Role.ADMIN) {
      return this.bookingsService.findOneAdmin(id);
    }

    return this.bookingsService.findOneForOwner(id, userId);
  }
}