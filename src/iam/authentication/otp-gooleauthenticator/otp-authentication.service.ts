import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

// Import the specific v13 functions directly
import { generateSecret, generateURI, verifySync } from 'otplib';

@Injectable()
export class OtpAuthenticationService {
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    async generateSecret(email: string) {
        
        const secret = generateSecret();
        const appName = this.configService.getOrThrow('TFA_APP_NAME');
        
        
        const uri = generateURI({
            issuer: appName,
            label: email,
            secret,
        });

        return {
            uri, secret,
        };
    }

        verifyCOde(code: string, secret: string) {
        // authenticator.verify is replaced by verifySync or the async verify()
        const result = verifySync({
            token: code,
            secret: secret,
        });
        
        return result.valid; // <-- Return the boolean valid property
    }

    async enableTfaForUser(email: string, secret: string) {
        const { id } = await this.userRepository.findOneOrFail({
            where: { email },
            select: { id: true },
        });
        await this.userRepository.update(
            { id },
            { tfaSecret: secret, isTfaEnabled: true },
        );
    }
}