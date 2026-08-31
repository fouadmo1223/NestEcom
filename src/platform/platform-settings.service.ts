import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from './platform-setting.entity';

export interface PlatformSettingsSnapshot {
  defaultCommissionRate: number;
  currency: string;
  minPayout: number;
  lowStockThreshold: number;
  reviewRequiresPurchase: boolean;
  freeShippingEnabled: boolean;
}

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformSettingsService.name);
  private cache: PlatformSetting | null = null;

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly repo: Repository<PlatformSetting>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.get();
    } catch (err) {
      this.logger.warn(
        `Could not preload platform settings: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Loads (and lazily seeds from env) the singleton settings row. Cached. */
  async get(): Promise<PlatformSetting> {
    if (this.cache) return this.cache;
    let row = await this.repo.findOneBy({ id: 1 });
    if (!row) {
      row = await this.repo.save(
        this.repo.create({
          id: 1,
          defaultCommissionRate: this.envNum('PLATFORM_DEFAULT_COMMISSION_RATE', 0.1),
          currency: this.config.get('PLATFORM_CURRENCY', 'EGP'),
          minPayout: this.envNum('PLATFORM_MIN_PAYOUT', 0),
          lowStockThreshold: Math.trunc(this.envNum('PLATFORM_LOW_STOCK_THRESHOLD', 5)),
        }),
      );
    }
    this.cache = row;
    return row;
  }

  async update(patch: Partial<PlatformSetting>): Promise<PlatformSetting> {
    const current = await this.get();
    Object.assign(current, patch, { id: 1 });
    const saved = await this.repo.save(current);
    this.cache = saved;
    return saved;
  }

  /** Synchronous snapshot for hot paths; falls back to env before the row loads. */
  current(): PlatformSettingsSnapshot {
    if (this.cache) {
      return {
        defaultCommissionRate: Number(this.cache.defaultCommissionRate),
        currency: this.cache.currency,
        minPayout: Number(this.cache.minPayout),
        lowStockThreshold: this.cache.lowStockThreshold,
        reviewRequiresPurchase: this.cache.reviewRequiresPurchase,
        freeShippingEnabled: this.cache.freeShippingEnabled,
      };
    }
    return {
      defaultCommissionRate: this.envNum('PLATFORM_DEFAULT_COMMISSION_RATE', 0.1),
      currency: this.config.get('PLATFORM_CURRENCY', 'EGP'),
      minPayout: this.envNum('PLATFORM_MIN_PAYOUT', 0),
      lowStockThreshold: Math.trunc(this.envNum('PLATFORM_LOW_STOCK_THRESHOLD', 5)),
      reviewRequiresPurchase: false,
      freeShippingEnabled: true,
    };
  }

  private envNum(key: string, fallback: number): number {
    const raw = Number(this.config.get(key, String(fallback)));
    return Number.isFinite(raw) ? raw : fallback;
  }
}
