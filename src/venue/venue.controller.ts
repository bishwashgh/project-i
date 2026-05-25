import { Controller, Get, Post, Body, Patch, Param, Delete, Req, BadRequestException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { VenueService } from './venue.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';
import type { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';
import { Roles } from 'src/iam/authorization/decorators/roles.decorator';
import { Role } from 'src/users/enums/role.enums';
import { Auth } from 'src/iam/authentication/decorators/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Auth(AuthType.Bearer,AuthType.ApiKey)
@Controller('venue')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}
  
  // @Roles(Role.ADMIN)
  // @Post()
  // @UseInterceptors(
  //   FilesInterceptor('images', 4, {
  //     storage: diskStorage({
  //       destination: './uploads/venues',
  //       filename: (_req, file, cb) => {
  //         const name = randomUUID();
  //         const fileExt = extname(file.originalname);
  //         cb(null, `${name}${fileExt}`);
  //       },
  //     }),
  //     fileFilter: (_req, file, cb) => {
  //       if (!file.mimetype.startsWith('image/')) {
  //         cb(new BadRequestException('Only image files are allowed'), false);
  //       } else {
  //         cb(null, true);
  //       }
  //     },
  //     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  //   }),
  // )
  // async create(@UploadedFiles() files: Express.Multer.File[], @Body() createVenueDto: CreateVenueDto) {
  //   const imagePaths = (files || []).map(f => `/uploads/venues/${f.filename}`);
  //   return this.venueService.create({ ...createVenueDto, images: imagePaths });
  // }

  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 4, {
      storage: diskStorage({
        destination: './uploads/venues',
        filename: (_req, file, cb) => {
          const name = randomUUID();
          const fileExt = extname(file.originalname);
          cb(null, `${name}${fileExt}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(@UploadedFiles() files: Express.Multer.File[], @Body() createVenueDto: CreateVenueDto) {
    const imagePaths = (files || []).map(f => `/uploads/venues/${f.filename}`);
    return this.venueService.create({ ...createVenueDto, images: imagePaths });
  }

  @Get()
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.venueService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.venueService.findOne(+id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVenueDto: UpdateVenueDto) {
    return this.venueService.update(id, updateVenueDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.venueService.remove(+id);
  }
}
