import { ValueTransformer } from 'typeorm';

/**
 * Postgres `numeric`/`decimal` columns are returned as strings by the driver.
 * This transformer hydrates them into real numbers so API responses never
 * leak `"79.99"` where the frontend contract expects `79.99`.
 */
export class DecimalTransformer implements ValueTransformer {
  to(value?: number | string | null): number | string | null | undefined {
    return value;
  }

  from(value?: string | null): number | null {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}

export const decimalTransformer = new DecimalTransformer();
