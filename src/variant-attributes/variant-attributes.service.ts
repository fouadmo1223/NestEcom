import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariantAttribute } from './variant-attribute.entity';
import { UpsertVariantAttributeDto } from './dtos/upsert-variant-attribute.dto';

@Injectable()
export class VariantAttributesService {
  constructor(
    @InjectRepository(VariantAttribute)
    private readonly repo: Repository<VariantAttribute>,
  ) {}

  /**
   * Every attribute, with its value list scoped to the caller: platform values
   * (ownerId null) plus the caller's own additions. `viewerId = null` (super
   * admin) sees everything.
   */
  async findAllForViewer(viewerId: number | null): Promise<VariantAttribute[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    if (viewerId === null) return rows;
    return rows.map((r) => ({
      ...r,
      values: (r.values ?? []).filter(
        (v) => v.ownerId == null || v.ownerId === viewerId,
      ),
    }));
  }

  async findOne(id: number): Promise<VariantAttribute> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Variant attribute not found');
    return row;
  }

  private normalize(dto: UpsertVariantAttributeDto) {
    const seen = new Set<string>();
    const values = (dto.values ?? [])
      .map((v) => ({
        value: String(v.value ?? '').trim(),
        valueAr: v.valueAr ? String(v.valueAr).trim() : null,
        // Preserve the caller-supplied ownership so an admin editing the
        // full list doesn't turn vendors' private values into platform ones.
        ownerId: typeof v.ownerId === 'number' ? v.ownerId : null,
      }))
      .filter((v) => {
        if (!v.value || seen.has(v.value.toLowerCase())) return false;
        seen.add(v.value.toLowerCase());
        return true;
      });
    return {
      name: dto.name.trim(),
      nameAr: dto.nameAr?.trim() || null,
      values,
    };
  }

  create(dto: UpsertVariantAttributeDto, userId: number): Promise<VariantAttribute> {
    return this.repo.save(
      this.repo.create({ ...this.normalize(dto), createdById: userId }),
    );
  }

  async update(id: number, dto: UpsertVariantAttributeDto): Promise<VariantAttribute> {
    const row = await this.findOne(id);
    // The admin form round-trips the full value list (ownership included), so
    // whatever it sends back is the new truth — nothing is force-preserved.
    Object.assign(row, this.normalize(dto));
    return this.repo.save(row);
  }

  async remove(id: number): Promise<{ message: string }> {
    const row = await this.findOne(id);
    await this.repo.remove(row);
    return { message: 'Variant attribute deleted' };
  }

  /**
   * Append one value. `ownerId = null` → platform-wide (super admin);
   * `ownerId = <userId>` → private to that vendor. No-op on a duplicate
   * within the caller's visible set.
   */
  async addValue(
    id: number,
    value: string,
    valueAr: string | undefined,
    ownerId: number | null,
  ): Promise<VariantAttribute> {
    const row = await this.findOne(id);
    const clean = value.trim();
    if (!clean) return row;
    const visible = (row.values ?? []).filter(
      (v) => v.ownerId == null || v.ownerId === ownerId,
    );
    if (visible.some((v) => v.value.toLowerCase() === clean.toLowerCase())) {
      return row;
    }
    row.values = [
      ...(row.values ?? []),
      { value: clean, valueAr: valueAr?.trim() || null, ownerId },
    ];
    await this.repo.save(row);
    return row;
  }
}
