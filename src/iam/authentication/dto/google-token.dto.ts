import { IsOptional, IsString } from 'class-validator';

export class GoogleTokenDto {
    @IsOptional()
    @IsString()
    credential?: string;

    @IsOptional()
    @IsString()
    accessToken?: string;

    @IsOptional()
    @IsString()
    token?: string;
}