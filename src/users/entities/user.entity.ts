import { Column, Entity, JoinTable, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../enums/role.enums';
import { ApiKey } from '../api-keys/entities/api-key.entity/api-key.entity';
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ nullable: true})
    password!: string;

    @JoinTable()
    @OneToMany((type) => ApiKey,(apiKey)=>apiKey.user)
    apiKeys!:ApiKey[];

    @Column({ enum: Role,default:Role.CUSTOMER})
    role!: Role;

    @Column({nullable: true})
    googleId!: string;

}
