import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ){}

  async create(createVenueDto: CreateVenueDto & { images?: string[] }) {
  const venue = this.venueRepository.create(createVenueDto);
  return this.venueRepository.save(venue);
}

  findAll() {
    return this.venueRepository.find();
  }

  async findOne(id: number) {
    const venue = await this.venueRepository.findOne({where:{id}});
    if(!venue){
      throw new NotFoundException(`venue ${id} is not found`);
    }
    return venue;
  }

  async update(id: string, updateVenueDto: UpdateVenueDto) {
    const venue = await this.venueRepository.preload({
      ...updateVenueDto,
      id:+id,
    });
    if(!venue){
      throw new NotFoundException(`venue #${id} not found`);
    }
    return this.venueRepository.save(venue);
  }

  async remove(id: number) {
    const venue = await this.findOne(id);
    return this.venueRepository.remove(venue);
  }
}
