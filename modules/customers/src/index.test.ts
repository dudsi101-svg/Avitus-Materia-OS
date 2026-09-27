import { describe, expect, it } from 'vitest';
import { normalizeContactValue } from './index';

describe('customer contact normalization', () => {
  it('normalizes email for identity lookup', () => {
    expect(normalizeContactValue('EMAIL', '  Jan.Kowalski@Example.COM ')).toBe('jan.kowalski@example.com');
  });

  it('normalizes international phone and WhatsApp values', () => {
    expect(normalizeContactValue('PHONE', '+48 501-234-567')).toBe('+48501234567');
    expect(normalizeContactValue('WHATSAPP', '0048 501 234 567')).toBe('+48501234567');
  });
});
