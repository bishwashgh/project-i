import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ApiKey } from './api-keys/entities/api-key.entity/api-key.entity';
import { IamModule } from 'src/iam/iam.module';

//User module
@Module({
  imports:[TypeOrmModule.forFeature([User,ApiKey]),IamModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
