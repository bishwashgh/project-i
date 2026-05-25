import { IsEmail, IsString, IsStrongPassword, MinLength, Validate } from 'class-validator';
import { Match } from './match.decorator';


export class SignUpDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsStrongPassword({ minLength: 10, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
  password!: string;

  @IsString()
  @Validate(Match, ['password'])
  confirmPassword!: string;
}