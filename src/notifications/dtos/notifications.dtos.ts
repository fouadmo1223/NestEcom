import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PushPlatform } from '../entities/push-token.entity';

export class NotificationsQueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Only unread' })
  @IsOptional()
  @IsString()
  unread?: string;
}

export class RegisterPushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxx]' })
  @IsString()
  @MaxLength(200)
  token!: string;

  @ApiProperty({ enum: PushPlatform })
  @IsEnum(PushPlatform)
  platform!: PushPlatform;
}
