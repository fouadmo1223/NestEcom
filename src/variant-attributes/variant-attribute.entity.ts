import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface VariantAttributeValue {
  value: string;
  valueAr?: string | null;
  /** null = platform value (every vendor sees it); a user id = private to that vendor. */
  ownerId?: number | null;
}

/**
 * A reusable option type defined by the platform (super-admin) that every
 * vendor can pull from when building product variants — e.g. "Size" with
 * values S / M / L, or "Color" with Black / White.
 */
@Entity({ name: 'variant_attributes' })
export class VariantAttribute {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  nameAr!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  values!: VariantAttributeValue[];

  @Column({ type: 'int', nullable: true })
  createdById!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
