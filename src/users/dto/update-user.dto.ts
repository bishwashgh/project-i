import { Column,PrimaryGeneratedColumn } from 'typeorm';

export class UpdateUserDto {
    @PrimaryGeneratedColumn()
    id!: number;
    
    @Column()
    name!: string;
    
    @Column({ unique: true })
    email!: string;
    
    @Column({ nullable: true})
    password!: string;
    
}
