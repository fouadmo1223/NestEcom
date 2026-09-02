import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { JwtGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserType } from '../../users/user.entity';

@ApiTags('Admin · Audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class AuditLogController {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 30));

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin('users', 'actor', 'actor.id = a."actorId"')
      .addSelect(['actor.username', 'actor.email'])
      .orderBy('a.createdAt', 'DESC');
    if (action) {
      qb.andWhere('(a.action ILIKE :q OR a."entityType" ILIKE :q)', { q: `%${action}%` });
    }
    if (entityType) qb.andWhere('a."entityType" = :entityType', { entityType });

    const { entities, raw } = await qb
      .skip((p - 1) * l)
      .take(l)
      .getRawAndEntities();
    const total = await qb.getCount();

    const data = entities.map((e, i) => ({
      ...e,
      actorName:
        (raw[i] as { actor_username?: string; actor_email?: string })?.actor_username ??
        (raw[i] as { actor_email?: string })?.actor_email ??
        null,
    }));
    return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }
}
