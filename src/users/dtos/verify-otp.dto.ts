import { IsString, Length } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class VerifyOtpDto {
    @ApiProperty({ example: '123456', description: '6-digit OTP code', minLength: 6, maxLength: 6, required: true })
    @IsString()
    @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
    code!: string;
}