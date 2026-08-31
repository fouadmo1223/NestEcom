import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PushToken, PushPlatform } from './entities/push-token.entity';
import { ExpoPushService } from './expo-push.service';
import { AppError } from '../common/errors/app-exception';

interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  push?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(PushToken) private readonly pushTokens: Repository<PushToken>,
    private readonly expo: ExpoPushService,
  ) {}

  /** Create an in-app notification and (by default) also send a push. */
  async notify(input: NotifyInput): Promise<Notification> {
    const notification = await this.notifications.save(
      this.notifications.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? null,
      }),
    );

    if (input.push !== false) {
      void this.pushToUser(input.userId, {
        title: input.title,
        body: input.body,
        data: { ...input.data, notificationId: notification.id, type: input.type },
      });
    }
    return notification;
  }

  private async pushToUser(
    userId: number,
    msg: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    const tokens = await this.pushTokens.find({ where: { userId } });
    if (!tokens.length) return;
    const { invalidTokens } = await this.expo.send(
      tokens.map((t) => ({ to: t.token, ...msg })),
    );
    if (invalidTokens.length) {
      await this.pushTokens.delete({ token: In(invalidTokens) });
    }
  }

  // ─── Queries ─────────────────────────────────────────────────────────

  async list(userId: number, page: number, limit: number, unreadOnly: boolean) {
    const where = unreadOnly ? { userId, readAt: IsNull() } : { userId };
    const [data, total] = await this.notifications.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unreadCount = await this.notifications.count({
      where: { userId, readAt: IsNull() },
    });
    return {
      data,
      unreadCount,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markRead(userId: number, id: number): Promise<{ unreadCount: number }> {
    const row = await this.notifications.findOne({ where: { id, userId } });
    if (!row) throw AppError.notFound('Notification not found');
    if (!row.readAt) {
      row.readAt = new Date();
      await this.notifications.save(row);
    }
    return { unreadCount: await this.notifications.count({ where: { userId, readAt: IsNull() } }) };
  }

  async markAllRead(userId: number): Promise<{ unreadCount: number }> {
    await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { unreadCount: 0 };
  }

  // ─── Push tokens ─────────────────────────────────────────────────────

  async registerToken(userId: number, token: string, platform: PushPlatform) {
    const existing = await this.pushTokens.findOne({ where: { token } });
    if (existing) {
      if (existing.userId !== userId || existing.platform !== platform) {
        existing.userId = userId;
        existing.platform = platform;
        await this.pushTokens.save(existing);
      }
      return existing;
    }
    return this.pushTokens.save(this.pushTokens.create({ userId, token, platform }));
  }

  async removeToken(userId: number, token: string) {
    await this.pushTokens.delete({ userId, token });
    return { message: 'Token removed' };
  }
}
