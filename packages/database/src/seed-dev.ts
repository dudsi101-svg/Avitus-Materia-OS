import { randomUUID } from 'node:crypto';
import { createDatabase, organizationUsers, organizations, permissions, rolePermissions, roles, users } from './index';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';
const DEV_ORG_ID = '22222222-2222-4222-8222-222222222222';
const DEV_ROLE_ID = '33333333-3333-4333-8333-333333333333';
const READ_PERMISSION_ID = '44444444-4444-4444-8444-444444444444';
const WRITE_PERMISSION_ID = '55555555-5555-4555-8555-555555555555';

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seed cannot run in production.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const { db, pool } = createDatabase(process.env.DATABASE_URL);
  try {
    await db.insert(organizations).values({ id: DEV_ORG_ID, name: 'Avitus Materia', slug: 'avitus-materia' }).onConflictDoNothing();
    await db.insert(users).values({ id: DEV_USER_ID, authProviderId: 'dev:owner', email: 'owner@local.invalid' }).onConflictDoNothing();
    await db.insert(roles).values({ id: DEV_ROLE_ID, organizationId: DEV_ORG_ID, code: 'OWNER', name: 'Owner' }).onConflictDoNothing();
    await db.insert(permissions).values([
      { id: READ_PERMISSION_ID, code: 'crm.lead.read', description: 'Read leads' },
      { id: WRITE_PERMISSION_ID, code: 'crm.lead.write', description: 'Create leads' },
    ]).onConflictDoNothing();
    await db.insert(rolePermissions).values([
      { roleId: DEV_ROLE_ID, permissionId: READ_PERMISSION_ID },
      { roleId: DEV_ROLE_ID, permissionId: WRITE_PERMISSION_ID },
    ]).onConflictDoNothing();
    await db.insert(organizationUsers).values({
      id: randomUUID(),
      organizationId: DEV_ORG_ID,
      userId: DEV_USER_ID,
      roleId: DEV_ROLE_ID,
    }).onConflictDoNothing();
    console.log('Development organization/user seeded.');
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
