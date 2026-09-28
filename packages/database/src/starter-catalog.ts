import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from './index';
import { productFamilies, productOptionDefinitions, products } from './schema';

// Starter public catalog (DD-025, DD-026). Options mirror the choices approved in website v0.4
// (/kreator) plus the thickness/edge/finish options already modelled in the dev catalog.
// Rows are inserted idempotently; later catalog changes are data, not code.

type Choice = { label: string; description?: string; swatch?: string };

type StarterOption = {
  code: string;
  name: string;
  dataType: 'NUMBER' | 'ENUM';
  minValue?: string;
  maxValue?: string;
  unit?: string;
  choices?: string[];
  displayOrder: number;
  presentation: {
    group: string;
    hint?: string;
    step?: number;
    choices?: Record<string, Choice>;
  };
};

const GROUP_SIZE = 'Wymiary';
const GROUP_WOOD = 'Drewno i wykończenie';
const GROUP_BUILD = 'Konstrukcja';

function enumOption(
  code: string,
  name: string,
  displayOrder: number,
  group: string,
  choices: Record<string, Choice>,
): StarterOption {
  return {
    code,
    name,
    dataType: 'ENUM',
    choices: Object.keys(choices),
    displayOrder,
    presentation: { group, choices },
  };
}

function numberOption(
  code: string,
  name: string,
  displayOrder: number,
  range: [number, number],
  step: number,
  hint?: string,
): StarterOption {
  return {
    code,
    name,
    dataType: 'NUMBER',
    minValue: String(range[0]),
    maxValue: String(range[1]),
    unit: 'cm',
    displayOrder,
    presentation: { group: GROUP_SIZE, step, ...(hint ? { hint } : {}) },
  };
}

const width = numberOption('width_cm', 'Szerokość', 10, [80, 320], 10);
const depth = numberOption('depth_cm', 'Głębokość', 20, [40, 140], 5);
const material = enumOption('material', 'Materiał', 30, GROUP_WOOD, {
  STARY_DAB: {
    label: 'Stary dąb',
    description: 'Ciemniejszy, z wyraźnym rysunkiem i patyną.',
    swatch: '#6b4a30',
  },
  DAB: {
    label: 'Naturalny dąb',
    description: 'Jaśniejszy, spokojny rysunek słojów.',
    swatch: '#c79a62',
  },
  ODZYSK: {
    label: 'Drewno z odzysku',
    description: 'Ślady historii są częścią charakteru.',
    swatch: '#8a6444',
  },
});
const base = enumOption('base', 'Konstrukcja / podstawa', 40, GROUP_BUILD, {
  STAL_CZARNA: {
    label: 'Stal czarna',
    description: 'Czarna stalowa rama, lekka wizualnie.',
    swatch: '#2d2b29',
  },
  DREWNO: { label: 'Drewno', description: 'Nogi lub cokół z tego samego drewna.' },
  DO_USTALENIA: { label: 'Do ustalenia', description: 'Dobierzemy konstrukcję wspólnie.' },
});
const finish = enumOption('finish', 'Wykończenie', 35, GROUP_WOOD, {
  OLEJ_NATURALNY: { label: 'Olej naturalny', description: 'Podkreśla naturalny kolor drewna.' },
  OLEJ_DYMIONY: { label: 'Olej dymiony', description: 'Przyciemnia i ociepla odcień.' },
  BEZ_WYKONCZENIA: { label: 'Bez wykończenia', description: 'Surowa powierzchnia do ustalenia.' },
});
const thickness = numberOption(
  'thickness_cm',
  'Grubość blatu',
  25,
  [3, 10],
  1,
  'Grubszy blat daje masywniejszy wygląd.',
);
const edge = enumOption('edge', 'Krawędź', 33, GROUP_WOOD, {
  PROSTA: { label: 'Prosta', description: 'Równo docięta krawędź.' },
  NATURALNA: { label: 'Naturalna', description: 'Zachowuje kształt pnia.' },
});
// Sideboard defaults (owner-authorised 2026-09-28): typical sideboard proportions; editable as catalog data.
const cabinetDepth = numberOption('depth_cm', 'Głębokość', 20, [30, 60], 5);
const height = numberOption('height_cm', 'Wysokość', 22, [50, 110], 5);

export const STARTER_CATALOG = [
  {
    key: 'stol',
    family: { key: 'stoly', name: 'Stoły i blaty', slug: 'stoly' },
    sku: 'AM-STOL-01',
    name: 'Stół / blat',
    slug: 'stol-blat',
    description: 'Stół lub blat z litego drewna wykonywany na wymiar.',
    options: [width, depth, thickness, material, edge, finish, base],
  },
  {
    key: 'komoda',
    family: { key: 'komody', name: 'Komody i szafki', slug: 'komody' },
    sku: 'AM-KOMODA-01',
    name: 'Komoda / szafka',
    slug: 'komoda-szafka',
    description: 'Komoda lub szafka z litego drewna wykonywana na wymiar.',
    options: [width, cabinetDepth, height, material, finish, base],
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
            presentation: option.presentation,
            displayOrder: option.displayOrder,
          })),
        )
        .onConflictDoNothing();
      // Backfill presentation for options created before DD-026 without overwriting later edits.
      for (const option of product.options) {
        await tx
          .update(productOptionDefinitions)
          .set({ presentation: option.presentation })
          .where(
            and(
              eq(
                productOptionDefinitions.id,
                starterId(organizationId, `option:${product.key}:${option.code}`),
              ),
              isNull(productOptionDefinitions.presentation),
            ),
          );
      }
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
