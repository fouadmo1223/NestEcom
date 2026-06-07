import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString({ message: 'Username must be a string' })
    username?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Invalid email' })
    email?: string;

    @IsOptional()
    @IsString({ message: 'Password must be a string' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password?: string;
}
