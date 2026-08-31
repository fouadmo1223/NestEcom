import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/transformers/decimal.transformer';
import { Review } from '../reviews/review.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { ProductImage } from './entities/product-image.entity';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity({ name: 'products' })
@Index(['vendorId', 'slug'], { unique: true })
@Index(['status', 'createdAt'])
@Index(['vendorId', 'status'])
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'varchar' })
  slug!: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: decimalTransformer })
  price!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  /** Derived primary image URL (kept in sync with images[position=0]). */
  @Column({ type: 'varchar', nullable: true })
  image!: string | null;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column('simple-array', { nullable: true })
  tags!: string[] | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE', eager: true })
  vendor!: Vendor;

  @Column()
  vendorId!: number;

  /** Audit only — who created the row. */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  createdBy!: User | null;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  category!: Category | null;

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images!: ProductImage[];

  @OneToMany(() => Review, (review) => review.product, { eager: true })
  reviews!: Review[];

  get avgRating(): number {
    const visible = this.reviews?.filter((r) => r.status !== 'hidden') ?? [];
    if (!visible.length) return 0;
    const sum = visible.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / visible.length) * 10) / 10;
  }

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
