import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

/** Public email verification — used before the user can log in. */
@ApiTags('Auth')
export class VerifyAccountDto {
    @ApiProperty({ example: 'user@example.com', description: 'Account email address' })
    @IsEmail({}, { message: 'Invalid email' })
    email!: string;

    @ApiProperty({ example: '123456', description: '6-digit OTP code' })
    @IsString()
    @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
    code!: string;
}

@ApiTags('Auth')
export class ResendVerificationDto {
    @ApiProperty({ example: 'user@example.com', description: 'Account email address' })
    @IsEmail({}, { message: 'Invalid email' })
    email!: string;
}
