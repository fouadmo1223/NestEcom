import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty({ example: 'johndoe', description: 'The updated username of the user', required: false })
    @IsOptional()
    @IsString({ message: 'Username must be a string' })
    username?: string;

    @ApiProperty({ example: 'johndoe@example.com', description: 'The updated email of the user', required: false })
    @IsOptional()
    @IsEmail({}, { message: 'Invalid email' })
    email?: string;

    @ApiProperty({ example: 'new-password', description: 'The updated password of the user', required: false })
    @IsOptional()
    @IsString({ message: 'Password must be a string' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password?: string;
}


export class ChangePasswordDto {
    @ApiProperty({ example: 'current-password', description: 'The current password of the user' })
    @IsString()
    currentPassword!: string;

    @ApiProperty({ example: 'new-strong-password', description: 'The new password for the user' })
    @IsString()
    @MinLength(6, { message: 'New password must be at least 6 characters' })
    newPassword!: string;
}