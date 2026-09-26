import { productOptionDefinitions, products, type DbExecutor } from '@avitus/database';
import { DomainError, type RequestContext } from '@avitus/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';

export type ProductType = 'STANDARD' | 'CONFIGURABLE' | 'CUSTOM' | 'SERVICE';
export type ProductOptionDataType = 'NUMBER' | 'TEXT' | 'ENUM' | 'BOOLEAN';

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
