// src/venue/dto/create-venue.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsInt, Min, IsOptional, IsEmail, Matches } from 'class-validator';
import { VenueType } from '../entities/venue.entity';

export class CreateVenueDto {
  @IsString()
  name!: string;

  @IsString()
  type!: VenueType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEmail()
  email!: string;

  @Matches(/^\+?\d{7,15}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @IsString()
  address!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}