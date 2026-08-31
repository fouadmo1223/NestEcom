import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Product } from './product.entity';
import { InventoryLog, InventoryReason } from './entities/inventory-log.entity';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';

interface ChangeOpts {
  reason?: InventoryReason;
  note?: string;
  actorId?: number | null;
  /** Reject the change if it would drive stock negative (default true). */
  allowNegative?: boolean;
}

/**
 * The single path for every stock mutation. Records an InventoryLog row for
 * each change so history and "low stock" are always derivable.
 */
@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(InventoryLog) private readonly logs: Repository<InventoryLog>,
  ) {}

  async applyChange(
    productId: number,
    change: number,
    opts: ChangeOpts = {},
  ): Promise<{ product: Product; log: InventoryLog }> {
    return this.products.manager.transaction((tx) =>
      this.applyChangeWithin(tx, productId, change, opts),
    );
  }

  /** Same as applyChange but participates in a caller-owned transaction. */
  async applyChangeWithin(
    tx: EntityManager,
    productId: number,
    change: number,
    opts: ChangeOpts = {},
  ): Promise<{ product: Product; log: InventoryLog }> {
    const productRepo = tx.getRepository(Product);
    const logRepo = tx.getRepository(InventoryLog);

    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) throw AppError.notFound('Product not found');

    const next = product.stock + change;
    if (next < 0 && opts.allowNegative !== true) {
      throw AppError.badRequest(
        `Insufficient stock for "${product.title}" (have ${product.stock}, need ${-change})`,
        ErrorCode.BAD_REQUEST,
      );
    }

    product.stock = next;
    await productRepo.save(product);

    const log = await logRepo.save(
      logRepo.create({
        productId,
        vendorId: product.vendorId ?? null,
        change,
        resultingStock: next,
        reason: opts.reason ?? InventoryReason.MANUAL,
        note: opts.note ?? null,
        actorId: opts.actorId ?? null,
      }),
    );

    return { product, log };
  }

  history(productId: number, limit = 50): Promise<InventoryLog[]> {
    return this.logs.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: Math.min(200, limit),
    });
  }
}
