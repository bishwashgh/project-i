import { IsOptional, IsEnum } from 'class-validator';
import { Column,PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../enums/role.enums';

export class UpdateUserDto {
    @PrimaryGeneratedColumn()
    id!: number;
    
    @Column()
    name!: string;
    
    @Column({ unique: true })
    email!: string;
    
    @Column({ nullable: true})
    password!: string;
    
    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}
