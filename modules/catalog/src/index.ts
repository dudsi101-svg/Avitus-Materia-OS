import { productOptionDefinitions, products, type DbExecutor } from '@avitus/database';
import { DomainError, type RequestContext } from '@avitus/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

export type ProductType = 'STANDARD' | 'CONFIGURABLE' | 'CUSTOM' | 'SERVICE';
export type ProductOptionDataType = 'NUMBER' | 'TEXT' | 'ENUM' | 'BOOLEAN';

/** Customer-facing presentation of an option (DD-026). Never affects validation. */
export interface OptionPresentation {
  group?: string;
  hint?: string;
  step?: number;
  choices?: Record<string, { label: string; description?: string; swatch?: string }>;
}

const presentationSchema = z
  .object({
    group: z.string().max(80).optional(),
    hint: z.string().max(300).optional(),
    step: z.number().positive().optional(),
    choices: z
      .record(
        z.string().max(120),
        z.object({
          label: z.string().max(120),
          description: z.string().max(300).optional(),
          swatch: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        }),
      )
      .optional(),
  })
  .strip();

export interface ProductOptionDefinition {
  id: string;
  code: string;
  name: string;
  dataType: ProductOptionDataType;
  required: boolean;
  minValue?: string;
  maxValue?: string;
  unit?: string;
  choices?: string[];
  presentation?: OptionPresentation;
  displayOrder: number;
}

export interface Product {
  id: string;
  organizationId: string;
  productFamilyId: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  productType: ProductType;
  active: boolean;
  basePrice?: string;
  defaultCurrency: string;
  options: ProductOptionDefinition[];
}

export interface ProductRepository {
  listActive(organizationId: string): Promise<Product[]>;
  findActiveById(organizationId: string, productId: string): Promise<Product | null>;
}

function optionFromRow(row: typeof productOptionDefinitions.$inferSelect): ProductOptionDefinition {
  const rawChoices = row.choices;
  const choices = Array.isArray(rawChoices)
    ? rawChoices.filter((value): value is string => typeof value === 'string')
    : undefined;
  // Malformed presentation data is ignored rather than breaking the catalog.
  const parsedPresentation = row.presentation ? presentationSchema.safeParse(row.presentation) : null;
  const presentation = parsedPresentation?.success ? (parsedPresentation.data as OptionPresentation) : undefined;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    dataType: row.dataType,
    required: row.required,
    ...(row.minValue !== null ? { minValue: row.minValue } : {}),
    ...(row.maxValue !== null ? { maxValue: row.maxValue } : {}),
    ...(row.unit ? { unit: row.unit } : {}),
    ...(choices ? { choices } : {}),
    ...(presentation ? { presentation } : {}),
    displayOrder: row.displayOrder,
  };
}

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly db: DbExecutor) {}

  async listActive(organizationId: string): Promise<Product[]> {
    const productRows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.organizationId, organizationId), eq(products.active, true)))
      .orderBy(asc(products.name));
    if (productRows.length === 0) return [];
    const optionRows = await this.db
      .select()
      .from(productOptionDefinitions)
      .where(
        and(
          eq(productOptionDefinitions.organizationId, organizationId),
          inArray(productOptionDefinitions.productId, productRows.map((row) => row.id)),
        ),
      )
      .orderBy(asc(productOptionDefinitions.displayOrder));
    return productRows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      productFamilyId: row.productFamilyId,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      ...(row.description ? { description: row.description } : {}),
      productType: row.productType,
      active: row.active,
      ...(row.basePrice !== null ? { basePrice: row.basePrice } : {}),
      defaultCurrency: row.defaultCurrency,
      options: optionRows.filter((option) => option.productId === row.id).map(optionFromRow),
    }));
  }

  async findActiveById(organizationId: string, productId: string): Promise<Product | null> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.organizationId, organizationId), eq(products.id, productId), eq(products.active, true)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const optionRows = await this.db
      .select()
      .from(productOptionDefinitions)
      .where(and(eq(productOptionDefinitions.organizationId, organizationId), eq(productOptionDefinitions.productId, productId)))
      .orderBy(asc(productOptionDefinitions.displayOrder));
    return {
      id: row.id,
      organizationId: row.organizationId,
      productFamilyId: row.productFamilyId,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      ...(row.description ? { description: row.description } : {}),
      productType: row.productType,
      active: row.active,
      ...(row.basePrice !== null ? { basePrice: row.basePrice } : {}),
      defaultCurrency: row.defaultCurrency,
      options: optionRows.map(optionFromRow),
    };
  }
}

export class ReadCatalogService {
  constructor(private readonly products: ProductRepository) {}

  async listProducts(context: RequestContext): Promise<Product[]> {
    if (!context.permissions.has('catalog.product.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing catalog.product.read permission.');
    }
    return this.products.listActive(context.organizationId);
  }

  async productById(productId: string, context: RequestContext): Promise<Product> {
    if (!context.permissions.has('catalog.product.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing catalog.product.read permission.');
    }
    const product = await this.products.findActiveById(context.organizationId, productId);
    if (!product) throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found.');
    return product;
  }
}

/** Public projection of a configurable product: never exposes price or internal fields (DD-025). */
export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  options: ProductOptionDefinition[];
}

export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    ...(product.description ? { description: product.description } : {}),
    options: product.options,
  };
}

export class ReadPublicCatalogService {
  constructor(private readonly products: ProductRepository) {}

  async listConfigurable(context: RequestContext): Promise<PublicProduct[]> {
    if (!context.permissions.has('catalog.public_product.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing catalog.public_product.read permission.');
    }
    const active = await this.products.listActive(context.organizationId);
    return active.filter((product) => product.productType === 'CONFIGURABLE').map(toPublicProduct);
  }
}
