import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlatformSettingsService } from '../platform/platform-settings.service';
import { Payout, PayoutStatus } from './entities/payout.entity';
import { LedgerEntry, LedgerEntryType } from './entities/ledger-entry.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { VendorOrder, VendorOrderStatus } from '../orders/entities/vendor-order.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LedgerService } from './ledger.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationEvent } from '../notifications/notification-events';
import {
  AdminPayoutQueryDto,
  PayoutAdminAction,
  ProcessPayoutDto,
  RequestPayoutDto,
} from './dtos/money.dtos';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';

const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout) private readonly payouts: Repository<Payout>,
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(VendorOrder) private readonly vendorOrders: Repository<VendorOrder>,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
    private readonly settings: PlatformSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  private get minPayout(): number {
    const min = this.settings.current().minPayout;
    return Number.isFinite(min) && min >= 0 ? min : 0;
  }

  // ─── Vendor ──────────────────────────────────────────────────────────

  async earnings(vendorId: number) {
    const vendor = await this.vendors.findOneBy({ id: vendorId });
    if (!vendor) throw AppError.notFound('Vendor not found');

    const [totalEarned, totalPaidOut, totalAdjust] = await Promise.all([
      this.ledger.sumByType(vendorId, LedgerEntryType.EARNING),
      this.ledger.sumByType(vendorId, LedgerEntryType.PAYOUT),
      this.ledger.sumByType(vendorId, LedgerEntryType.ADJUSTMENT),
    ]);

    const commissionRow = await this.vendorOrders
      .createQueryBuilder('vo')
      .select('COALESCE(SUM(vo.commissionAmount), 0)', 'sum')
      .where('vo.vendorId = :vendorId AND vo.status = :delivered', {
        vendorId,
        delivered: VendorOrderStatus.DELIVERED,
      })
      .getRawOne<{ sum: string }>();

    const pendingPayouts = await this.payouts
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.vendorId = :vendorId AND p.status IN (:...s)', {
        vendorId,
        s: [PayoutStatus.REQUESTED, PayoutStatus.APPROVED],
      })
      .getRawOne<{ sum: string }>();

    return {
      balance: Number(vendor.balance),
      pendingBalance: Number(vendor.pendingBalance),
      totalSales: Number(vendor.totalSales),
      totalEarned,
      totalCommission: round(parseFloat(commissionRow?.sum ?? '0')),
      totalPaidOut: Math.abs(totalPaidOut),
      totalAdjustments: totalAdjust,
      pendingPayouts: round(parseFloat(pendingPayouts?.sum ?? '0')),
      minPayout: this.minPayout,
    };
  }

  async ledgerFor(vendorId: number, page: number, limit: number) {
    const [data, total] = await this.ledger.listForVendor(vendorId, page, limit);
    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  listVendorPayouts(vendorId: number) {
    return this.payouts.find({ where: { vendorId }, order: { requestedAt: 'DESC' } });
  }

  async requestPayout(vendorId: number, dto: RequestPayoutDto): Promise<Payout> {
    const amount = round(dto.amount);
    if (amount < this.minPayout) {
      throw AppError.badRequest(
        `Minimum payout is ${this.minPayout}`,
        ErrorCode.BAD_REQUEST,
      );
    }

    return this.dataSource.transaction(async (tx) => {
      const vendorRepo = tx.getRepository(Vendor);
      const vendor = await vendorRepo.findOneBy({ id: vendorId });
      if (!vendor) throw AppError.notFound('Vendor not found');
      if (amount > Number(vendor.balance)) {
        throw AppError.badRequest('Amount exceeds your available balance', ErrorCode.BAD_REQUEST);
      }

      const openRequest = await tx
        .getRepository(Payout)
        .findOne({ where: { vendorId, status: PayoutStatus.REQUESTED } });
      if (openRequest) {
        throw AppError.conflict('You already have a payout request awaiting review');
      }

      const payout = await tx.getRepository(Payout).save(
        tx.getRepository(Payout).create({
          vendorId,
          amount,
          method: dto.method ?? null,
          status: PayoutStatus.REQUESTED,
        }),
      );

      // Hold the funds immediately.
      await this.ledger.post(tx, {
        vendorId,
        type: LedgerEntryType.PAYOUT,
        amount: -amount,
        note: `Payout request #${payout.id}`,
      });

      return payout;
    });
  }

  // ─── Admin ───────────────────────────────────────────────────────────

  async listAll(query: AdminPayoutQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const [data, total] = await this.payouts.findAndCount({
      where: query.status ? { status: query.status as PayoutStatus } : {},
      order: { requestedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // attach store name + vendor available balance for the admin table
    const rows: Array<Payout & { storeName?: string; vendorBalance?: number }> = data;
    if (rows.length) {
      const vendorIds = [...new Set(rows.map((p) => p.vendorId))];
      const stores = await this.payouts.manager.query(
        `SELECT s."vendorId" AS vid, s.name, v.balance
           FROM stores s JOIN vendors v ON v.id = s."vendorId"
          WHERE s."vendorId" = ANY($1)`,
        [vendorIds],
      );
      const byVendor = new Map(
        (stores as { vid: number; name: string; balance: string }[]).map((r) => [
          r.vid,
          { name: r.name, balance: Number(r.balance) },
        ]),
      );
      for (const p of rows) {
        const info = byVendor.get(p.vendorId);
        p.storeName = info?.name;
        p.vendorBalance = info?.balance;
      }
    }

    return { data: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async process(id: number, dto: ProcessPayoutDto, adminId: number): Promise<Payout> {
    const payout = await this.payouts.findOneBy({ id });
    if (!payout) throw AppError.notFound('Payout not found');
    if (payout.status === PayoutStatus.PAID || payout.status === PayoutStatus.REJECTED) {
      throw AppError.conflict('This payout has already been finalised');
    }

    if (dto.action === PayoutAdminAction.APPROVE) {
      payout.status = PayoutStatus.APPROVED;
    } else if (dto.action === PayoutAdminAction.PAY) {
      payout.status = PayoutStatus.PAID;
      payout.reference = dto.reference ?? payout.reference;
      payout.processedAt = new Date();
      payout.processedBy = adminId;
    } else {
      // reject → return the held funds
      await this.dataSource.transaction(async (tx) => {
        await this.ledger.post(tx, {
          vendorId: payout.vendorId,
          type: LedgerEntryType.ADJUSTMENT,
          amount: round(payout.amount),
          note: `Payout #${payout.id} rejected`,
        });
      });
      payout.status = PayoutStatus.REJECTED;
      payout.processedAt = new Date();
      payout.processedBy = adminId;
    }
    if (dto.note) payout.note = dto.note;

    const saved = await this.payouts.save(payout);
    await this.audit.record({
      actorId: adminId,
      action: `payout.${dto.action}`,
      entityType: 'payout',
      entityId: id,
      metadata: { vendorId: payout.vendorId, amount: payout.amount },
    });

    const vendor = await this.vendors.findOneBy({ id: payout.vendorId });
    if (vendor) {
      this.events.emit(NotificationEvent.PAYOUT_PROCESSED, {
        vendorUserId: vendor.userId,
        payoutId: saved.id,
        status: saved.status,
        amount: Number(saved.amount),
      });
    }
    return saved;
  }
}
