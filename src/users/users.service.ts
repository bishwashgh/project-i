import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository:Repository<User>,
  ){}

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({where:{id}});
    if(!user){
      throw new NotFoundException(`User id #${id} is not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
  const user = await this.userRepository.preload({
    ...updateUserDto,
    id: +id,
  });

  if (!user) {
    throw new NotFoundException(`User #${id} not found`);
  }

  return this.userRepository.save(user);
}

  async remove(id: number) {
    const user = await this.findOne(id);
    return this.userRepository.remove(user);
  }
}
