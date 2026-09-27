// Public configurator contract mirrored from GET /public/configurator/products (DD-025).
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

// Presentation labels for catalog choice codes. Unknown codes fall back to a readable form.
const CHOICE_LABELS: Record<string, string> = {
  STARY_DAB: 'Stary dąb',
  DAB: 'Naturalny dąb',
  ODZYSK: 'Drewno z odzysku',
  STAL_CZARNA: 'Stal czarna',
  DREWNO: 'Drewno',
  DO_USTALENIA: 'Do ustalenia',
};

export function choiceLabel(code: string): string {
  return CHOICE_LABELS[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function numberStep(option: PublicOption): number {
  const min = Number(option.minValue ?? 0);
  const max = Number(option.maxValue ?? 100);
  return max - min > 150 ? 10 : 5;
}

export function initialValues(product: PublicProduct): Record<string, string | number> {
  const values: Record<string, string | number> = {};
  for (const option of product.options) {
    if (option.dataType === 'NUMBER') {
      const min = Number(option.minValue ?? 0);
      const max = Number(option.maxValue ?? min + 100);
      const step = numberStep(option);
      values[option.code] = Math.round((min + (max - min) * 0.45) / step) * step;
    } else if (option.dataType === 'ENUM' && option.choices?.length) {
      values[option.code] = option.choices[0]!;
    }
  }
  return values;
}
