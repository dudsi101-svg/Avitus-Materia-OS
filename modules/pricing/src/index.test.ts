import { describe, expect, it } from 'vitest';
import { calculatePrice, formatMoneyUnits, parseMoneyUnits, subtractMoney } from './index';

describe('exact pricing arithmetic', () => {
  it('calculates recommended price from cost and target margin without floating point', () => {
    const result = calculatePrice(
      [{ amount: '5000.0000' }, { amount: '2000.0000' }, { amount: '500.0000' }],
      4000,
    );
    expect(result).toEqual({ totalCost: '7500.0000', recommendedPrice: '12500.0000' });
  });

  it('rounds upward to the smallest 4-decimal monetary unit when division is not exact', () => {
    expect(calculatePrice([{ amount: '1.0000' }], 3333).recommendedPrice).toBe('1.4999');
  });

  it('round-trips 4-decimal money and subtracts exactly', () => {
    expect(formatMoneyUnits(parseMoneyUnits('1234.5678'))).toBe('1234.5678');
    expect(subtractMoney('12500.0000', '7500.0000')).toBe('5000.0000');
  });
});
