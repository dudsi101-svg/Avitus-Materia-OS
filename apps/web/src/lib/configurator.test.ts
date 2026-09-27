import { describe, expect, it } from 'vitest';
import { fromSearchParams, groupOptions, initialValues, toSearchParams, type PublicProduct } from './configurator';

const table: PublicProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  sku: 'AM-STOL-01',
  name: 'Stół / blat',
  slug: 'stol-blat',
  options: [
    {
      id: 'a',
      code: 'width_cm',
      name: 'Szerokość',
      dataType: 'NUMBER',
      required: true,
      minValue: '80',
      maxValue: '320',
      unit: 'cm',
      presentation: { group: 'Wymiary', step: 10 },
      displayOrder: 10,
    },
    {
      id: 'b',
      code: 'material',
      name: 'Materiał',
      dataType: 'ENUM',
      required: true,
      choices: ['STARY_DAB', 'DAB'],
      presentation: { group: 'Drewno', choices: { DAB: { label: 'Naturalny dąb' } } },
      displayOrder: 30,
    },
    { id: 'c', code: 'gift', name: 'Grawer', dataType: 'BOOLEAN', required: false, displayOrder: 40 },
  ],
};

describe('configurator share link', () => {
  it('round-trips a configuration through the URL', () => {
    const values = { width_cm: 250, material: 'DAB', gift: true };
    const restored = fromSearchParams([table], toSearchParams(table, values));
    expect(restored?.product.id).toBe(table.id);
    expect(restored?.values).toEqual(values);
  });

  it('ignores invalid values and snaps numbers to the catalog range and step', () => {
    const params = new URLSearchParams('projekt=stol-blat&width_cm=999&material=PLASTIK&gift=maybe&unknown=1');
    const restored = fromSearchParams([table], params);
    expect(restored?.values).toEqual({ ...initialValues(table), width_cm: 320 });
    expect(fromSearchParams([table], new URLSearchParams('projekt=nie-ma'))).toBeNull();
    expect(fromSearchParams([table], new URLSearchParams('projekt=stol-blat&width_cm=253'))?.values.width_cm).toBe(250);
  });

  it('groups options by catalog presentation in display order', () => {
    expect(groupOptions(table).map((group) => group.group)).toEqual(['Wymiary', 'Drewno', 'Opcje']);
  });
});
