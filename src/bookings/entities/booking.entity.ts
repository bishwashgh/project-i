import { User } from 'src/users/entities/user.entity';
import { Venue } from 'src/venue/entities/venue.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../enum/bookingstatus.enum';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @ManyToOne(() => Venue, { nullable: false })
  venue!: Venue;

  @Column({ type: 'date' })
  startDate!: string; 

  @Column({ type: 'date' })
  endDate!: string; 

  @Column({ type: 'int' })
  days!: number;

  @Column({ type: 'numeric' })
  amount!: number;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING_PAYMENT })
  status!: BookingStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

