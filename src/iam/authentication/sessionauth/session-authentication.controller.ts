// session-authentication.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';
import type { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';
import { promisify } from 'util';
import { Auth } from '../decorators/auth.decorator';
import { SignInDto } from '../dto/sign-in.dto/sign-in.dto';
import { AuthType } from '../enums/auth-type.enum';
import { SessionGuard } from '../guards/session/session.guard';
import { SessionAuthenticationService } from './session-authentication.service';
import type { Request } from 'express';
import type { User } from 'src/users/entities/user.entity';

// Use type augmentation to add Passport methods to Request
declare module 'express-serve-static-core' {
  interface Request {
    logIn(user: any, callback: (err: any) => void): void;
    logIn(user: any, options: any, callback: (err: any) => void): void;
    user?: any;
  }
}

@Auth(AuthType.Bearer)
@Controller('session-authentication')
export class SessionAuthenticationController {
    constructor(
        private readonly sessionAuthService: SessionAuthenticationService,
    ) {}

    @HttpCode(HttpStatus.OK)
    @Post('sign-in')
    async signIn(@Req() request: Request, @Body() signInDto: SignInDto) {
        const user = await this.sessionAuthService.signIn(signInDto);
        
        // Use type assertion to bypass the type checking
        const loginPromise = promisify((request as any).logIn.bind(request));
        await loginPromise(user);
        
        return {
            message: 'Signed in successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            }
        };
    }
    
    @UseGuards(SessionGuard)
    @Get()
    async sayHello(@ActiveUser() user: ActiveUserData) {
        return `Hello, ${user.email}`;
    }
}