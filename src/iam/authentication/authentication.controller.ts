import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto/sign-in.dto';
import { Auth } from './decorators/auth.decorator';
import { AuthType } from './enums/auth-type.enum';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ActiveUser } from '../decorators/active-user.decorator';
import type { ActiveUserData } from '../interfaces/active-user-data.interface';
import { OtpAuthenticationService } from './otp-gooleauthenticator/otp-authentication.service';
import type { Response } from 'express';
import { toFileStream } from 'qrcode';
import { VerifySignupOtpDto } from './dto/verify-signup-otp.dto';


@Auth(AuthType.None)
@Controller('authentication')
export class AuthenticationController {
    constructor(private readonly authService:AuthenticationService,private readonly otpAuthService:OtpAuthenticationService,){}
    
    @Post('sign-up')
    signUp(@Body() signUpDto:SignUpDto){
        return this.authService.signUp(signUpDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('sign-in')
    async signIn( @Body() signInDto:SignInDto){
        return this.authService.signIn(signInDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh-tokens')
    refreshTokens(@Body() refreshTokenDto: RefreshTokenDto){
        return this.authService.refreshTokens(refreshTokenDto);
    }
  
    @Auth(AuthType.Bearer)
    @HttpCode(HttpStatus.OK)
    @Post('twofactor')
    async generateQrCode(
    @ActiveUser() activeUser: ActiveUserData,
    @Res() response: Response,
   ){
    const { secret, uri} = await this.otpAuthService.generateSecret(
        activeUser.email,
    );
    await this.otpAuthService.enableTfaForUser(activeUser.email, secret);
    response.type('png');
    return toFileStream(response, uri);
   }
   @HttpCode(HttpStatus.OK)
   @Post('sign-up/verify')
   verifySignUpOtp(@Body() dto: VerifySignupOtpDto) {
      return this.authService.verifySignupOtp(dto);
   }
}
