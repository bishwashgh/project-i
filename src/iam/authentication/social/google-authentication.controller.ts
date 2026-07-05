import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { GoogleAuthenticationService } from './google-authentication.service';
import { GoogleTokenDto } from '../dto/google-token.dto';
import { Auth } from '../decorators/auth.decorator';
import { AuthType } from '../enums/auth-type.enum';

@Auth(AuthType.None)
@Controller('authentication/google')
export class GoogleAuthenticationController {
    constructor(
        private readonly googleAuthService: GoogleAuthenticationService,
        
    ){}

    @Post()
    authenticate(@Body() tokenDto: GoogleTokenDto) {
        const token = tokenDto.credential ?? tokenDto.accessToken ?? tokenDto.token;

        if (!token) {
            throw new BadRequestException('Google credential or access token is required');
        }

        return this.googleAuthService.authenticate(token);
    }
}
