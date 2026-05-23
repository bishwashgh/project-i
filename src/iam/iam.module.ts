import { Module } from '@nestjs/common';
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
import { ApiKeysService } from './authentication/api-keys.service';
import { ApiKey } from 'src/users/api-keys/entities/api-key.entity/api-key.entity';
import { ApiKeyGuard } from './authentication/guards/api-key/api-key.guard';
import { GoogleAuthenticationService } from './authentication/social/google-authentication.service';
import { GoogleAuthenticationController } from './authentication/social/google-authentication.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User,ApiKey]),
    ConfigModule.forFeature(jwtConfig), 
    
    // 👇 Just spread it directly without wrapping it in an object literal containing custom imports
    JwtModule.registerAsync(jwtConfig.asProvider()), 
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
  ],
  controllers: [AuthenticationController, GoogleAuthenticationController],
})
export class IamModule {}