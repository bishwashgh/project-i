import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('signup_otp_challenges')
export class SignupOtpChallenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column()
  passwordHash!: string;

  @Column()
  otpHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}