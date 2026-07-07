// authentication/social/google-authentication.service.ts
import { ConflictException, Injectable, OnModuleInit, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthenticationService } from '../authentication.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/users/enums/role.enums';
import axios from 'axios';

@Injectable()
export class GoogleAuthenticationService implements OnModuleInit {
    private oauthClient!: OAuth2Client;
    private googleClientId!: string;
    private readonly logger = new Logger(GoogleAuthenticationService.name);
    private readonly googleUserInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    private readonly requestTimeoutMs = 30000;

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthenticationService,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    onModuleInit() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        
        this.logger.log(`Google Client ID: ${clientId ? 'Configured' : 'Missing'}`);
        this.logger.log(`Google Client Secret: ${clientSecret ? ' Configured' : ' Missing'}`);
        
        if (!clientId || !clientSecret) {
            this.logger.error('Google OAuth credentials are missing!');
            throw new Error('Google OAuth credentials are missing');
        }
        
        this.googleClientId = clientId;
        this.oauthClient = new OAuth2Client(clientId, clientSecret);
        this.logger.log(' Google OAuth client initialized successfully');
    }

    async authenticate(token: string) {
        try {
            if (!this.oauthClient || !this.googleClientId) {
                throw new UnauthorizedException('Google authentication is not configured');
            }

            this.logger.log(' Starting Google authentication...');
            const payload = await this.resolveGooglePayload(token);
            
            if (!payload?.email || !payload.sub) {
                this.logger.error(' Invalid Google token payload');
                throw new UnauthorizedException('Invalid google token');
            }

            const { email, sub: googleId, name, picture } = payload;
            this.logger.log(`Google user verified: ${email}`);

            // Find user by googleId
            let user = await this.userRepository.findOne({
                where: { googleId }
            });

            // If not found by googleId, try by email
            if (!user) {
                this.logger.log(`🔍 Checking by email: ${email}`);
                user = await this.userRepository.findOne({
                    where: { email }
                });

                // If user exists by email, update with googleId
                if (user) {
                    this.logger.log(`Updating existing user with googleId`);
                    user.googleId = googleId;
                    if (name) user.name = name;
                    if (picture) user.profilePicture = picture;
                    await this.userRepository.save(user);
                    this.logger.log(`User updated successfully`);
                } else {
                    // Create new user
                    this.logger.log(`Creating new user for: ${email}`);
                    const newUser = new User();
                    newUser.email = email;
                    newUser.googleId = googleId;
                    newUser.name = name || email.split('@')[0];
                    newUser.profilePicture = picture ?? null;
                    newUser.role = Role.CUSTOMER;
                    
                    user = await this.userRepository.save(newUser);
                    this.logger.log(`User created successfully with ID: ${user.id}`);
                }
            }

            // Generate tokens
            this.logger.log(`Generating tokens for user: ${user.id}`);
            const tokens = await this.authService.generateTokens(user);
            this.logger.log(`Tokens generated successfully`);
            
            return tokens;

        } catch (err: unknown) {
            this.logger.error('Google authentication error:', err);
            
            if (err instanceof Error) {
                this.logger.error(`Error message: ${err.message}`);
                this.logger.error(`Error stack: ${err.stack}`);

                if (err instanceof UnauthorizedException) {
                    throw err;
                }

                throw new UnauthorizedException(`Failed to authenticate with Google: ${err.message}`);
            }
            
            const pgUniqueViolationErrorCode = '23505';
            if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === pgUniqueViolationErrorCode) {
                throw new ConflictException('User with this email already exists');
            }
            
            throw new UnauthorizedException('Failed to authenticate with Google');
        }
    }

    private async resolveGooglePayload(token: string) {
        if (token.split('.').length === 3) {
            const loginTicket = await this.withTimeout(
                this.oauthClient.verifyIdToken({
                    idToken: token,
                    audience: this.googleClientId,
                }),
                'Google token verification timed out',
            );

            return loginTicket.getPayload();
        }

        this.logger.log(' Google access token detected, loading profile from Google userinfo endpoint');

        const tokenInfo = await this.withTimeout(
            this.oauthClient.getTokenInfo(token),
            'Google access token verification timed out',
        );

        if (tokenInfo.aud !== this.googleClientId) {
            throw new UnauthorizedException('Google token was issued for a different client');
        }

        const response = await this.withTimeout(
            axios.get<{ email?: string; id?: string; name?: string; picture?: string }>(this.googleUserInfoUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                timeout: this.requestTimeoutMs,
            }),
            'Google profile lookup timed out',
        );

        const profile = response.data;

        return {
            email: profile.email,
            sub: profile.id,
            name: profile.name,
            picture: profile.picture,
        };
    }

    private async withTimeout<T>(promise: Promise<T>, errorMessage: string): Promise<T> {
        let timeoutHandle: NodeJS.Timeout | undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new UnauthorizedException(errorMessage));
            }, this.requestTimeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    }
}