import { eq } from 'drizzle-orm';
import { createDatabase, organizations } from './index';
import { ensureStarterCatalog } from './starter-catalog';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function bootstrap(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Production bootstrap must run with NODE_ENV=production.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  const organizationId = process.env.PUBLIC_INQUIRY_ORGANIZATION_ID;

  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  if (!organizationId || !UUID_PATTERN.test(organizationId)) {
    throw new Error('PUBLIC_INQUIRY_ORGANIZATION_ID must be a valid UUID.');
  }

  const { db, pool } = createDatabase(databaseUrl);
  try {
    await db
      .insert(organizations)
      .values({
        id: organizationId,
        name: 'Avitus Materia',
        slug: 'avitus-materia',
      })
      .onConflictDoNothing();

    const [organization] = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) throw new Error('Production organization bootstrap failed.');
    if (organization.name !== 'Avitus Materia' || organization.slug !== 'avitus-materia') {
      throw new Error('PUBLIC_INQUIRY_ORGANIZATION_ID already belongs to a different organization.');
    }

    console.log(`Production organization ready: ${organization.name} (${organization.id}).`);

    await ensureStarterCatalog(db, organization.id);
    console.log('Starter public catalog ready.');
  } finally {
    await pool.end();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
