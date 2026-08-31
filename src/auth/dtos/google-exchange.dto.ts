import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
export class GoogleExchangeDto {
  @ApiProperty({
    description: 'One-time code issued by the Google OAuth callback redirect',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  code!: string;
}
