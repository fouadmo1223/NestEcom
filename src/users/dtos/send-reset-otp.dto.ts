import { IsEmail } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class SendResetOtpDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address to send reset OTP to', required: true })
    @IsEmail()
    email!: string;
}