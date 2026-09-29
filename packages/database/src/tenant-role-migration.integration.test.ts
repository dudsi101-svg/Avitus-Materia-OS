import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const suite = process.env.DATABASE_URL ? describe : describe.skip;
suite('tenant role migration safety', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  afterAll(async () => { await pool.end(); });
  it('rolls back constraint/index creation and retains invalid legacy data', async () => {
    const client = await pool.connect();
    try {
      // Session-local legacy tables shadow public tables; no shared schema changes.
      await client.query('CREATE TEMP TABLE roles(id uuid PRIMARY KEY, organization_id uuid)');
      await client.query('CREATE TEMP TABLE organization_users(id uuid PRIMARY KEY, role_id uuid NOT NULL, organization_id uuid NOT NULL)');
      const role = randomUUID();
      await client.query('INSERT INTO roles VALUES($1,$2)', [role, randomUUID()]);
      await client.query('INSERT INTO organization_users VALUES($1,$2,$3)', [randomUUID(), role, randomUUID()]);
      const sql = await readFile(path.resolve(__dirname, '../migrations/0011_tenant_role_integrity.sql'), 'utf8');
      await client.query('BEGIN');
      await expect(client.query(sql)).rejects.toMatchObject({ code: '23503', constraint: 'organization_users_role_tenant_fk' });
      await client.query('ROLLBACK');
      expect((await client.query('SELECT count(*)::int AS count FROM pg_temp.organization_users')).rows[0].count).toBe(1);
      expect((await client.query("SELECT to_regclass('pg_temp.roles_id_org_uidx') AS index")).rows[0].index).toBeNull();
      expect((await client.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid='pg_temp.organization_users'::regclass AND conname='organization_users_role_tenant_fk'")).rows[0].count).toBe(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release(true);
    }
  });
});
