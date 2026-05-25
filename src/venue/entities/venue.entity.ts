import { IsEmail, isEmpty, IsNumber, Min } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


export enum VenueType{
    CONFERENCE_HALL = 'conferencehall',
    OUTDOOR = 'outdoor',
}

@Entity()
export class Venue {
    @PrimaryGeneratedColumn()
    id!:number;

    @Column({type:'varchar',length:150})
    name!:string;

    @Column({type:'enum',enum:VenueType,default:VenueType.CONFERENCE_HALL})
    type!:VenueType;

    @Column()
    capacity!:number;

    @Column({nullable:true})
    description!:string

    @Column({nullable:false})
    email!:string;

    @Column({nullable:false})
    phone!:string;

    @Column({nullable:false})
    address!:string;

    @Column({ type: 'int', default: 0 })
     basePrice!: number;

    @Column({ type: 'text', array: true, nullable: true })
    images?: string[];
}
