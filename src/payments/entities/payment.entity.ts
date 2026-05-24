import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { Booking } from 'src/bookings/entities/booking.entity';
import { User } from 'src/users/entities/user.entity';

export enum PaymentProvider {
  ESEWA = 'esewa',
  KHALTI = 'khalti',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Booking, { nullable: false, onDelete: 'CASCADE', eager: false })
  booking!: Booking;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  user!: User;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider!: PaymentProvider;

  // store the final amount at the time payment was started
  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  /**
   * One field for both providers:
   * - Khalti: store `pidx`
   * - eSewa: store your generated `pid` (recommended) OR store verified `refId`
   */
  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  gatewayRef!: string | null;

  // Optional: store gateway responses for audit/debugging (Postgres)
  @Column({ type: 'jsonb', nullable: true })
  raw!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}