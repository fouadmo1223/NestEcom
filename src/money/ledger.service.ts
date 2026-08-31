import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LedgerEntry, LedgerEntryType } from './entities/ledger-entry.entity';
import { Vendor } from '../vendors/entities/vendor.entity';

const round = (n: number) => Math.round(n * 100) / 100;

interface PostInput {
  vendorId: number;
  type: LedgerEntryType;
  amount: number;
  vendorOrderId?: number | null;
  note?: string;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry) private readonly entries: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
  ) {}

  /** Append a ledger entry and move the vendor's available balance by `amount`. */
  async post(tx: EntityManager, input: PostInput): Promise<LedgerEntry> {
    const vendorRepo = tx.getRepository(Vendor);
    const vendor = await vendorRepo.findOneBy({ id: input.vendorId });
    if (!vendor) throw new Error(`Vendor ${input.vendorId} not found for ledger post`);

    const balanceAfter = round(Number(vendor.balance) + input.amount);
    vendor.balance = balanceAfter;
    await vendorRepo.save(vendor);

    return tx.getRepository(LedgerEntry).save(
      tx.getRepository(LedgerEntry).create({
        vendorId: input.vendorId,
        vendorOrderId: input.vendorOrderId ?? null,
        type: input.type,
        amount: round(input.amount),
        balanceAfter,
        note: input.note ?? null,
      }),
    );
  }

  /**
   * COD is collected per shipment on delivery: move that shipment's earnings
   * from pending to available and record it. Idempotent per vendor order.
   */
  async settleVendorOrder(vendorOrder: {
    id: number;
    vendorId: number;
    vendorEarnings: number;
  }): Promise<void> {
    await this.dataSource.transaction(async (tx) => {
      const already = await tx.getRepository(LedgerEntry).findOne({
        where: { vendorOrderId: vendorOrder.id, type: LedgerEntryType.EARNING },
      });
      if (already) return;

      const vendorRepo = tx.getRepository(Vendor);
      await vendorRepo.decrement(
        { id: vendorOrder.vendorId },
        'pendingBalance',
        round(vendorOrder.vendorEarnings),
      );
      await this.post(tx, {
        vendorId: vendorOrder.vendorId,
        vendorOrderId: vendorOrder.id,
        type: LedgerEntryType.EARNING,
        amount: round(vendorOrder.vendorEarnings),
        note: `Delivered — shipment #${vendorOrder.id}`,
      });
    });
  }

  listForVendor(vendorId: number, page: number, limit: number) {
    return this.entries.findAndCount({
      where: { vendorId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  sumByType(vendorId: number, type: LedgerEntryType): Promise<number> {
    return this.entries
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'sum')
      .where('e.vendorId = :vendorId AND e.type = :type', { vendorId, type })
      .getRawOne<{ sum: string }>()
      .then((r) => round(parseFloat(r?.sum ?? '0')));
  }
}
