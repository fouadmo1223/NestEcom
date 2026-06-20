import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class RegisterDto {
    @ApiProperty({ example: 'johndoe', description: 'User username', required: true })
    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    username!: string;

    @ApiProperty({ example: 'user@example.com', description: 'User email address', required: true })
    @IsEmail({}, { message: 'Invalid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @ApiProperty({ example: 'password123', description: 'User password (minimum 6 characters)', required: true })
    @IsString({ message: 'Password must be a string' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password!: string;
}