import { Controller, Get, Patch, Param, Delete, ForbiddenException, Req, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './enums/role.enums';
import { Roles } from 'src/iam/authorization/decorators/roles.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { Auth } from 'src/iam/authentication/decorators/auth.decorator';

@Auth(AuthType.Bearer)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: any,
  ) {
    const currentUser = request.user;
    const currentUserId = currentUser.sub || currentUser.id;
    if (currentUserId !== +id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You are not authorized to view other users data.');
    }

    return this.usersService.findOne(+id);
  }

    @Patch(':id')
  update(
  @Param('id') id: string,
  @Body() updateUserDto: UpdateUserDto,
  @Req() request: any,
  ) {
    const currentUser = request.user;
    const currentUserId = currentUser.sub || currentUser.id;

    if (currentUserId !== +id && currentUser.role !== Role.ADMIN) {
    throw new ForbiddenException('You are not authorized to update other users data.');
   }

    if ('role' in updateUserDto && currentUser.role !== Role.ADMIN) {
    throw new ForbiddenException('You are not authorized to change roles.');
   }

     return this.usersService.update(+id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
