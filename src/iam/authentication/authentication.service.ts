import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { HashingService } from '../hashing/hashing.service';
import { SignUpDto } from './dto/sign-up.dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { invalidatedRefreshTokenError, RefreshTokenIdsStorage } from './refresh-token-ids.storage/refresh-token-ids.storage';
import { randomUUID } from 'crypto';
import { error } from 'console';
import { OtpAuthenticationService } from './otp-gooleauthenticator/otp-authentication.service';
import { SignupOtpService } from './signup-otp/signup-otp.service';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
    private readonly otpAuthService:OtpAuthenticationService,
    private readonly signupOtpService: SignupOtpService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
  // 1) if user already exists, stop
  const existing = await this.usersRepository.findOneBy({ email: signUpDto.email });
  if (existing) {
    throw new ConflictException('Email already exists');
  }

  const passwordHash = await this.hashingService.hash(signUpDto.password);

  
  const { id: challengeId } = await this.signupOtpService.createAndSend({
    email: signUpDto.email,
    name: signUpDto.name,
    passwordHash,
  });

  
  return { otpRequired: true, challengeId };
}

async verifySignupOtp(dto: { challengeId: string; otp: string }) {
  const pending = await this.signupOtpService.verifyAndConsume(dto.challengeId, dto.otp);

  const exists = await this.usersRepository.findOneBy({ email: pending.email });
  if (exists) throw new ConflictException('Email already exists');

  const user = new User();
  user.name = pending.name;
  user.email = pending.email;
  user.password = pending.passwordHash;

  await this.usersRepository.save(user);

  return this.generateTokens(user); // auto-login (optional)
}

  async signIn(signInDto: SignInDto) {
    const user = await this.usersRepository.findOneBy({ email: signInDto.email });

    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }

    const isEqual = await this.hashingService.compare(signInDto.password, user.password);

    if (!isEqual) {
      throw new UnauthorizedException('Password does not match');
    }
    if(user.isTfaEnabled){
      if (!signInDto.tfaCode) {
        throw new UnauthorizedException('2FA code is required for this user');
      }

      const isValid = this.otpAuthService.verifyCOde(
        signInDto.tfaCode,
        user.tfaSecret,
      );
      if(!isValid){
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    return await this.generateTokens(user);
  }

   async generateTokens(user: User) {
        const refreshTokenId = randomUUID();
        const [accessToken, refreshToken] = await Promise.all([this.signToken<Partial<ActiveUserData>>(user.id, this.jwtConfiguration.accessTokenTtl, { email: user.email,role: user.role }),
        this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl,{
          refreshTokenId,
        }),
        ]);
        await this.refreshTokenIdsStorage.insert(user.id, refreshTokenId);
        return { accessToken, refreshToken, };
    }

  async refreshTokens(refreshTokenDto: RefreshTokenDto){
    try{
          const { sub,refreshTokenId } = await this.jwtService.verifyAsync<
          Pick<ActiveUserData, 'sub'> & {refreshTokenId: string}
          >(refreshTokenDto.refreshToken,{
            secret:this.jwtConfiguration.secret,
            audience:this.jwtConfiguration.audience,
            issuer:this.jwtConfiguration.issuer,
          });
          const user = await this.usersRepository.findOneByOrFail({
            id:sub,
          });
          const isValid = await this.refreshTokenIdsStorage.validate(
            user.id,
            refreshTokenId,
          );
          if(isValid){
            await this.refreshTokenIdsStorage.invalidate(user.id);
          }else{
            throw new error('Refresh token invalid');
          }
          return this.generateTokens(user);
        }
    catch(err){
      if(err instanceof invalidatedRefreshTokenError){
        throw new UnauthorizedException('Access denied');
      }
        throw new UnauthorizedException();
     }
   }

    private async signToken<T>(userId: number,expiresIn: number,payload?: T) {
        return await this.jwtService.signAsync(
            {
                sub: userId,
                ...payload,
            },
            {
                audience: this.jwtConfiguration.audience,
                issuer: this.jwtConfiguration.issuer,
                secret: this.jwtConfiguration.secret,
                expiresIn,
            },
        );
    }
}