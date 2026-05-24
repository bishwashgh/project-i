
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SignupOtpChallenge } from '../entity/signup-otp.entity';
import { MailService } from '../otpmail/mail.service';

@Injectable()
export class SignupOtpService {
  constructor(
    @InjectRepository(SignupOtpChallenge)
    private readonly repo: Repository<SignupOtpChallenge>,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private makeOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async createAndSend(params: { email: string; name: string; passwordHash: string }) {
    const otp = this.makeOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const ttlSeconds = Number(this.config.get('SIGNUP_OTP_TTL_SECONDS') ?? 300);

    const challenge = this.repo.create({
      ...params,
      otpHash,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      attempts: 0,
      usedAt: null,
    });

    await this.repo.save(challenge);
    await this.mail.sendSignupOtp(params.email, otp);

    return { id: challenge.id };
  }

  async verifyAndConsume(challengeId: string, otp: string) {
    const maxAttempts = Number(this.config.get('SIGNUP_OTP_MAX_ATTEMPTS') ?? 5);

    const ch = await this.repo.findOneBy({ id: challengeId });
    if (!ch) throw new UnauthorizedException('Invalid or expired OTP');

    if (ch.usedAt) throw new UnauthorizedException('Invalid or expired OTP');
    if (ch.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Invalid or expired OTP');
    if (ch.attempts >= maxAttempts) throw new UnauthorizedException('Too many attempts');

    const ok = await bcrypt.compare(otp, ch.otpHash);
    if (!ok) {
      ch.attempts += 1;
      await this.repo.save(ch);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    ch.usedAt = new Date();
    await this.repo.save(ch);
    return ch;
  }
}