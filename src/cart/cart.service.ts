import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { MergeCartDto } from './dtos/merge-cart.dto';
import { Product, ProductStatus } from '../products/product.entity';
import { Store } from '../vendors/entities/store.entity';
import { VendorStatus } from '../vendors/entities/vendor.entity';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';

export interface CartItemView {
  id: number;
  quantity: number;
  product: Product;
  lineTotal: number;
  available: boolean;
  maxQuantity: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private readonly cartRepository: Repository<CartItem>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Store) private readonly stores: Repository<Store>,
  ) {}

  async getCart(userId: number) {
    const items = await this.cartRepository.find({
      where: { user: { id: userId } },
      relations: { product: { vendor: true } },
      order: { createdAt: 'ASC' },
    });

    const vendorIds = [...new Set(items.map((i) => i.product.vendorId).filter(Boolean))];
    const stores = vendorIds.length
      ? await this.stores.find({ where: { vendorId: In(vendorIds) } })
      : [];
    const storeByVendor = new Map(stores.map((s) => [s.vendorId, s]));

    const views: CartItemView[] = items.map((item) => {
      const p = item.product;
      const vendorOk = p.vendor?.status === VendorStatus.APPROVED;
      const storeOk = storeByVendor.get(p.vendorId)?.isActive ?? false;
      const sellable = p.status === ProductStatus.ACTIVE && vendorOk && storeOk;
      return {
        id: item.id,
        quantity: item.quantity,
        product: p,
        lineTotal: Number(p.price) * item.quantity,
        available: sellable && p.stock >= item.quantity,
        maxQuantity: sellable ? p.stock : 0,
      };
    });

    const groupsMap = new Map<
      number,
      { vendor: { id: number; name: string; slug: string }; items: CartItemView[]; subtotal: number }
    >();
    for (const v of views) {
      const vendorId = v.product.vendorId;
      const store = storeByVendor.get(vendorId);
      if (!groupsMap.has(vendorId)) {
        groupsMap.set(vendorId, {
          vendor: {
            id: vendorId,
            name: store?.name ?? 'Store',
            slug: store?.slug ?? '',
          },
          items: [],
          subtotal: 0,
        });
      }
      const g = groupsMap.get(vendorId)!;
      g.items.push(v);
      g.subtotal += v.lineTotal;
    }

    const subtotal = views.reduce((s, v) => s + v.lineTotal, 0);
    const itemCount = views.reduce((s, v) => s + v.quantity, 0);

    return {
      groups: [...groupsMap.values()],
      items: views,
      itemCount,
      subtotal: round(subtotal),
      total: round(subtotal), // shipping/discount resolved at checkout
    };
  }

  async addItem(userId: number, dto: AddToCartDto) {
    const product = await this.loadSellableProduct(dto.productId);

    const existing = await this.cartRepository.findOne({
      where: { user: { id: userId }, product: { id: dto.productId } },
    });
    const desired = (existing?.quantity ?? 0) + dto.quantity;
    if (desired > product.stock) {
      throw AppError.badRequest(
        `Only ${product.stock} of "${product.title}" available`,
        ErrorCode.BAD_REQUEST,
      );
    }

    if (existing) {
      existing.quantity = desired;
      await this.cartRepository.save(existing);
    } else {
      await this.cartRepository.save(
        this.cartRepository.create({
          user: { id: userId },
          product: { id: dto.productId },
          quantity: dto.quantity,
        }),
      );
    }
    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto) {
    const item = await this.cartRepository.findOne({
      where: { id: itemId, user: { id: userId } },
      relations: { product: true },
    });
    if (!item) throw AppError.notFound('Cart item not found');
    if (dto.quantity > item.product.stock) {
      throw AppError.badRequest(
        `Only ${item.product.stock} of "${item.product.title}" available`,
        ErrorCode.BAD_REQUEST,
      );
    }
    item.quantity = dto.quantity;
    await this.cartRepository.save(item);
    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.cartRepository.findOne({
      where: { id: itemId, user: { id: userId } },
    });
    if (!item) throw AppError.notFound('Cart item not found');
    await this.cartRepository.remove(item);
    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<{ message: string }> {
    await this.cartRepository.delete({ user: { id: userId } });
    return { message: 'Cart cleared' };
  }

  /** Fold a guest cart into the server cart on login. Silently clamps to
   *  available stock and skips products that are no longer sellable. */
  async merge(userId: number, dto: MergeCartDto) {
    if (dto.items.length) {
      const ids = [...new Set(dto.items.map((i) => i.productId))];
      const products = await this.products.find({
        where: { id: In(ids) },
        relations: { vendor: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const existing = await this.cartRepository.find({
        where: { user: { id: userId } },
        relations: { product: true },
      });
      const existingByProduct = new Map(existing.map((e) => [e.product.id, e]));

      for (const line of dto.items) {
        const product = byId.get(line.productId);
        if (!product || product.status !== ProductStatus.ACTIVE) continue;
        if (product.vendor?.status !== VendorStatus.APPROVED) continue;

        const row = existingByProduct.get(line.productId);
        const target = Math.min(product.stock, (row?.quantity ?? 0) + line.quantity);
        if (target <= 0) continue;

        if (row) {
          row.quantity = target;
          await this.cartRepository.save(row);
        } else {
          await this.cartRepository.save(
            this.cartRepository.create({
              user: { id: userId },
              product: { id: line.productId },
              quantity: target,
            }),
          );
        }
      }
    }
    return this.getCart(userId);
  }

  private async loadSellableProduct(productId: number): Promise<Product> {
    const product = await this.products.findOne({
      where: { id: productId },
      relations: { vendor: true },
    });
    if (!product) throw AppError.notFound('Product not found');
    if (
      product.status !== ProductStatus.ACTIVE ||
      product.vendor?.status !== VendorStatus.APPROVED
    ) {
      throw AppError.badRequest('This product is not available', ErrorCode.BAD_REQUEST);
    }
    return product;
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
