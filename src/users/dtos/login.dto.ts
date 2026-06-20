import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address', required: true })
    @IsEmail({}, { message: 'Invalid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @ApiProperty({ example: 'password123', description: 'User password', required: true })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;
}