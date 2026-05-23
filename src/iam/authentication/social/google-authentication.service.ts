import { ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthenticationService } from '../authentication.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class GoogleAuthenticationService implements OnModuleInit {
    private oauthClient!:OAuth2Client;

    constructor(
        private readonly configService:ConfigService,
        private readonly authService: AuthenticationService,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ){}

    onModuleInit() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        this.oauthClient = new OAuth2Client(clientId,clientSecret);
    }
    async authenticate(token:string){
        try{
        const loginTicket = await this.oauthClient.verifyIdToken({
            idToken: token,
        });
        const payload = loginTicket.getPayload();
         if (!payload?.email || !payload.sub) {
           throw new UnauthorizedException('Invalid google token');
        }

        const { email ,sub: googleId } = payload;

        const newUser = await this.userRepository.findOneBy({ googleId });
        if(newUser){
            return this.authService.generateTokens(newUser);
        }
    }catch(err: unknown){
        const pgUniqueViolationErrorCode = '23505';
        if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === pgUniqueViolationErrorCode) {
            throw new ConflictException();
        }
        throw new UnauthorizedException();
    }
    }
}
