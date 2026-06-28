import { ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthenticationService } from '../authentication.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/users/enums/role.enums'; // ✅ Import the Role enum

@Injectable()
export class GoogleAuthenticationService implements OnModuleInit {
    private oauthClient!: OAuth2Client;

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthenticationService,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    onModuleInit() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        this.oauthClient = new OAuth2Client(clientId, clientSecret);
    }

    async authenticate(token: string) {
        try {
            const loginTicket = await this.oauthClient.verifyIdToken({
                idToken: token,
            });
            const payload = loginTicket.getPayload();
            
            if (!payload?.email || !payload.sub) {
                throw new UnauthorizedException('Invalid google token');
            }

            const { email, sub: googleId, name, picture } = payload;

            // Find user by googleId
            let user = await this.userRepository.findOne({
                where: { googleId }
            });

            // If not found by googleId, try by email
            if (!user) {
                user = await this.userRepository.findOne({
                    where: { email }
                });

                // If user exists by email, update with googleId
                if (user) {
                    user.googleId = googleId;
                    if (name) user.name = name;
                    await this.userRepository.save(user);
                } else {
                    // ✅ Create new user using new User() instead of create()
                    const newUser = new User();
                    newUser.email = email;
                    newUser.googleId = googleId;
                    newUser.name = name || email.split('@')[0];
                    newUser.role = Role.CUSTOMER; // ✅ Use the enum, not string
                    // No password for Google users
                    
                    user = await this.userRepository.save(newUser);
                }
            }

            // Generate tokens
            return this.authService.generateTokens(user);

        } catch (err: unknown) {
            const pgUniqueViolationErrorCode = '23505';
            if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === pgUniqueViolationErrorCode) {
                throw new ConflictException();
            }
            throw new UnauthorizedException();
        }
    }
}