import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailtrapClient } from 'mailtrap';

@Injectable()
export class MailService {
  private client: MailtrapClient;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('MAILTRAP_TOKEN');
    if (!token) {
      throw new Error('MAILTRAP_TOKEN is missing in environment variables');
    }
    this.client = new MailtrapClient({ token });
  }

  async sendSignupOtp(toEmail: string, otp: string) {
    const senderEmail = this.config.get<string>('MAILTRAP_SENDER_EMAIL') ?? 'hello@demomailtrap.co';
    const senderName = this.config.get<string>('MAILTRAP_SENDER_NAME') ?? 'My App';

    await this.client.send({
      from: { email: senderEmail, name: senderName },
      to: [{ email: toEmail }],
      subject: 'Verify your email (OTP)',
      text: `Your OTP code is: ${otp}. It expires in 5 minutes.`,
      category: 'Signup OTP',
    });
  }
}