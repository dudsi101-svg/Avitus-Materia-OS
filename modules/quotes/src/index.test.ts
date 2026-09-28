import { describe, expect, it } from 'vitest';
import { calculateCommercialTerms } from './index';

describe('quote commercial terms', () => {
  it('calculates discount, VAT and actual post-discount margin with exact money units', () => {
    expect(calculateCommercialTerms('12500.0000', '7500.0000', '500.0000', 2300)).toEqual({
      discountAmount: '500.0000',
      netAmount: '12000.0000',
      taxAmount: '2760.0000',
      total: '14760.0000',
      marginAmount: '4500.0000',
      marginBps: 3750,
    });
  });

  it('rounds tax to four decimal money precision', () => {
    expect(calculateCommercialTerms('100.0001', '20.0000', '0.0000', 2300)).toMatchObject({
      taxAmount: '23.0000',
      total: '123.0001',
    });
  });

  it('rejects a discount larger than subtotal', () => {
    expect(() => calculateCommercialTerms('100.0000', '20.0000', '100.0001', 2300)).toThrow(
      'Discount cannot exceed quote subtotal.',
    );
  });

  it('rejects a selling price below estimated cost', () => {
    expect(() => calculateCommercialTerms('100.0000', '90.0000', '20.0000', 2300)).toThrow(
      'Discounted selling price cannot be below estimated cost.',
    );
  });
});
