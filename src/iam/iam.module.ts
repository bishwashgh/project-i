import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { AuthenticationService } from './authentication/authentication.service';
import { AuthenticationController } from './authentication/authentication.controller';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard';
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage/refresh-token-ids.storage';
import { RolesGuard } from './authorization/guards/roles/roles.guard';
import { ApiKey } from 'src/users/api-keys/entities/api-key.entity/api-key.entity';
import { ApiKeyGuard } from './authentication/guards/api-key/api-key.guard';
import { GoogleAuthenticationService } from './authentication/social/google-authentication.service';
import { GoogleAuthenticationController } from './authentication/social/google-authentication.controller';
import { OtpAuthenticationService } from './authentication/otp-gooleauthenticator/otp-authentication.service';
import passport from 'passport';
import session from 'express-session';
import { UserSerializer } from './authentication/serializers/user-serializer/user-serializer';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { createClient } from 'redis';
import { SignupOtpChallenge } from './authentication/entity/signup-otp.entity';
import { MailModule } from './authentication/otpmail/mail.module';
import { SignupOtpService } from './authentication/signup-otp/signup-otp.service';
import { ApiKeysService } from './authentication/userapi/api-keys.service';
import { SessionAuthenticationService } from './authentication/sessionauth/session-authentication.service';
import { SessionAuthenticationController } from './authentication/sessionauth/session-authentication.controller';



@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User,ApiKey,SignupOtpChallenge]),
    ConfigModule.forFeature(jwtConfig), 
    JwtModule.registerAsync(jwtConfig.asProvider()), 
    MailModule,
  ],
  providers: [
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    {
      provide:APP_GUARD,
      useClass:AuthenticationGuard,
    },{
      provide:APP_GUARD,
      useClass:RolesGuard,
    },
    AccessTokenGuard,
    ApiKeyGuard,
    RefreshTokenIdsStorage,
    AuthenticationService,
    ApiKeysService,
    GoogleAuthenticationService,
    OtpAuthenticationService,
    SessionAuthenticationService,
    UserSerializer,
    SignupOtpService,
  ],
  controllers: [AuthenticationController, GoogleAuthenticationController, SessionAuthenticationController],
  exports:[AccessTokenGuard,JwtModule, ConfigModule],
})
export class IamModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(console.error);
    consumer
     .apply(
       session({
        store: new (RedisStore as any)({
          client: redisClient,
          prefix: 'ems:',
        }),
        secret:process.env.SESSION_SECRET!,
        resave: false,
        saveUninitialized: true,
        cookie: {
          sameSite:true,
          httpOnly:true,
        },
      }),
      passport.initialize(),
      passport.session(),
     )
     .forRoutes('*');
  }
}
