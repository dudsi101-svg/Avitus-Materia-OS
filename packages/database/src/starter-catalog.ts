import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from './index';
import { productFamilies, productOptionDefinitions, products } from './schema';

// Starter public catalog (DD-025). Options mirror the choices approved in website v0.4
// (/kreator). Rows are inserted idempotently; later catalog changes are data, not code.

type StarterOption = {
  code: string;
  name: string;
  dataType: 'NUMBER' | 'ENUM';
  minValue?: string;
  maxValue?: string;
  unit?: string;
  choices?: string[];
  displayOrder: number;
};

const MATERIALS = ['STARY_DAB', 'DAB', 'ODZYSK'];
const BASES = ['STAL_CZARNA', 'DREWNO', 'DO_USTALENIA'];

const sharedOptions: StarterOption[] = [
  {
    code: 'width_cm',
    name: 'Szerokość',
    dataType: 'NUMBER',
    minValue: '80',
    maxValue: '320',
    unit: 'cm',
    displayOrder: 10,
  },
  {
    code: 'depth_cm',
    name: 'Głębokość',
    dataType: 'NUMBER',
    minValue: '40',
    maxValue: '140',
    unit: 'cm',
    displayOrder: 20,
  },
  { code: 'material', name: 'Materiał', dataType: 'ENUM', choices: MATERIALS, displayOrder: 30 },
  {
    code: 'base',
    name: 'Konstrukcja / podstawa',
    dataType: 'ENUM',
    choices: BASES,
    displayOrder: 40,
  },
];

export const STARTER_CATALOG = [
  {
    key: 'stol',
    family: { key: 'stoly', name: 'Stoły i blaty', slug: 'stoly' },
    sku: 'AM-STOL-01',
    name: 'Stół / blat',
    slug: 'stol-blat',
    description: 'Stół lub blat z litego drewna wykonywany na wymiar.',
    options: sharedOptions,
  },
  {
    key: 'komoda',
    family: { key: 'komody', name: 'Komody i szafki', slug: 'komody' },
    sku: 'AM-KOMODA-01',
    name: 'Komoda / szafka',
    slug: 'komoda-szafka',
    description: 'Komoda lub szafka z litego drewna wykonywana na wymiar.',
    options: sharedOptions,
  },
] as const;

/** Deterministic per-organization UUID so reruns are idempotent and IDs never clash across organizations. */
export function starterId(organizationId: string, key: string): string {
  const hex = createHash('sha256')
    .update(`avitus-starter-catalog:${organizationId}:${key}`)
    .digest('hex');
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function ensureStarterCatalog(db: Database, organizationId: string): Promise<void> {
  await db.transaction(async (tx) => {
    for (const product of STARTER_CATALOG) {
      const familyId = starterId(organizationId, `family:${product.family.key}`);
      const productId = starterId(organizationId, `product:${product.key}`);
      await tx
        .insert(productFamilies)
        .values({
          id: familyId,
          organizationId,
          name: product.family.name,
          slug: product.family.slug,
        })
        .onConflictDoNothing();
      await tx
        .insert(products)
        .values({
          id: productId,
          organizationId,
          productFamilyId: familyId,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description,
          productType: 'CONFIGURABLE',
          defaultCurrency: 'PLN',
        })
        .onConflictDoNothing();
      await tx
        .insert(productOptionDefinitions)
        .values(
          product.options.map((option) => ({
            id: starterId(organizationId, `option:${product.key}:${option.code}`),
            organizationId,
            productId,
            code: option.code,
            name: option.name,
            dataType: option.dataType,
            required: true,
            minValue: option.minValue ?? null,
            maxValue: option.maxValue ?? null,
            unit: option.unit ?? null,
            choices: option.choices ?? null,
            displayOrder: option.displayOrder,
          })),
        )
        .onConflictDoNothing();
    }
    const ids = STARTER_CATALOG.map((product) =>
      starterId(organizationId, `product:${product.key}`),
    );
    const present = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.organizationId, organizationId), inArray(products.id, ids)));
    if (present.length !== ids.length) {
      throw new Error(
        'Starter catalog conflicts with existing products (SKU/slug already used differently).',
      );
    }
  });
}
