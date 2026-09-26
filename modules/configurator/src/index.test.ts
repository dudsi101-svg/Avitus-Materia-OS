import { describe, expect, it } from 'vitest';
import { assessConfiguration } from './index';
import type { Product } from '@avitus/catalog';

const product: Product = {
  id: '77777777-7777-4777-8777-777777777777',
  organizationId: '22222222-2222-4222-8222-222222222222',
  productFamilyId: '66666666-6666-4666-8666-666666666666',
  sku: 'TEST',
  name: 'Test',
  slug: 'test',
  productType: 'CONFIGURABLE',
  active: true,
  defaultCurrency: 'PLN',
  options: [
    { id: '1', code: 'length_mm', name: 'Length', dataType: 'NUMBER', required: true, minValue: '1200', maxValue: '4000', unit: 'mm', displayOrder: 10 },
    { id: '2', code: 'finish', name: 'Finish', dataType: 'ENUM', required: true, choices: ['RAW', 'OIL'], displayOrder: 20 },
  ],
};

describe('configuration assessment', () => {
  it('reports missing required options', () => {
    expect(assessConfiguration(product, { length_mm: 2000 })).toEqual({
      status: 'INCOMPLETE',
      readinessIssues: ['REQUIRED:finish'],
    });
  });

  it('marks a complete valid configuration ready for pricing', () => {
    expect(assessConfiguration(product, { length_mm: 2000, finish: 'OIL' })).toEqual({
      status: 'READY_FOR_PRICING',
      readinessIssues: [],
    });
  });

  it('rejects out-of-range option values', () => {
    expect(() => assessConfiguration(product, { length_mm: 500, finish: 'RAW' })).toThrow('below its minimum');
  });

  it('rejects unknown options', () => {
    expect(() => assessConfiguration(product, { length_mm: 2000, finish: 'RAW', secret: true })).toThrow('Unknown product option');
  });
});
