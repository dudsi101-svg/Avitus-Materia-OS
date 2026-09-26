import { randomUUID } from 'node:crypto';
import {
  createDatabase,
  organizationUsers,
  organizations,
  permissions,
  productFamilies,
  productOptionDefinitions,
  products,
  rolePermissions,
  roles,
  users,
} from './index';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';
const DEV_ORG_ID = '22222222-2222-4222-8222-222222222222';
const DEV_ROLE_ID = '33333333-3333-4333-8333-333333333333';

const permissionSeeds = [
  ['44444444-4444-4444-8444-444444444444', 'crm.lead.read', 'Read leads'],
  ['55555555-5555-4555-8555-555555555555', 'crm.lead.write', 'Create leads'],
  ['44444444-4444-4444-8444-444444444445', 'crm.opportunity.read', 'Read opportunities'],
  ['55555555-5555-4555-8555-555555555556', 'crm.opportunity.write', 'Create opportunities'],
  ['44444444-4444-4444-8444-444444444446', 'catalog.product.read', 'Read product catalog'],
  ['44444444-4444-4444-8444-444444444447', 'configurator.configuration.read', 'Read configurations'],
  ['55555555-5555-4555-8555-555555555557', 'configurator.configuration.write', 'Create and revise configurations'],
  ['44444444-4444-4444-8444-444444444448', 'pricing.calculation.read', 'Read price calculations'],
  ['55555555-5555-4555-8555-555555555558', 'pricing.calculation.create', 'Create price calculations'],
  ['44444444-4444-4444-8444-444444444449', 'quote.read', 'Read quotes'],
  ['55555555-5555-4555-8555-555555555559', 'quote.create', 'Create and revise draft quotes'],
] as const;

const DEV_FAMILY_ID = '66666666-6666-4666-8666-666666666666';
const DEV_PRODUCT_ID = '77777777-7777-4777-8777-777777777777';
const optionIds = [
  '80000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000002',
  '80000000-0000-4000-8000-000000000003',
  '80000000-0000-4000-8000-000000000004',
  '80000000-0000-4000-8000-000000000005',
  '80000000-0000-4000-8000-000000000006',
] as const;

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seed cannot run in production.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const { db, pool } = createDatabase(process.env.DATABASE_URL);
  try {
    await db.insert(organizations).values({ id: DEV_ORG_ID, name: 'Avitus Materia', slug: 'avitus-materia' }).onConflictDoNothing();
    await db.insert(users).values({ id: DEV_USER_ID, authProviderId: 'dev:owner', email: 'owner@local.invalid' }).onConflictDoNothing();
    await db.insert(roles).values({ id: DEV_ROLE_ID, organizationId: DEV_ORG_ID, code: 'OWNER', name: 'Owner' }).onConflictDoNothing();

    await db.insert(permissions).values(permissionSeeds.map(([id, code, description]) => ({ id, code, description }))).onConflictDoNothing();
    await db.insert(rolePermissions).values(permissionSeeds.map(([permissionId]) => ({ roleId: DEV_ROLE_ID, permissionId }))).onConflictDoNothing();
    await db.insert(organizationUsers).values({
      id: randomUUID(),
      organizationId: DEV_ORG_ID,
      userId: DEV_USER_ID,
      roleId: DEV_ROLE_ID,
    }).onConflictDoNothing();

    await db.insert(productFamilies).values({
      id: DEV_FAMILY_ID,
      organizationId: DEV_ORG_ID,
      name: 'Tables',
      slug: 'tables',
    }).onConflictDoNothing();
    await db.insert(products).values({
      id: DEV_PRODUCT_ID,
      organizationId: DEV_ORG_ID,
      productFamilyId: DEV_FAMILY_ID,
      sku: 'TABLE-CUSTOM-001',
      name: 'Custom Table',
      slug: 'custom-table',
      description: 'Development catalog seed for the configurable product flow.',
      productType: 'CONFIGURABLE',
      defaultCurrency: 'PLN',
    }).onConflictDoNothing();
    await db.insert(productOptionDefinitions).values([
      { id: optionIds[0], organizationId: DEV_ORG_ID, productId: DEV_PRODUCT_ID, code: 'length_mm', name: 'Length', dataType: 'NUMBER', required: true, minValue: '1200', maxValue: '4000', unit: 'mm', displayOrder: 10 },
      { id: optionIds[1], organizationId: DEV_ORG_ID, productId: DEV_PRODUCT_ID, code: 'width_mm', name: 'Width', dataType: 'NUMBER', required: true, minValue: '600', maxValue: '1400', unit: 'mm', displayOrder: 20 },
      { id: optionIds[2], organizationId: DEV_ORG_ID, productId: DEV_PRODUCT_ID, code: 'thickness_mm', name: 'Thickness', dataType: 'NUMBER', required: true, minValue: '30', maxValue: '100', unit: 'mm', displayOrder: 30 },
      { id: optionIds[3], organizationId: DEV_ORG_ID, productId: DEV_PRODUCT_ID, code: 'wood_type', name: 'Wood type', dataType: 'ENUM', required: true, choices: ['OAK', 'OLD_OAK', 'ASH'], displayOrder: 40 },
      { id: optionIds[4], organizationId: DEV_ORG_ID, productId: DEV_PRODUCT_ID, code: 'edge_type', name: 'Edge type', dataType: 'ENUM', required: true, choices: ['STRAIGHT', 'NATURAL'], displayOrder: 50 },
      { id: optionIds[5], organizationId: DEV_ORG_ID, productId: DEV_PRODUCT_ID, code: 'finish', name: 'Finish', dataType: 'ENUM', required: true, choices: ['OIL_NATURAL', 'OIL_SMOKED', 'RAW'], displayOrder: 60 },
    ]).onConflictDoNothing();

    console.log('Development organization/user/permissions/catalog seeded.');
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
