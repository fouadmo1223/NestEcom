import 'reflect-metadata';
import dataSource from '../db/data-source';

/**
 * One-off: give every product / category a real photo where none was uploaded.
 * Idempotent — only fills rows whose `image` is NULL or empty. Safe to re-run.
 *
 *   cd backend && npm run backfill:images
 *
 * Photos come from loremflickr (keyword-matched real Flickr images, no API key).
 * `lock` makes each row deterministic so the same product always gets the same
 * picture. Swap `PHOTO` below for Cloudinary/S3 once real product shots exist.
 */

const STOP = new Set([
  'hd',
  'xl',
  'mini',
  'led',
  'portable',
  'wireless',
  'smart',
  'ergonomic',
  'mechanical',
  'the',
  'and',
  'with',
  'pro',
  'plus',
]);

function keywords(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return (words.length ? words.slice(0, 2) : ['product']).join(',');
}

const PHOTO = (kw: string, lock: number, w = 800, h = 1000) =>
  `https://loremflickr.com/${w}/${h}/${encodeURIComponent(kw)}?lock=${lock}`;

async function run() {
  const ds = await dataSource.initialize();
  try {
    const products: { id: number; title: string }[] = await ds.query(
      `SELECT id, title FROM products WHERE image IS NULL OR image = ''`,
    );
    for (const p of products) {
      await ds.query(`UPDATE products SET image = $1 WHERE id = $2`, [
        PHOTO(keywords(p.title), p.id, 800, 1000),
        p.id,
      ]);
    }
    console.log(`products: filled ${products.length}`);

    const cats: { id: number; name: string }[] = await ds.query(
      `SELECT id, name FROM categories WHERE image IS NULL OR image = ''`,
    );
    for (const c of cats) {
      await ds.query(`UPDATE categories SET image = $1 WHERE id = $2`, [
        PHOTO(keywords(c.name), 1000 + c.id, 900, 900),
        c.id,
      ]);
    }
    console.log(`categories: filled ${cats.length}`);

    // product_images rows (gallery) for products that now have a primary image
    const imgs: { id: number; productId: number; url: string }[] = await ds.query(
      `SELECT pi.id FROM product_images pi LIMIT 1`,
    );
    if (!imgs.length) {
      const withImg: { id: number; image: string }[] = await ds.query(
        `SELECT id, image FROM products WHERE image IS NOT NULL AND image <> ''`,
      );
      for (const p of withImg) {
        await ds.query(
          `INSERT INTO product_images ("productId", url, position) VALUES ($1, $2, 0)
           ON CONFLICT DO NOTHING`,
          [p.id, p.image],
        );
      }
      console.log(`product_images: seeded ${withImg.length}`);
    }
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error('backfill-images failed:', err);
  process.exit(1);
});
