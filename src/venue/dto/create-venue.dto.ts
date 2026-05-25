import { PrimaryGeneratedColumn, Column } from "typeorm";
import { VenueType } from "../entities/venue.entity";
import { IsEmail, IsInt, IsNumber, IsOptional, IsPhoneNumber, IsString, Matches, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateVenueDto {
    
        @IsString()
        name!:string;
    
        @Column({type:'enum',enum:VenueType,default:VenueType.CONFERENCE_HALL})
        type!:VenueType;
    
        @Type(() => Number)
        @IsInt()
        @Min(1)
        capacity!:number;
    
        @IsOptional()
        @IsString()
        description!:string
    
        
        @IsEmail()
        email!:string;
    
        
        @IsPhoneNumber('NP')
        phone!:string;
    
        @IsString()
        address!:string;

        @Type(() => Number)
        @IsInt()
        @Min(0)
        basePrice!: number;

        @IsOptional()
        @Type(() => Array)
        @IsString({ each: true })
        images?: string[];
}
