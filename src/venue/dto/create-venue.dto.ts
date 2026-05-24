import { PrimaryGeneratedColumn, Column } from "typeorm";
import { VenueType } from "../entities/venue.entity";
import { IsEmail, IsNumber, IsPhoneNumber, Matches } from "class-validator";

export class CreateVenueDto {
       @PrimaryGeneratedColumn()
        id!:number;
    
        @Column({type:'varchar',length:150})
        name!:string;
    
        @Column({type:'enum',enum:VenueType,default:VenueType.CONFERENCE_HALL})
        type!:VenueType;
    
        @Column()
        @IsNumber()
        capacity!:number;
    
        @Column({nullable:true})
        description!:string
    
        @Column({nullable:false})
        @IsEmail()
        email!:string;
    
        @Column({nullable:false})
        @IsPhoneNumber('NP')
        phone!:string;
    
        @Column({nullable:false})
        address!:string;

        @Column({ type: 'int', default: 0 })
        basePrice!: number;
}
