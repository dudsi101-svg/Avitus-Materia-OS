import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, organizations } from '@avitus/database';
import { inArray } from 'drizzle-orm';
import { createLead, createLeadSchema, PostgresLeadRepository } from './index';

const connectionString = process.env.DATABASE_URL;
const suite = connectionString ? describe : describe.skip;

suite('PostgresLeadRepository tenant isolation', () => {
  const ids = [randomUUID(), randomUUID()] as const;
  const connection = connectionString ? createDatabase(connectionString) : null;

  beforeAll(async () => {
    if (!connection) return;
    await connection.db.insert(organizations).values([
      { id: ids[0], name: 'Org A Test', slug: `org-a-${ids[0]}` },
      { id: ids[1], name: 'Org B Test', slug: `org-b-${ids[1]}` },
    ]);
  });

  afterAll(async () => {
    if (!connection) return;
    await connection.db.delete(organizations).where(inArray(organizations.id, [...ids]));
    await connection.pool.end();
  });

  it('never returns another organization lead', async () => {
    if (!connection) return;
    const repository = new PostgresLeadRepository(connection.db);
    const leadA = createLead(ids[0], createLeadSchema.parse({ title: 'A' }));
    const leadB = createLead(ids[1], createLeadSchema.parse({ title: 'B' }));
    await repository.insert(leadA);
    await repository.insert(leadB);

    expect((await repository.listByOrganization(ids[0])).map((lead) => lead.id)).toEqual([leadA.id]);
    expect(await repository.findById(ids[0], leadB.id)).toBeNull();
  });
});
