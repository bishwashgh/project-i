import { IsEmail, IsNumber, IsNumberString, IsOptional, Length, MinLength } from "class-validator";

export class SignInDto {
    @IsEmail()
    email!:string;

    @MinLength(6)
    password!:string;

    @IsOptional()
    @IsNumberString()
    @Length(6,6, {message:'nice catch Code must 6 digits'})
    tfaCode!:string
}
