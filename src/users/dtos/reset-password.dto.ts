import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class ResetPasswordDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address', required: true })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: '123456', description: '6-digit OTP code', minLength: 6, maxLength: 6, required: true })
    @IsString()
    @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
    code!: string;

    @ApiProperty({ example: 'newpassword123', description: 'New user password (minimum 6 characters)', required: true })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    newPassword!: string;
}