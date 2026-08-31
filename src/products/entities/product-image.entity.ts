import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../product.entity';

@Entity({ name: 'product_images' })
@Index(['productId', 'position'])
export class ProductImage {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  product!: Product;

  @Column()
  productId!: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../image.jpg' })
  @Column()
  url!: string;

  /** 0 = primary/thumbnail. */
  @ApiProperty({ example: 0 })
  @Column({ type: 'int', default: 0 })
  position!: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  alt!: string | null;
}
