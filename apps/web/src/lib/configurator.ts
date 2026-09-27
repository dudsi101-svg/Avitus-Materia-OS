// Public configurator contract mirrored from GET /public/configurator/products (DD-025, DD-026).
export interface OptionPresentation {
  group?: string;
  hint?: string;
  step?: number;
  choices?: Record<string, { label: string; description?: string; swatch?: string }>;
}

export interface PublicOption {
  id: string;
  code: string;
  name: string;
  dataType: 'NUMBER' | 'TEXT' | 'ENUM' | 'BOOLEAN';
  required: boolean;
  minValue?: string;
  maxValue?: string;
  unit?: string;
  choices?: string[];
  presentation?: OptionPresentation;
  displayOrder: number;
}

export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  options: PublicOption[];
}

export type OptionValue = string | number | boolean;
export type Values = Record<string, OptionValue>;

const DEFAULT_GROUP = 'Opcje';

/** Label for a choice code: catalog presentation first, then a readable fallback. */
export function choiceLabel(option: PublicOption, code: string): string {
  const fromCatalog = option.presentation?.choices?.[code]?.label;
  if (fromCatalog) return fromCatalog;
  return code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function formatValue(option: PublicOption, value: OptionValue | undefined): string {
  if (value === undefined || value === '') return '—';
  if (option.dataType === 'ENUM') return choiceLabel(option, String(value));
  if (option.dataType === 'BOOLEAN') return value ? 'Tak' : 'Nie';
  if (option.dataType === 'NUMBER') return `${value}${option.unit ? ` ${option.unit}` : ''}`;
  return String(value);
}

function range(option: PublicOption): { min: number; max: number } {
  const min = Number(option.minValue ?? 0);
  return { min, max: Number(option.maxValue ?? min + 100) };
}

export function numberStep(option: PublicOption): number {
  if (option.presentation?.step) return option.presentation.step;
  const { min, max } = range(option);
  return max - min > 150 ? 10 : 5;
}

function snap(option: PublicOption, raw: number): number {
  const { min, max } = range(option);
  const step = numberStep(option);
  const snapped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

export function sortedOptions(product: PublicProduct): PublicOption[] {
  return [...product.options].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Groups options in display order; a group appears where its first option appears. */
export function groupOptions(
  product: PublicProduct,
): Array<{ group: string; options: PublicOption[] }> {
  const groups: Array<{ group: string; options: PublicOption[] }> = [];
  for (const option of sortedOptions(product)) {
    const name = option.presentation?.group ?? DEFAULT_GROUP;
    const existing = groups.find((candidate) => candidate.group === name);
    if (existing) existing.options.push(option);
    else groups.push({ group: name, options: [option] });
  }
  return groups;
}

export function initialValues(product: PublicProduct): Values {
  const values: Values = {};
  for (const option of product.options) {
    if (option.dataType === 'NUMBER') {
      const { min, max } = range(option);
      values[option.code] = snap(option, min + (max - min) * 0.45);
    } else if (option.dataType === 'ENUM' && option.choices?.length) {
      values[option.code] = option.choices[0]!;
    } else if (option.dataType === 'BOOLEAN') {
      values[option.code] = false;
    }
  }
  return values;
}

/** Parses one URL parameter against the option's rules; returns undefined when invalid. */
function parseParam(option: PublicOption, raw: string): OptionValue | undefined {
  if (option.dataType === 'NUMBER') {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? snap(option, numeric) : undefined;
  }
  if (option.dataType === 'ENUM') return option.choices?.includes(raw) ? raw : undefined;
  if (option.dataType === 'BOOLEAN') return raw === '1' ? true : raw === '0' ? false : undefined;
  return raw.slice(0, 200);
}

export const PRODUCT_PARAM = 'projekt';

export function toSearchParams(product: PublicProduct, values: Values): URLSearchParams {
  const params = new URLSearchParams({ [PRODUCT_PARAM]: product.slug });
  for (const option of sortedOptions(product)) {
    const value = values[option.code];
    if (value === undefined || value === '') continue;
    params.set(option.code, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return params;
}

/** Restores a shared configuration; invalid or unknown parameters are ignored. */
export function fromSearchParams(
  products: PublicProduct[],
  params: URLSearchParams,
): { product: PublicProduct; values: Values } | null {
  const product = products.find((candidate) => candidate.slug === params.get(PRODUCT_PARAM));
  if (!product) return null;
  const values = initialValues(product);
  for (const option of product.options) {
    const raw = params.get(option.code);
    if (raw === null) continue;
    const parsed = parseParam(option, raw);
    if (parsed !== undefined) values[option.code] = parsed;
  }
  return { product, values };
}
