
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifySignupOtpDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}