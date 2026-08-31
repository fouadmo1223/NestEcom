import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PlatformSettingsService } from './platform-settings.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit/audit.service';

class UpdatePlatformSettingsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultCommissionRate?: number;

  @IsOptional()
  @IsString()
  @Length(2, 8)
  currency?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minPayout?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  reviewRequiresPurchase?: boolean;

  @IsOptional()
  @IsBoolean()
  freeShippingEnabled?: boolean;
}

@ApiTags('Admin · Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class PlatformSettingsController {
  constructor(
    private readonly settings: PlatformSettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async update(
    @Body() dto: UpdatePlatformSettingsDto,
    @CurrentUser() admin: { id: number },
  ) {
    const saved = await this.settings.update(dto);
    await this.audit.record({
      actorId: admin.id,
      action: 'platform_settings.updated',
      entityType: 'platform_settings',
      entityId: 1,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }
}
