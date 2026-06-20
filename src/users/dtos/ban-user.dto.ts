import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
export class BanUserDto {
    @ApiProperty({ example: 'Violation of terms of service', description: 'Reason for banning the user', required: false })
    @IsOptional()
    @IsString()
    reason?: string;
}