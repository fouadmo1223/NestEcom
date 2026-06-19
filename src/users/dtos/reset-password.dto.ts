import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @IsEmail()
    email!: string;

    @IsString()
    @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
    code!: string;

    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    newPassword!: string;
}
