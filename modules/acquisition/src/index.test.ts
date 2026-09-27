import type { Product, ProductRepository } from '@avitus/catalog';
import type { RequestContext } from '@avitus/shared';
import { describe, expect, it } from 'vitest';
import { CreatePublicConfigurationRequestService, type PublicConfigurationRequest } from './index';

const ORG = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

const product: Product = {
  id: PRODUCT_ID,
  organizationId: ORG,
  productFamilyId: '44444444-4444-4444-8444-444444444444',
  sku: 'AM-STOL-01',
  name: 'Stół / blat',
  slug: 'stol-blat',
  productType: 'CONFIGURABLE',
  active: true,
  basePrice: '999.0000',
  defaultCurrency: 'PLN',
  options: [
    {
      id: 'o1',
      code: 'width_cm',
      name: 'Szerokość',
      dataType: 'NUMBER',
      required: true,
      minValue: '80',
      maxValue: '320',
      unit: 'cm',
      displayOrder: 10,
    },
    {
      id: 'o2',
      code: 'material',
      name: 'Materiał',
      dataType: 'ENUM',
      required: true,
      choices: ['DAB', 'STARY_DAB'],
      displayOrder: 20,
    },
  ],
};

function setup(overrides: Partial<Product> = {}) {
  const inserted: {
    leads: unknown[];
    requests: PublicConfigurationRequest[];
    events: Array<{ payload: unknown }>;
    audit: Array<{ afterData?: unknown }>;
  } = {
    leads: [],
    requests: [],
    events: [],
    audit: [],
  };
  const products: ProductRepository = {
    listActive: async () => [{ ...product, ...overrides }],
    findActiveById: async (_org, id) => (id === PRODUCT_ID ? { ...product, ...overrides } : null),
  };
  const service = new CreatePublicConfigurationRequestService(
    { run: async (work) => work({ executor: {} }) },
    products,
    {
      insert: async (lead) => void inserted.leads.push(lead),
      listByOrganization: async () => [],
      findById: async () => null,
    },
    { insert: async (request) => void inserted.requests.push(request) },
    { append: async (event) => void inserted.events.push(event) },
    { append: async (entry) => void inserted.audit.push(entry) },
  );
  return { service, inserted };
}

const context: RequestContext = {
  correlationId: 'test',
  organizationId: ORG,
  actor: { type: 'INTEGRATION', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  permissions: new Set(['acquisition.public_configuration_request.create']),
};

const valid = {
  productId: PRODUCT_ID,
  values: { width_cm: 220, material: 'STARY_DAB' },
  name: 'Jan Testowy',
  email: 'Jan@Example.test',
  message: 'Stół do jadalni.',
};

describe('CreatePublicConfigurationRequestService', () => {
  it('stores a READY_FOR_PRICING snapshot with a Lead and keeps PII out of events and audit', async () => {
    const { service, inserted } = setup();
    const result = await service.execute(valid, context);

    expect(result.configurationStatus).toBe('READY_FOR_PRICING');
    expect(inserted.leads).toHaveLength(1);
    expect(inserted.requests[0]).toMatchObject({
      productSku: 'AM-STOL-01',
      email: 'jan@example.test',
      optionValues: valid.values,
    });
    const logged = JSON.stringify([inserted.events, inserted.audit]);
    expect(logged).not.toContain('jan@example.test');
    expect(logged).not.toContain('Jan Testowy');
    expect(logged).not.toContain('999');
  });

  it('marks missing required options as INCOMPLETE', async () => {
    const { service, inserted } = setup();
    const result = await service.execute({ ...valid, values: { width_cm: 220 } }, context);
    expect(result.configurationStatus).toBe('INCOMPLETE');
    expect(inserted.requests[0]?.readinessIssues).toEqual(['REQUIRED:material']);
  });

  it('rejects out-of-range values and unknown choices', async () => {
    const { service } = setup();
    await expect(
      service.execute({ ...valid, values: { width_cm: 900, material: 'DAB' } }, context),
    ).rejects.toMatchObject({
      code: expect.stringMatching(/^CONFIGURATION\./),
    });
    await expect(
      service.execute({ ...valid, values: { width_cm: 200, material: 'PLASTIK' } }, context),
    ).rejects.toMatchObject({
      code: 'CONFIGURATION.INVALID_ENUM_VALUE',
    });
  });

  it('rejects unknown and non-configurable products', async () => {
    await expect(
      setup().service.execute(
        { ...valid, productId: '55555555-5555-4555-8555-555555555555' },
        context,
      ),
    ).rejects.toMatchObject({
      code: 'CATALOG.PRODUCT_NOT_FOUND',
    });
    await expect(
      setup({ productType: 'STANDARD' }).service.execute(valid, context),
    ).rejects.toMatchObject({
      code: 'CATALOG.PRODUCT_NOT_FOUND',
    });
  });

  it('requires the public configuration permission and rejects the honeypot', async () => {
    const { service } = setup();
    await expect(
      service.execute(valid, { ...context, permissions: new Set() }),
    ).rejects.toMatchObject({ code: 'AUTH.FORBIDDEN' });
    await expect(service.execute({ ...valid, companyWebsite: 'spam' }, context)).rejects.toThrow();
  });
});
