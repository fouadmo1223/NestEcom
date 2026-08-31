import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { PushToken } from './entities/push-token.entity';
import { NotificationsService } from './notifications.service';
import { ExpoPushService } from './expo-push.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsController } from './notifications.controller';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushToken]), AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ExpoPushService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
