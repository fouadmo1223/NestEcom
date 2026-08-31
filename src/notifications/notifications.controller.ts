import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsQueryDto, RegisterPushTokenDto } from './dtos/notifications.dtos';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { id: number }, @Query() query: NotificationsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    return this.notifications.list(user.id, page, limit, query.unread === 'true');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: { id: number }) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('push-tokens')
  @HttpCode(HttpStatus.OK)
  registerToken(@CurrentUser() user: { id: number }, @Body() dto: RegisterPushTokenDto) {
    return this.notifications.registerToken(user.id, dto.token, dto.platform);
  }

  @Delete('push-tokens/:token')
  @HttpCode(HttpStatus.OK)
  removeToken(@CurrentUser() user: { id: number }, @Param('token') token: string) {
    return this.notifications.removeToken(user.id, token);
  }
}
