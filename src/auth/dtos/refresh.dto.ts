import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class RefreshDto {
  @ApiProperty({
    description:
      'Refresh token. Web clients omit this (the httpOnly cookie is used); native clients send it here.',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
